import { create } from 'zustand';

interface ToastState {
  message: string;
  visible: boolean;
  showToast: (message: string) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: '',
  visible: false,
  showToast: (message: string) => set({ message, visible: true }),
  hideToast: () => set({ message: '', visible: false }),
}));
