import { create } from "zustand";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type { SavingsAccount, SavingsSnapshot } from "@/src/types";

interface SavingsState {
  accounts: SavingsAccount[];
  snapshots: Map<string, SavingsSnapshot[]>;
  loading: boolean;
  error: string | null;
  subscribeToAccounts: (uid: string) => () => void;
  addAccount: (
    uid: string,
    data: Omit<SavingsAccount, "id">
  ) => Promise<void>;
  deleteAccount: (uid: string, id: string) => Promise<void>;
  addSnapshot: (
    uid: string,
    accountId: string,
    data: Omit<SavingsSnapshot, "id">
  ) => Promise<void>;
  deleteSnapshot: (
    uid: string,
    accountId: string,
    snapshotId: string
  ) => Promise<void>;
  getTotalSavings: () => number;
  getEmergencyFundTotal: () => number;
}

export const useSavingsStore = create<SavingsState>((set, get) => ({
  accounts: [],
  snapshots: new Map(),
  loading: true,
  error: null,

  subscribeToAccounts: (uid: string) => {
    set({ loading: true, error: null });
    const q = query(
      collection(db, "users", uid, "savingsAccounts"),
      orderBy("name", "asc")
    );

    const snapshotUnsubscribes: (() => void)[] = [];

    const accountsUnsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const accounts = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as SavingsAccount[];

        // Clean up previous snapshot listeners
        snapshotUnsubscribes.forEach((unsub) => unsub());
        snapshotUnsubscribes.length = 0;

        const newSnapshots = new Map<string, SavingsSnapshot[]>();

        for (const account of accounts) {
          const snapshotsQuery = query(
            collection(
              db,
              "users",
              uid,
              "savingsAccounts",
              account.id,
              "snapshots"
            ),
            orderBy("snapshotDate", "desc")
          );
          const unsub = onSnapshot(
            snapshotsQuery,
            (snapshotsSnap) => {
              const s = snapshotsSnap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
              })) as SavingsSnapshot[];
              const current = new Map(get().snapshots);
              current.set(account.id, s);
              set({ snapshots: current });
            },
            (error) => {
              console.error(`Savings snapshots error for ${account.id}:`, error);
            }
          );
          snapshotUnsubscribes.push(unsub);
          newSnapshots.set(account.id, []);
        }

        set({ accounts, snapshots: newSnapshots, loading: false, error: null });
      },
      (error) => {
        console.error("Savings subscription error:", error);
        set({ loading: false, error: error.message });
      }
    );

    return () => {
      accountsUnsubscribe();
      snapshotUnsubscribes.forEach((unsub) => unsub());
    };
  },

  addAccount: async (uid, data) => {
    await addDoc(collection(db, "users", uid, "savingsAccounts"), data);
  },

  deleteAccount: async (uid, id) => {
    // Cascade delete: remove all snapshots first
    const snapshotsRef = collection(
      db, "users", uid, "savingsAccounts", id, "snapshots"
    );
    const snapshotsSnap = await getDocs(snapshotsRef);
    for (const snapDoc of snapshotsSnap.docs) {
      await deleteDoc(snapDoc.ref);
    }
    // Then delete the account
    const ref = doc(db, "users", uid, "savingsAccounts", id);
    await deleteDoc(ref);
  },

  addSnapshot: async (uid, accountId, data) => {
    await addDoc(
      collection(
        db,
        "users",
        uid,
        "savingsAccounts",
        accountId,
        "snapshots"
      ),
      data
    );
  },

  deleteSnapshot: async (uid, accountId, snapshotId) => {
    await deleteDoc(
      doc(db, "users", uid, "savingsAccounts", accountId, "snapshots", snapshotId)
    );
  },

  getTotalSavings: () => {
    const { accounts, snapshots } = get();
    let total = 0;
    for (const account of accounts) {
      const accountSnapshots = snapshots.get(account.id);
      if (accountSnapshots && accountSnapshots.length > 0) {
        // First snapshot is the most recent (ordered desc)
        total += accountSnapshots[0].balance;
      }
    }
    return total;
  },

  getEmergencyFundTotal: () => {
    const { accounts, snapshots } = get();
    let total = 0;
    for (const account of accounts) {
      if (!account.isEmergencyFund) continue;
      const accountSnapshots = snapshots.get(account.id);
      if (accountSnapshots && accountSnapshots.length > 0) {
        total += accountSnapshots[0].balance;
      }
    }
    return total;
  },
}));
