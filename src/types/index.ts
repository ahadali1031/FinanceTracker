import { Timestamp } from "firebase/firestore";

export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: Timestamp;
  createdAt: Timestamp;
  isBusiness?: boolean;
  isTransfer?: boolean; // true = transfer to savings/investment, deducts from checking
  transferTo?: string; // account ID this transfer went to
}

export interface Income {
  id: string;
  amount: number;
  source: string;
  description: string;
  date: Timestamp;
  isRecurring: boolean;
  createdAt: Timestamp;
  isBusiness?: boolean;
}

export type SubscriptionFrequency = "monthly" | "yearly";

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: SubscriptionFrequency;
  category: string;
  startDate: Timestamp;
  endDate: Timestamp | null;
  isActive: boolean;
  nextBillingDate: Timestamp;
  createdAt: Timestamp;
  isBusiness?: boolean;
}

export type InvestmentAccountType =
  | "brokerage"
  | "401k"
  | "roth_ira"
  | "traditional_ira"
  | "hsa";

export interface InvestmentAccount {
  id: string;
  name: string;
  accountType: InvestmentAccountType;
  institution: string;
  employerMatch?: number; // 1:1 = 100, percentage employer matches
  employerMatchCap?: number; // dollar cap on employer match per year (e.g. 50% of IRS limit = 11750)
  salary?: number; // annual salary for match calculations
}

export interface Holding {
  id: string;
  ticker: string;
  shares: number;
  costBasis: number;
  isRecurring?: boolean; // auto-invest on a schedule
  recurringDay?: number; // day of month (1-28)
  recurringAmount?: number; // $ amount per occurrence
}

export type InvestmentTransactionType = "buy" | "sell" | "dividend" | "employer_match";

export interface InvestmentTransaction {
  id: string;
  ticker: string;
  type: InvestmentTransactionType;
  shares: number;
  pricePerShare: number;
  totalAmount: number;
  date: Timestamp;
  isReinvested?: boolean; // DRIP — dividend was reinvested into more shares
  isTransfer?: boolean; // true = funded from checking account
}

export interface InvestmentSnapshot {
  id: string;
  totalValue: number;
  snapshotDate: Timestamp;
}

export interface SavingsAccount {
  id: string;
  name: string;
  institution: string;
  isEmergencyFund: boolean;
}

export interface SavingsSnapshot {
  id: string;
  balance: number;
  snapshotDate: Timestamp;
  isTransfer?: boolean; // true = deposit from checking
  transferAmount?: number; // how much was transferred (snapshot balance may differ due to interest etc)
}

export interface BudgetTarget {
  id: string;
  category: string;
  monthlyLimit: number;
}
