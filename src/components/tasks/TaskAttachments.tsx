import { useState } from 'react';
import { Paperclip, X, Download, FileText, Image as ImageIcon, Link as LinkIcon, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Attachment } from '@/types';

interface TaskAttachmentsProps {
  attachments: Attachment[];
  onAddAttachment: (file: File) => void;
  onDeleteAttachment: (attachmentId: string) => void;
}

export default function TaskAttachments({
  attachments,
  onAddAttachment,
  onDeleteAttachment,
}: TaskAttachmentsProps) {
  const [isDragging, setIsDragging] = useState(false);

  const getAttachmentIcon = (type: Attachment['type']) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-5 h-5" />;
      case 'document': return <FileText className="w-5 h-5" />;
      case 'link': return <LinkIcon className="w-5 h-5" />;
      case 'file': return <File className="w-5 h-5" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onAddAttachment(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onAddAttachment(files[0]);
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-200">Attachments</h4>
        <span className="text-xs text-gray-500 dark:text-gray-400">{attachments.length}</span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center transition-colors',
          isDragging
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
        )}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileSelect}
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center gap-2"
        >
          <Paperclip className="w-8 h-8 text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Drag and drop files here, or click to browse
          </p>
        </label>
      </div>

      {/* Attachments list */}
      {attachments.length > 0 && (
        <div className="mt-3 space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg group"
            >
              <div className="p-2 bg-white dark:bg-gray-800 rounded-md text-gray-600 dark:text-gray-400">
                {getAttachmentIcon(attachment.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">
                  {attachment.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(attachment.size)} • {attachment.uploadedBy.name}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => window.open(attachment.url, '_blank')}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteAttachment(attachment.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500"
                  title="Delete"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
