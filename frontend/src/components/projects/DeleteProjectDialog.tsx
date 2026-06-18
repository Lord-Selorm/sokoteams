import ConfirmDialog from '@/components/common/ConfirmDialog';

interface DeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName: string;
  isLoading?: boolean;
}

export default function DeleteProjectDialog({ isOpen, onClose, onConfirm, title, itemName, isLoading }: DeleteDialogProps) {
  return (
    <ConfirmDialog isOpen={isOpen} onClose={onClose} onConfirm={onConfirm} title={`Delete ${title}`} message={`Are you sure you want to delete this ${title.toLowerCase()}? This action cannot be undone.`} itemName={itemName} isLoading={isLoading} />
  );
}
