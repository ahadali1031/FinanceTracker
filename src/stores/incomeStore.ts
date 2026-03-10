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
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type { Income } from "@/src/types";

interface IncomeState {
  incomes: Income[];
  loading: boolean;
  subscribeToIncome: (uid: string) => () => void;
  addIncome: (
    uid: string,
    data: Omit<Income, "id" | "createdAt">
  ) => Promise<void>;
  updateIncome: (
    uid: string,
    id: string,
    data: Partial<Income>
  ) => Promise<void>;
  deleteIncome: (uid: string, id: string) => Promise<void>;
}

export const useIncomeStore = create<IncomeState>((set) => ({
  incomes: [],
  loading: true,

  subscribeToIncome: (uid: string) => {
    set({ loading: true });
    const q = query(
      collection(db, "users", uid, "incomes"),
      orderBy("date", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const incomes = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Income[];
      set({ incomes, loading: false });
    });
    return unsubscribe;
  },

  addIncome: async (uid, data) => {
    await addDoc(collection(db, "users", uid, "incomes"), {
      ...data,
      createdAt: serverTimestamp(),
    });
  },

  updateIncome: async (uid, id, data) => {
    const ref = doc(db, "users", uid, "incomes", id);
    await updateDoc(ref, data);
  },

  deleteIncome: async (uid, id) => {
    const ref = doc(db, "users", uid, "incomes", id);
    await deleteDoc(ref);
  },
}));
