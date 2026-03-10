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
import type { Subscription } from "@/src/types";

interface SubscriptionState {
  subscriptions: Subscription[];
  loading: boolean;
  subscribeToSubscriptions: (uid: string) => () => void;
  addSubscription: (
    uid: string,
    data: Omit<Subscription, "id" | "createdAt">
  ) => Promise<void>;
  updateSubscription: (
    uid: string,
    id: string,
    data: Partial<Subscription>
  ) => Promise<void>;
  deleteSubscription: (uid: string, id: string) => Promise<void>;
  toggleActive: (uid: string, id: string, isActive: boolean) => Promise<void>;
  getMonthlyTotal: () => number;
  getYearlyTotal: () => number;
  getUpcomingRenewals: (withinDays?: number) => Subscription[];
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscriptions: [],
  loading: true,

  subscribeToSubscriptions: (uid: string) => {
    set({ loading: true });
    const q = query(
      collection(db, "users", uid, "subscriptions"),
      orderBy("nextBillingDate", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subscriptions = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Subscription[];
      set({ subscriptions, loading: false });
    });
    return unsubscribe;
  },

  addSubscription: async (uid, data) => {
    await addDoc(collection(db, "users", uid, "subscriptions"), {
      ...data,
      createdAt: serverTimestamp(),
    });
  },

  updateSubscription: async (uid, id, data) => {
    const ref = doc(db, "users", uid, "subscriptions", id);
    await updateDoc(ref, data);
  },

  deleteSubscription: async (uid, id) => {
    const ref = doc(db, "users", uid, "subscriptions", id);
    await deleteDoc(ref);
  },

  toggleActive: async (uid, id, isActive) => {
    const ref = doc(db, "users", uid, "subscriptions", id);
    await updateDoc(ref, { isActive });
  },

  getMonthlyTotal: () => {
    const active = get().subscriptions.filter((s) => s.isActive);
    return active.reduce((total, s) => {
      if (s.frequency === "monthly") return total + s.amount;
      if (s.frequency === "yearly") return total + s.amount / 12;
      return total;
    }, 0);
  },

  getYearlyTotal: () => {
    const active = get().subscriptions.filter((s) => s.isActive);
    return active.reduce((total, s) => {
      if (s.frequency === "yearly") return total + s.amount;
      if (s.frequency === "monthly") return total + s.amount * 12;
      return total;
    }, 0);
  },

  getUpcomingRenewals: (withinDays = 7) => {
    const now = new Date();
    const cutoff = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
    return get().subscriptions.filter((s) => {
      if (!s.isActive) return false;
      const billing = s.nextBillingDate.toDate();
      return billing >= now && billing <= cutoff;
    });
  },
}));
