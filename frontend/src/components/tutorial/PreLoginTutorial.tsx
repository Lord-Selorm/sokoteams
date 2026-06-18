import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ChevronLeft } from 'lucide-react';
import { useTutorialStore } from '@/store/tutorialStore';
import { getPreLoginSteps } from '@/data/tutorialSteps';
import { cn } from '@/lib/utils';

const iconColors = [
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-violet-500 to-violet-600',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-600',
  'from-cyan-500 to-cyan-600',
  'from-indigo-500 to-indigo-600',
  'from-teal-500 to-teal-600',
];

const iconBgColors = [
  'bg-blue-50 dark:bg-blue-950/40',
  'bg-emerald-50 dark:bg-emerald-950/40',
  'bg-violet-50 dark:bg-violet-950/40',
  'bg-amber-50 dark:bg-amber-950/40',
  'bg-rose-50 dark:bg-rose-950/40',
  'bg-cyan-50 dark:bg-cyan-950/40',
  'bg-indigo-50 dark:bg-indigo-950/40',
  'bg-teal-50 dark:bg-teal-950/40',
];

const iconRingColors = [
  'ring-blue-200 dark:ring-blue-800',
  'ring-emerald-200 dark:ring-emerald-800',
  'ring-violet-200 dark:ring-violet-800',
  'ring-amber-200 dark:ring-amber-800',
  'ring-rose-200 dark:ring-rose-800',
  'ring-cyan-200 dark:ring-cyan-800',
  'ring-indigo-200 dark:ring-indigo-800',
  'ring-teal-200 dark:ring-teal-800',
];

export default function PreLoginTutorial() {
  const { isActive, currentStep, nextStep, prevStep, skipTutorial, completeTutorial } = useTutorialStore();
  const steps = getPreLoginSteps();
  const totalSteps = steps.length;
  const isLastStep = currentStep >= totalSteps - 1;
  const step = steps[currentStep];
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const colorIndex = currentStep % iconColors.length;
  const Icon = step?.icon;

  const handleNext = () => {
    if (isLastStep) {
      completeTutorial();
    } else {
      nextStep();
    }
  };

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        <motion.div
          className="relative z-10 mx-4 w-full max-w-lg"
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.96 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.8 }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <button
              onClick={skipTutorial}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <AnimatePresence mode="wait">
              <motion.div
                key={`icon-${currentStep}`}
                className={cn('flex items-center justify-center pt-8 pb-4', iconBgColors[colorIndex])}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              >
                <div className={cn(
                  'w-16 h-16 rounded-xl flex items-center justify-center ring-4',
                  'bg-gradient-to-br text-white shadow-lg',
                  iconColors[colorIndex],
                  iconRingColors[colorIndex],
                )}>
                  <Icon className="w-8 h-8" />
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="px-6 pt-3 pb-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className={cn('h-full rounded-full bg-gradient-to-r', iconColors[colorIndex])}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 tabular-nums min-w-[4rem] text-right">
                  {currentStep + 1} / {totalSteps}
                </span>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`content-${currentStep}`}
                className="px-6 pb-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {step?.title}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {step?.description}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
              <button
                onClick={skipTutorial}
                className="text-sm font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                Skip tour
              </button>

              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <button
                    onClick={prevStep}
                    className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={handleNext}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    isLastStep
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
                  )}
                >
                  {isLastStep ? 'Get started' : 'Next'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
