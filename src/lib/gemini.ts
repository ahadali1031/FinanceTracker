import { getGenerativeModel, getAI, GoogleAIBackend } from "firebase/ai";
import app from "./firebase";
import { EXPENSE_CATEGORIES } from "@/src/utils/categories";

let _model: ReturnType<typeof getGenerativeModel> | null = null;

function getModel() {
  if (!_model) {
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    _model = getGenerativeModel(ai, { model: "gemini-2.5-flash" });
  }
  return _model;
}

const CATEGORY_IDS = EXPENSE_CATEGORIES.map((c) => c.id).join(", ");

// --- Rate limiting & caching ---

const categoryCache = new Map<string, string>(); // description -> category id

/** Simple in-memory rate limiter: max N calls per minute */
let callTimestamps: number[] = [];
const MAX_CALLS_PER_MINUTE = 8;

function checkRateLimit(): boolean {
  const now = Date.now();
  callTimestamps = callTimestamps.filter((t) => now - t < 60_000);
  if (callTimestamps.length >= MAX_CALLS_PER_MINUTE) return false;
  callTimestamps.push(now);
  return true;
}

// --- Types ---

export interface ParsedExpense {
  amount: number;
  category: string;
  description: string;
  isBusiness: boolean;
  date: string | null; // ISO date string if mentioned, null for today
}

/**
 * Parse a natural language string into structured expense data.
 * Examples: "$14.50 chipotle lunch", "uber to airport 32", "50 groceries costco"
 */
export async function parseExpenseFromText(
  input: string
): Promise<ParsedExpense | null> {
  const trimmed = input.trim();
  if (trimmed.length < 3) return null;
  if (!checkRateLimit()) {
    console.warn("Gemini rate limit reached, try again in a moment");
    return null;
  }

  const today = new Date().toISOString().split("T")[0];

  const prompt = `Parse this expense into JSON. Today is ${today}.

Input: "${trimmed}"

Rules:
- Extract the dollar amount (number without $)
- Pick the best category from: ${CATEGORY_IDS}
- Create a short description (the vendor/item, not the category name)
- Set isBusiness to true only if explicitly mentioned (e.g. "business lunch", "work expense")
- If a date is mentioned (e.g. "yesterday", "last friday", "march 5"), return it as ISO date (YYYY-MM-DD). Otherwise return null.
- If no amount is found, return null

Respond with ONLY valid JSON, no markdown:
{"amount": number, "category": string, "description": string, "isBusiness": boolean, "date": string|null}

If the input cannot be parsed as an expense, respond with: null`;

  try {
    const result = await getModel().generateContent(prompt);
    const text = result.response.text().trim();
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed.amount !== "number" || parsed.amount <= 0) {
      return null;
    }
    // Validate category
    const validIds = EXPENSE_CATEGORIES.map((c) => c.id);
    if (!validIds.includes(parsed.category)) {
      parsed.category = "other";
    }
    // Cache the description -> category mapping for future use
    if (parsed.description) {
      categoryCache.set(parsed.description.toLowerCase(), parsed.category);
    }
    return parsed;
  } catch (error) {
    console.error("Gemini parse error:", error);
    return null;
  }
}

/**
 * Suggest a category for a given expense description.
 * Returns cached result if available, skips API call for short inputs.
 */
export async function suggestCategory(
  description: string
): Promise<string | null> {
  const trimmed = description.trim().toLowerCase();
  if (trimmed.length < 3) return null;

  // Check cache first
  const cached = categoryCache.get(trimmed);
  if (cached) return cached;

  if (!checkRateLimit()) {
    console.warn("Gemini rate limit reached, skipping category suggestion");
    return null;
  }

  const prompt = `Given this expense description, pick the single best category ID.

Description: "${trimmed}"
Categories: ${CATEGORY_IDS}

Respond with ONLY the category ID, nothing else.`;

  try {
    const result = await getModel().generateContent(prompt);
    const text = result.response.text().trim().toLowerCase();
    const validIds = EXPENSE_CATEGORIES.map((c) => c.id);
    if (validIds.includes(text)) {
      categoryCache.set(trimmed, text);
      return text;
    }
    return null;
  } catch (error) {
    console.error("Gemini category error:", error);
    return null;
  }
}
