import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type UIState = {
  darkMode: boolean;
  sidebarOpen: boolean;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  initializeDarkMode: () => void;
};

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      darkMode: true,
      sidebarOpen: true,
      initializeDarkMode: () => {
        const darkMode = get().darkMode;
        const root = document.documentElement;
        if (darkMode) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      },
      toggleDarkMode: () => {
        const newMode = !get().darkMode;
        set({ darkMode: newMode });
        const root = document.documentElement;
        if (newMode) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      },
      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },
      setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open });
      },
    }),
    { 
      name: 'ui-store',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.initializeDarkMode();
        }
      }
    }
  )
);
