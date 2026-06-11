"use client";

import { useCallback, useEffect, useState } from "react";

// Load data on mount, reload() refetches
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loader());
    } catch {
      setData(null);
    }
    setLoading(false);
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, reload };
}
