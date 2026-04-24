import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type ToastType = 'info' | 'error';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  show: boolean;
}

interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

interface ToastContextValue {
  show: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback((message: string, options: ToastOptions = {}) => {
    const { type = 'info', duration = 4000 } = options;
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type, show: false }]);

    requestAnimationFrame(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, show: true } : t)),
      );
    });

    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, show: false } : t)),
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast${t.type === 'error' ? ' error' : ''}${t.show ? ' show' : ''}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
