import { create } from "zustand";
import {
  collection,
  setDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type { BudgetTarget } from "@/src/types";

interface BudgetState {
  targets: BudgetTarget[];
  loading: boolean;
  error: string | null;
  subscribeToTargets: (uid: string) => () => void;
  setTarget: (
    uid: string,
    data: Omit<BudgetTarget, "id">
  ) => Promise<void>;
  deleteTarget: (uid: string, id: string) => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set) => ({
  targets: [],
  loading: true,
  error: null,

  subscribeToTargets: (uid: string) => {
    set({ loading: true, error: null });
    const q = query(
      collection(db, "users", uid, "budgetTargets"),
      orderBy("category", "asc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const targets = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as BudgetTarget[];
        set({ targets, loading: false, error: null });
      },
      (error) => {
        console.error("Budget subscription error:", error);
        set({ loading: false, error: error.message });
      }
    );
    return unsubscribe;
  },

  setTarget: async (uid, data) => {
    // Use category as the doc ID so setting the same category overwrites
    const ref = doc(db, "users", uid, "budgetTargets", data.category);
    await setDoc(ref, data, { merge: true });
  },

  deleteTarget: async (uid, id) => {
    const ref = doc(db, "users", uid, "budgetTargets", id);
    await deleteDoc(ref);
  },
}));
