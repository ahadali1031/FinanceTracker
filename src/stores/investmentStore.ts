import { create } from "zustand";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type {
  InvestmentAccount,
  Holding,
  InvestmentTransaction,
} from "@/src/types";

interface InvestmentState {
  accounts: InvestmentAccount[];
  holdings: Map<string, Holding[]>;
  loading: boolean;
  subscribeToAccounts: (uid: string) => () => void;
  addAccount: (
    uid: string,
    data: Omit<InvestmentAccount, "id">
  ) => Promise<void>;
  deleteAccount: (uid: string, id: string) => Promise<void>;
  addHolding: (
    uid: string,
    accountId: string,
    data: Omit<Holding, "id">
  ) => Promise<void>;
  removeHolding: (
    uid: string,
    accountId: string,
    holdingId: string
  ) => Promise<void>;
  addTransaction: (
    uid: string,
    accountId: string,
    data: Omit<InvestmentTransaction, "id">
  ) => Promise<void>;
}

export const useInvestmentStore = create<InvestmentState>((set, get) => ({
  accounts: [],
  holdings: new Map(),
  loading: true,

  subscribeToAccounts: (uid: string) => {
    set({ loading: true });
    const q = query(
      collection(db, "users", uid, "investmentAccounts"),
      orderBy("name", "asc")
    );

    const holdingsUnsubscribes: (() => void)[] = [];

    const accountsUnsubscribe = onSnapshot(q, (snapshot) => {
      const accounts = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as InvestmentAccount[];

      // Clean up previous holdings listeners
      holdingsUnsubscribes.forEach((unsub) => unsub());
      holdingsUnsubscribes.length = 0;

      const newHoldings = new Map<string, Holding[]>();

      for (const account of accounts) {
        const holdingsQuery = collection(
          db,
          "users",
          uid,
          "investmentAccounts",
          account.id,
          "holdings"
        );
        const unsub = onSnapshot(holdingsQuery, (holdingsSnap) => {
          const h = holdingsSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Holding[];
          const current = new Map(get().holdings);
          current.set(account.id, h);
          set({ holdings: current });
        });
        holdingsUnsubscribes.push(unsub);
        newHoldings.set(account.id, []);
      }

      set({ accounts, holdings: newHoldings, loading: false });
    });

    return () => {
      accountsUnsubscribe();
      holdingsUnsubscribes.forEach((unsub) => unsub());
    };
  },

  addAccount: async (uid, data) => {
    await addDoc(collection(db, "users", uid, "investmentAccounts"), data);
  },

  deleteAccount: async (uid, id) => {
    const ref = doc(db, "users", uid, "investmentAccounts", id);
    await deleteDoc(ref);
  },

  addHolding: async (uid, accountId, data) => {
    await addDoc(
      collection(
        db,
        "users",
        uid,
        "investmentAccounts",
        accountId,
        "holdings"
      ),
      data
    );
  },

  removeHolding: async (uid, accountId, holdingId) => {
    const ref = doc(
      db,
      "users",
      uid,
      "investmentAccounts",
      accountId,
      "holdings",
      holdingId
    );
    await deleteDoc(ref);
  },

  addTransaction: async (uid, accountId, data) => {
    await addDoc(
      collection(
        db,
        "users",
        uid,
        "investmentAccounts",
        accountId,
        "transactions"
      ),
      data
    );
  },
}));
