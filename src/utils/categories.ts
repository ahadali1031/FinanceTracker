export interface Category {
  id: string;
  name: string;
  icon: string;
}

export const EXPENSE_CATEGORIES: readonly Category[] = [
  { id: "food", name: "Food", icon: "restaurant" },
  { id: "transport", name: "Transport", icon: "car" },
  { id: "entertainment", name: "Entertainment", icon: "film" },
  { id: "shopping", name: "Shopping", icon: "cart" },
  { id: "bills", name: "Bills", icon: "receipt" },
  { id: "health", name: "Health", icon: "medical" },
  { id: "education", name: "Education", icon: "school" },
  { id: "travel", name: "Travel", icon: "airplane" },
  { id: "other", name: "Other", icon: "ellipsis-horizontal" },
] as const;

export const SUBSCRIPTION_CATEGORIES: readonly Category[] = [
  { id: "streaming", name: "Streaming", icon: "tv" },
  { id: "music", name: "Music", icon: "musical-notes" },
  { id: "software", name: "Software", icon: "laptop" },
  { id: "gaming", name: "Gaming", icon: "game-controller" },
  { id: "news", name: "News", icon: "newspaper" },
  { id: "fitness", name: "Fitness", icon: "fitness" },
  { id: "cloud_storage", name: "Cloud Storage", icon: "cloud" },
  { id: "other", name: "Other", icon: "ellipsis-horizontal" },
] as const;

export const INVESTMENT_ACCOUNT_TYPES = [
  { id: "brokerage", name: "Brokerage" },
  { id: "401k", name: "401(k)" },
  { id: "roth_ira", name: "Roth IRA" },
  { id: "traditional_ira", name: "Traditional IRA" },
  { id: "hsa", name: "HSA" },
] as const;
