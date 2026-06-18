import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName: string;
  confirmLabel?: string;
  isLoading?: boolean;
}

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, itemName, confirmLabel = 'Delete', isLoading }: ConfirmDialogProps) {
  return (
    <Transition show={isOpen}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="bg-white dark:bg-gray-900 rounded-xl shadow-lg w-full max-w-sm border border-gray-200 dark:border-gray-800">
              <DialogTitle className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 text-sm font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </DialogTitle>
              <div className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">{message}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{itemName}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={onClose} className="btn-secondary flex-1" disabled={isLoading}>Cancel</button>
                  <button onClick={onConfirm} className="btn-danger flex-1" disabled={isLoading}>
                    {isLoading ? 'Deleting...' : confirmLabel}
                  </button>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
