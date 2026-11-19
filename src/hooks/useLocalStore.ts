import { useEffect, useState } from "react";
import { subscribe, type StoreName } from "@/lib/localDb";

/**
 * Loads data from an IndexedDB store and reloads it whenever that store changes.
 * `loader` must be stable (wrap it in useCallback).
 */
export function useLocalStore<T>(store: StoreName, loader: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      loader()
        .then((d) => {
          if (!alive) return;
          setData(d);
          setError(null);
          setLoading(false);
        })
        .catch((e: unknown) => {
          console.error(`[localDb:${store}]`, e);
          if (!alive) return;
          setError(e instanceof Error ? e.message : "Lecture locale impossible");
          setLoading(false);
        });
    };
    load();
    const unsubscribe = subscribe(store, load);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [store, loader]);

  return { data, loading, error };
}
