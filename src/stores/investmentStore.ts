import { create } from "zustand";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  getDoc,
  getDocs,
  onSnapshot,
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
  transactions: Map<string, InvestmentTransaction[]>;
  loading: boolean;
  error: string | null;
  subscribeToAccounts: (uid: string) => () => void;
  subscribeToTransactions: (uid: string, accountId: string) => () => void;
  addAccount: (
    uid: string,
    data: Omit<InvestmentAccount, "id">
  ) => Promise<void>;
  updateAccount: (
    uid: string,
    id: string,
    data: Partial<Omit<InvestmentAccount, "id">>
  ) => Promise<void>;
  deleteAccount: (uid: string, id: string) => Promise<void>;
  addHolding: (
    uid: string,
    accountId: string,
    data: Omit<Holding, "id">
  ) => Promise<void>;
  updateHolding: (
    uid: string,
    accountId: string,
    holdingId: string,
    data: Partial<Omit<Holding, "id">>
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
  updateTransaction: (
    uid: string,
    accountId: string,
    transactionId: string,
    data: Partial<Omit<InvestmentTransaction, "id">>
  ) => Promise<void>;
  deleteTransaction: (
    uid: string,
    accountId: string,
    transactionId: string
  ) => Promise<void>;
}

export const useInvestmentStore = create<InvestmentState>((set, get) => ({
  accounts: [],
  holdings: new Map(),
  transactions: new Map(),
  loading: true,
  error: null,

  subscribeToAccounts: (uid: string) => {
    set({ loading: true, error: null });
    const q = query(
      collection(db, "users", uid, "investmentAccounts"),
      orderBy("name", "asc")
    );

    const holdingsUnsubscribes: (() => void)[] = [];

    const accountsUnsubscribe = onSnapshot(
      q,
      (snapshot) => {
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
          const unsub = onSnapshot(
            holdingsQuery,
            (holdingsSnap) => {
              const h = holdingsSnap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
              })) as Holding[];
              const current = new Map(get().holdings);
              current.set(account.id, h);
              set({ holdings: current });
            },
            (error) => {
              console.error(`Holdings error for ${account.id}:`, error);
            }
          );
          holdingsUnsubscribes.push(unsub);
          newHoldings.set(account.id, []);
        }

        set({ accounts, holdings: newHoldings, loading: false, error: null });
      },
      (error) => {
        console.error("Investment subscription error:", error);
        set({ loading: false, error: error.message });
      }
    );

    return () => {
      accountsUnsubscribe();
      holdingsUnsubscribes.forEach((unsub) => unsub());
    };
  },

  subscribeToTransactions: (uid: string, accountId: string) => {
    const q = query(
      collection(
        db,
        "users",
        uid,
        "investmentAccounts",
        accountId,
        "transactions"
      ),
      orderBy("date", "desc")
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const txs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as InvestmentTransaction[];
        const current = new Map(get().transactions);
        current.set(accountId, txs);
        set({ transactions: current });
      },
      (error) => {
        console.error(`Transaction subscription error for ${accountId}:`, error);
      }
    );
  },

  addAccount: async (uid, data) => {
    await addDoc(collection(db, "users", uid, "investmentAccounts"), data);
  },

  updateAccount: async (uid, id, data) => {
    const ref = doc(db, "users", uid, "investmentAccounts", id);
    await updateDoc(ref, data);
  },

  deleteAccount: async (uid, id) => {
    // Cascade delete: remove holdings and transactions subcollections first
    const holdingsRef = collection(
      db, "users", uid, "investmentAccounts", id, "holdings"
    );
    const holdingsSnap = await getDocs(holdingsRef);
    for (const holdingDoc of holdingsSnap.docs) {
      await deleteDoc(holdingDoc.ref);
    }

    const transactionsRef = collection(
      db, "users", uid, "investmentAccounts", id, "transactions"
    );
    const transactionsSnap = await getDocs(transactionsRef);
    for (const txDoc of transactionsSnap.docs) {
      await deleteDoc(txDoc.ref);
    }

    // Then delete the account itself
    const ref = doc(db, "users", uid, "investmentAccounts", id);
    await deleteDoc(ref);
  },

  addHolding: async (uid, accountId, data) => {
    const holdingsRef = collection(
      db,
      "users",
      uid,
      "investmentAccounts",
      accountId,
      "holdings"
    );
    const q = query(holdingsRef, where("ticker", "==", data.ticker));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const existingDoc = snap.docs[0];
      const existing = existingDoc.data() as Omit<Holding, "id">;
      await updateDoc(existingDoc.ref, {
        shares: existing.shares + data.shares,
        costBasis: existing.costBasis + data.costBasis,
      });
    } else {
      await addDoc(holdingsRef, data);
    }
  },

  updateHolding: async (uid, accountId, holdingId, data) => {
    const ref = doc(
      db,
      "users",
      uid,
      "investmentAccounts",
      accountId,
      "holdings",
      holdingId
    );
    await updateDoc(ref, data);
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

  updateTransaction: async (uid, accountId, transactionId, data) => {
    const ref = doc(
      db,
      "users",
      uid,
      "investmentAccounts",
      accountId,
      "transactions",
      transactionId
    );
    await updateDoc(ref, data);
  },

  deleteTransaction: async (uid, accountId, transactionId) => {
    const txRef = doc(
      db,
      "users",
      uid,
      "investmentAccounts",
      accountId,
      "transactions",
      transactionId
    );

    // Read from Firestore directly to avoid stale state
    const txSnap = await getDoc(txRef);
    const tx = txSnap.exists() ? (txSnap.data() as Omit<InvestmentTransaction, "id">) : null;

    await deleteDoc(txRef);

    // Adjust holdings if this was a buy or reinvested dividend transaction
    if (tx && (tx.type === "buy" || (tx.type === "dividend" && tx.isReinvested === true))) {
      const holdingsRef = collection(
        db,
        "users",
        uid,
        "investmentAccounts",
        accountId,
        "holdings"
      );
      const q = query(holdingsRef, where("ticker", "==", tx.ticker));
      const snap = await getDocs(q);

      for (const holdingDoc of snap.docs) {
        const holding = holdingDoc.data() as Omit<Holding, "id">;
        const newShares = holding.shares - tx.shares;
        const newCostBasis = holding.costBasis - tx.totalAmount;

        if (newShares <= 0) {
          await deleteDoc(holdingDoc.ref);
        } else {
          if (newCostBasis < 0) {
            console.warn(`Negative cost basis for ${tx.ticker}: ${newCostBasis}, capping to 0`);
          }
          await updateDoc(holdingDoc.ref, {
            shares: newShares,
            costBasis: Math.max(0, newCostBasis),
          });
        }
      }
    }
  },
}));
