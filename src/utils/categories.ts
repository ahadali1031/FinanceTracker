export interface Category {
  id: string;
  name: string;
  icon: string;
}

export const EXPENSE_CATEGORIES: readonly Category[] = [
  { id: "food", name: "Food", icon: "\uD83C\uDF54" },
  { id: "transport", name: "Transport", icon: "\uD83D\uDE97" },
  { id: "entertainment", name: "Entertainment", icon: "\uD83C\uDFAC" },
  { id: "shopping", name: "Shopping", icon: "\uD83D\uDECD\uFE0F" },
  { id: "bills", name: "Bills", icon: "\uD83D\uDCCB" },
  { id: "health", name: "Health", icon: "\uD83C\uDFE5" },
  { id: "education", name: "Education", icon: "\uD83D\uDCDA" },
  { id: "travel", name: "Travel", icon: "\u2708\uFE0F" },
  { id: "other", name: "Other", icon: "\uD83D\uDCE6" },
] as const;

export const SUBSCRIPTION_CATEGORIES: readonly Category[] = [
  { id: "streaming", name: "Streaming", icon: "\uD83D\uDCFA" },
  { id: "music", name: "Music", icon: "\uD83C\uDFB5" },
  { id: "software", name: "Software", icon: "\uD83D\uDCBB" },
  { id: "gaming", name: "Gaming", icon: "\uD83C\uDFAE" },
  { id: "news", name: "News", icon: "\uD83D\uDCF0" },
  { id: "fitness", name: "Fitness", icon: "\uD83C\uDFCB\uFE0F" },
  { id: "cloud_storage", name: "Cloud Storage", icon: "\u2601\uFE0F" },
  { id: "other", name: "Other", icon: "\uD83D\uDCE6" },
] as const;

export const INVESTMENT_ACCOUNT_TYPES = [
  { id: "brokerage", name: "Brokerage" },
  { id: "401k", name: "401(k)" },
  { id: "roth_ira", name: "Roth IRA" },
  { id: "traditional_ira", name: "Traditional IRA" },
  { id: "hsa", name: "HSA" },
] as const;
