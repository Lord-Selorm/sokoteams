import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TutorialState {
  hasCompletedTutorial: boolean;
  currentStep: number;
  isActive: boolean;
  completeTutorial: () => void;
  skipTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  startTutorial: () => void;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set, get) => ({
      hasCompletedTutorial: false,
      currentStep: 0,
      isActive: false,

      completeTutorial: () => set({ hasCompletedTutorial: true, isActive: false, currentStep: 0 }),
      skipTutorial: () => set({ hasCompletedTutorial: true, isActive: false, currentStep: 0 }),
      nextStep: () => {
        const { currentStep } = get();
        set({ currentStep: currentStep + 1 });
      },
      prevStep: () => {
        const { currentStep } = get();
        if (currentStep > 0) set({ currentStep: currentStep - 1 });
      },
      startTutorial: () => set({ isActive: true, currentStep: 0 }),
    }),
    {
      name: 'tutorial-store',
      partialize: (state) => ({
        hasCompletedTutorial: state.hasCompletedTutorial,
      }),
    }
  )
);
