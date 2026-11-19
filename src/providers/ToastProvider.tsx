import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ToastContext, type ToastItem } from "./contexts";
import { uid } from "@/lib/utils";

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: Omit<ToastItem, "id">) => {
      const id = uid();
      setToasts((list) => [...list.slice(-3), { ...t, id }]);
      const duration = t.tone === "alert" || t.tone === "danger" ? 9000 : 5000;
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toasts, toast, dismiss }), [toasts, toast, dismiss]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
