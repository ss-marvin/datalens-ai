import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import type { DataProfile } from '../types';

interface FileUploadProps {
  onUploadSuccess: (sessionId: string, profile: DataProfile) => void;
  onUploadStart?: () => void;
}

type UploadState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error';

const ACCEPTED_TYPES = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/json',
  'text/tab-separated-values',
];

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.json', '.tsv', '.parquet'];

export function FileUpload({ onUploadSuccess, onUploadStart }: FileUploadProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const validateFile = (file: File): boolean => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError(`Unsupported file type. Please use: ${ACCEPTED_EXTENSIONS.join(', ')}`);
      return false;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum size is 50MB.');
      return false;
    }
    return true;
  };

  const uploadFile = async (file: File) => {
    setState('uploading');
    setProgress(0);
    onUploadStart?.();

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Upload failed');
      }

      const data = await response.json();
      
      if (data.success && data.profile) {
        setState('success');
        setTimeout(() => {
          onUploadSuccess(data.session_id, data.profile);
        }, 500);
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (err) {
      clearInterval(progressInterval);
      setState('error');
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState('idle');

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && validateFile(droppedFile)) {
      setFile(droppedFile);
      setError(null);
      uploadFile(droppedFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && validateFile(selectedFile)) {
      setFile(selectedFile);
      setError(null);
      uploadFile(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setState('dragging');
  };

  const handleDragLeave = () => {
    setState('idle');
  };

  const reset = () => {
    setState('idle');
    setFile(null);
    setError(null);
    setProgress(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={clsx(
          'relative rounded-2xl border-2 border-dashed p-12 transition-all duration-300',
          state === 'dragging' && 'border-accent-primary bg-accent-primary/5 scale-[1.02]',
          state === 'idle' && 'border-surface-highlight hover:border-accent-muted/50 hover:bg-surface-raised/50',
          state === 'uploading' && 'border-accent-muted bg-surface-raised',
          state === 'success' && 'border-success/50 bg-success/5',
          state === 'error' && 'border-error/50 bg-error/5'
        )}
      >
        <input
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={state === 'uploading'}
        />

        <AnimatePresence mode="wait">
          {state === 'idle' || state === 'dragging' ? (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center"
            >
              <div className={clsx(
                'w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors',
                state === 'dragging' ? 'bg-accent-primary/20' : 'bg-surface-overlay'
              )}>
                <Upload className={clsx(
                  'w-8 h-8 transition-colors',
                  state === 'dragging' ? 'text-accent-primary' : 'text-lens-400'
                )} />
              </div>
              
              <h3 className="font-display text-2xl text-lens-100 mb-2">
                {state === 'dragging' ? 'Drop your file here' : 'Upload your data'}
              </h3>
              <p className="text-lens-500 mb-4">
                Drag and drop or click to browse
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['CSV', 'Excel', 'JSON', 'Parquet'].map((type) => (
                  <span
                    key={type}
                    className="px-3 py-1 text-xs font-mono bg-surface-overlay rounded-full text-lens-400"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </motion.div>
          ) : state === 'uploading' ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-surface-overlay flex items-center justify-center mb-6">
                <FileSpreadsheet className="w-8 h-8 text-accent-primary animate-pulse-soft" />
              </div>
              
              <h3 className="font-display text-2xl text-lens-100 mb-2">
                Processing {file?.name}
              </h3>
              
              <div className="w-full max-w-xs mt-4">
                <div className="h-1.5 bg-surface-overlay rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-lens-500 text-sm mt-2">{Math.round(progress)}%</p>
              </div>
            </motion.div>
          ) : state === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <h3 className="font-display text-2xl text-lens-100 mb-2">
                Upload complete!
              </h3>
              <p className="text-lens-400">Analyzing your data...</p>
            </motion.div>
          ) : (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center mb-6">
                <AlertCircle className="w-8 h-8 text-error" />
              </div>
              <h3 className="font-display text-2xl text-lens-100 mb-2">
                Upload failed
              </h3>
              <p className="text-error/80 mb-4">{error}</p>
              <button
                onClick={reset}
                className="btn-secondary flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Try again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
