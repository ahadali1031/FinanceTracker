import { create } from "zustand";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type { Expense } from "@/src/types";

interface ExpenseState {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  subscribeToExpenses: (uid: string) => () => void;
  addExpense: (
    uid: string,
    data: Omit<Expense, "id" | "createdAt">
  ) => Promise<void>;
  updateExpense: (
    uid: string,
    id: string,
    data: Partial<Expense>
  ) => Promise<void>;
  deleteExpense: (uid: string, id: string) => Promise<void>;
  getMonthlyTotals: () => Map<string, number>;
  getCategoryTotals: (month?: Date) => Map<string, number>;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  loading: true,
  error: null,

  subscribeToExpenses: (uid: string) => {
    set({ loading: true, error: null });
    const q = query(
      collection(db, "users", uid, "expenses"),
      orderBy("date", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const expenses = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Expense[];
        set({ expenses, loading: false, error: null });
      },
      (error) => {
        console.error("Expense subscription error:", error);
        set({ loading: false, error: error.message });
      }
    );
    return unsubscribe;
  },

  addExpense: async (uid, data) => {
    await addDoc(collection(db, "users", uid, "expenses"), {
      ...data,
      createdAt: serverTimestamp(),
    });
  },

  updateExpense: async (uid, id, data) => {
    const ref = doc(db, "users", uid, "expenses", id);
    await updateDoc(ref, data);
  },

  deleteExpense: async (uid, id) => {
    const ref = doc(db, "users", uid, "expenses", id);
    await deleteDoc(ref);
  },

  getMonthlyTotals: () => {
    const totals = new Map<string, number>();
    for (const expense of get().expenses) {
      const d = expense.date?.toDate?.();
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      totals.set(key, (totals.get(key) ?? 0) + expense.amount);
    }
    return totals;
  },

  getCategoryTotals: (month?: Date) => {
    const totals = new Map<string, number>();
    for (const expense of get().expenses) {
      if (month) {
        const d = expense.date?.toDate?.();
        if (!d) continue;
        if (
          d.getFullYear() !== month.getFullYear() ||
          d.getMonth() !== month.getMonth()
        ) {
          continue;
        }
      }
      totals.set(
        expense.category,
        (totals.get(expense.category) ?? 0) + expense.amount
      );
    }
    return totals;
  },
}));
