import { useEffect } from "react";
import { useAppStore } from "../store/appStore";

const AUTO_DISMISS_MS = 6000;

export default function Toasts() {
  const toasts = useAppStore((s) => s.toasts);
  const dismissToast = useAppStore((s) => s.dismissToast);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) =>
      setTimeout(() => dismissToast(toast.id), AUTO_DISMISS_MS)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`}>
          <span>{toast.message}</span>
          <button type="button" onClick={() => dismissToast(toast.id)} aria-label="閉じる">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
