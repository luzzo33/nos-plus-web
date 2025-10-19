'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: ToastPayload) => void;
  removeToast: (id: string) => void;
}

type ToastPayload = {
  type?: ToastType;
  variant?: ToastType;
  title: string;
  description?: string;
  duration?: number;
};

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(7);
    const type = toast.type ?? toast.variant ?? 'info';
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id,
          type,
          title: toast.title,
          description: toast.description,
          duration: toast.duration,
        },
      ],
    }));
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
}));

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  warning: 'bg-yellow-500',
};

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToast();
  const Icon = icons[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, removeToast]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className="card-base shadow-lg p-4 min-w-[300px] max-w-md"
    >
      <div className="flex items-start gap-3">
        <div className={`p-1 rounded-full ${colors[toast.type]} text-white`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-sm">{toast.title}</h4>
          {toast.description && (
            <p className="text-sm text-muted-foreground mt-1">{toast.description}</p>
          )}
        </div>
        <button
          onClick={() => removeToast(toast.id)}
          className="p-1 rounded hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

export function ToastProvider() {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
