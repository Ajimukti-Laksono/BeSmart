import { createContext, useCallback, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

export const ToastContext = createContext(null);

const TOAST_STYLES = {
  success: {
    container: "border-emerald-200 bg-emerald-50 text-emerald-900",
    Icon: CheckCircle2,
    iconColor: "text-emerald-600",
  },
  error: {
    container: "border-rose-200 bg-rose-50 text-rose-900",
    Icon: AlertCircle,
    iconColor: "text-rose-600",
  },
  warning: {
    container: "border-amber-200 bg-amber-50 text-amber-900",
    Icon: AlertTriangle,
    iconColor: "text-amber-600",
  },
  info: {
    container: "border-indigo-200 bg-indigo-50 text-indigo-900",
    Icon: Info,
    iconColor: "text-indigo-600",
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = "info", duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  const value = useMemo(
    () => ({
      showToast,
      success: (msg) => showToast(msg, "success"),
      error: (msg) => showToast(msg, "error", 5000),
      warning: (msg) => showToast(msg, "warning"),
      info: (msg) => showToast(msg, "info"),
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2.5"
      >
        {toasts.map((toast) => {
          const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
          const IconComponent = style.Icon;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-lg transition-all ${style.container}`}
            >
              <IconComponent className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconColor}`} />
              <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="rounded-md p-0.5 opacity-70 transition hover:bg-black/5 hover:opacity-100"
                aria-label="Tutup notifikasi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

