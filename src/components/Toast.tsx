'use client';

import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

type ToastType = 'error' | 'success' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const ICONS = {
  error: AlertTriangle,
  success: CheckCircle,
  info: Info,
};

const COLORS = {
  error: 'border-red-500/40 text-red-400',
  success: 'border-[var(--alert-green)]/40 text-[var(--alert-green)]',
  info: 'border-[var(--cyan-primary)]/40 text-[var(--cyan-primary)]',
};

function ToastItem({ item, onRemove }: { item: ToastItem; onRemove: (id: string) => void }) {
  const Icon = ICONS[item.type];

  useEffect(() => {
    const t = setTimeout(() => onRemove(item.id), 4000);
    return () => clearTimeout(t);
  }, [item.id, onRemove]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border bg-[var(--bg-secondary)]/95 backdrop-blur-sm shadow-lg max-w-[320px] ${COLORS[item.type]}`}
    >
      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <span className="text-[10px] font-mono text-[var(--text-primary)] leading-relaxed flex-1">{item.message}</span>
      <button onClick={() => onRemove(item.id)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0 mt-0.5">
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-24 right-5 z-[600] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(item => (
            <div key={item.id} className="pointer-events-auto">
              <ToastItem item={item} onRemove={remove} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
