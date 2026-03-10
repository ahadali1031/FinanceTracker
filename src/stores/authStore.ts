import { create } from "zustand";
import { signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/src/lib/firebase";
import type { User } from "@/src/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user }),

  setLoading: (loading) => set({ loading }),

  signOut: async () => {
    try {
      await firebaseSignOut(auth);
      set({ user: null });
    } catch (error) {
      console.error("Sign out failed:", error);
      throw error;
    }
  },
}));
