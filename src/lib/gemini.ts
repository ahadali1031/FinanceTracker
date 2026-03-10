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

// --- Insights cache ---
let cachedInsights: string[] | null = null;
let insightsCacheKey = "";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

// --- Types ---

export interface FinancialSummary {
  monthlyExpenses: number;
  monthlyIncome: number;
  netWorth: number;
  checkingBalance: number;
  savingsTotal: number;
  investmentTotal: number;
  monthlySubscriptions: number;
  budgetSpent: number;
  budgetTotal: number;
  categoryBreakdown: Record<string, number>; // category -> amount this month
  prevMonthExpenses: number;
  prevMonthIncome: number;
  prevCategoryBreakdown: Record<string, number>;
}

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

/**
 * Generate 2-3 smart financial insights based on aggregated data.
 * Results are cached per unique data snapshot to avoid redundant calls.
 */
export async function generateInsights(
  summary: FinancialSummary
): Promise<string[] | null> {
  // Build a cache key from the summary to avoid re-calling with same data
  const key = JSON.stringify(summary);
  if (key === insightsCacheKey && cachedInsights) return cachedInsights;

  if (!checkRateLimit()) {
    console.warn("Gemini rate limit reached, skipping insights");
    return cachedInsights;
  }

  const prompt = `You are a personal finance assistant. Analyze this monthly financial summary and give exactly 2-3 short, actionable insights. Each insight should be 1 sentence max.

Focus on: spending trends vs last month, budget warnings, notable category changes, savings rate, or subscription costs relative to income. Be specific with numbers and percentages. Don't state obvious facts — only surface things worth knowing.

Current month:
- Income: $${summary.monthlyIncome.toFixed(0)}
- Expenses: $${summary.monthlyExpenses.toFixed(0)}
- Category breakdown: ${Object.entries(summary.categoryBreakdown).map(([k, v]) => `${k}: $${v.toFixed(0)}`).join(", ") || "none"}
- Budget: $${summary.budgetSpent.toFixed(0)} spent of $${summary.budgetTotal.toFixed(0)} limit
- Subscriptions: $${summary.monthlySubscriptions.toFixed(0)}/mo

Previous month:
- Income: $${summary.prevMonthIncome.toFixed(0)}
- Expenses: $${summary.prevMonthExpenses.toFixed(0)}
- Category breakdown: ${Object.entries(summary.prevCategoryBreakdown).map(([k, v]) => `${k}: $${v.toFixed(0)}`).join(", ") || "none"}

Overall:
- Net worth: $${summary.netWorth.toFixed(0)}
- Checking: $${summary.checkingBalance.toFixed(0)}
- Savings: $${summary.savingsTotal.toFixed(0)}
- Investments: $${summary.investmentTotal.toFixed(0)}

Respond with ONLY a JSON array of strings, no markdown:
["insight 1", "insight 2", "insight 3"]`;

  try {
    const result = await getModel().generateContent(prompt);
    const text = result.response.text().trim();
    const insights = JSON.parse(text);
    if (Array.isArray(insights) && insights.length > 0) {
      cachedInsights = insights;
      insightsCacheKey = key;
      return insights;
    }
    return null;
  } catch (error) {
    console.error("Gemini insights error:", error);
    return null;
  }
}

/**
 * Answer a financial question using the user's data as context.
 * Supports multi-turn conversation via history parameter.
 */
export async function askFinancialQuestion(
  question: string,
  dataContext: string,
  history: ChatMessage[]
): Promise<string | null> {
  if (!question.trim()) return null;
  if (!checkRateLimit()) {
    return "I'm being rate-limited right now. Please wait a moment and try again.";
  }

  const historyText = history
    .slice(-6) // keep last 3 exchanges for context
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
    .join("\n");

  const prompt = `You are a helpful personal finance assistant. Answer the user's question using their financial data below. Be concise (2-4 sentences max). Use specific numbers from the data. If the data doesn't contain enough info to answer, say so.

${dataContext}

${historyText ? `Conversation so far:\n${historyText}\n` : ""}User: ${question}

Answer naturally in plain text (no markdown, no bullet points unless listing items).`;

  try {
    const result = await getModel().generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Gemini chat error:", error);
    return "Sorry, I couldn't process that question. Please try again.";
  }
}
