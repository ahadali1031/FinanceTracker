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
  employerMatch?: number; // percentage (e.g. 50 = 50% match), only for 401k
  employerMatchLimit?: number; // max % of salary matched (e.g. 6 = up to 6% of salary)
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

export type InvestmentTransactionType = "buy" | "sell" | "dividend";

export interface InvestmentTransaction {
  id: string;
  ticker: string;
  type: InvestmentTransactionType;
  shares: number;
  pricePerShare: number;
  totalAmount: number;
  date: Timestamp;
  isReinvested?: boolean; // DRIP — dividend was reinvested into more shares
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
}

export interface BudgetTarget {
  id: string;
  category: string;
  monthlyLimit: number;
}
