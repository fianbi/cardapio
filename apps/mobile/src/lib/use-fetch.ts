import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "./api";

/**
 * Busca dados da API. `path` nulo não busca nada. `pollMs` repete a busca nesse intervalo
 * (usado no acompanhamento do pedido).
 */
export function useFetch<T>(path: string | null, options: { pollMs?: number } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [refreshing, setRefreshing] = useState(false);
  const current = useRef(path);
  current.current = path;

  const load = useCallback(
    async (mode: "initial" | "refresh" | "silent" = "silent") => {
      if (!path) return;
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      try {
        const result = await api<T>(path);
        if (current.current !== path) return; // a tela já pediu outra coisa
        setData(result);
        setError(null);
      } catch (e) {
        if (current.current === path && mode !== "silent") setError(errorMessage(e));
      } finally {
        if (current.current === path) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [path],
  );

  useEffect(() => {
    setData(null);
    setError(null);
    if (!path) {
      setLoading(false);
      return;
    }
    void load("initial");
    if (!options.pollMs) return;
    const id = setInterval(() => void load("silent"), options.pollMs);
    return () => clearInterval(id);
  }, [path, load, options.pollMs]);

  return { data, error, loading, refreshing, refresh: () => load("refresh"), reload: () => load("silent") };
}
