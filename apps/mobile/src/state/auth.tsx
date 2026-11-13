import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setAuthToken, setUnauthorizedHandler, type User } from "@/lib/api";
import { registerForPush, unregisterPush } from "@/lib/push";
import { appleCredential, googleIdToken } from "@/lib/social";
import { loadToken, saveToken } from "@/lib/storage";

type Session = { token: string; user: User };

type AuthState = {
  /** false enquanto o app lê a sessão guardada no aparelho. */
  ready: boolean;
  user: User | null;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInDev: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateProfile: (data: { name?: string; phone?: string }) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const clear = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await saveToken(null);
  }, []);

  const start = useCallback(async (session: Session) => {
    setAuthToken(session.token);
    setUser(session.user);
    await saveToken(session.token);
    void registerForPush();
  }, []);

  // Ao abrir o app: recupera a sessão guardada e confere com o servidor.
  useEffect(() => {
    setUnauthorizedHandler(() => void clear());
    (async () => {
      const token = await loadToken();
      if (token) {
        setAuthToken(token);
        try {
          const { user } = await api<{ user: User }>("/me");
          setUser(user);
          void registerForPush();
        } catch (e) {
          // Sessão vencida: desloga. Sem internet: mantém o token e tenta de novo depois.
          if ((e as { status?: number }).status === 401) await clear();
        }
      }
      setReady(true);
    })();
    return () => setUnauthorizedHandler(null);
  }, [clear]);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      user,
      signInWithGoogle: async () => {
        const idToken = await googleIdToken();
        await start(await api<Session>("/auth/google", { method: "POST", body: { idToken } }));
      },
      signInWithApple: async () => {
        const credential = await appleCredential();
        await start(await api<Session>("/auth/apple", { method: "POST", body: credential }));
      },
      signInDev: async (email) => {
        await start(await api<Session>("/auth/dev", { method: "POST", body: { email } }));
      },
      signOut: async () => {
        await unregisterPush();
        await api("/auth/logout", { method: "POST" }).catch(() => {});
        await clear();
      },
      deleteAccount: async () => {
        await api("/me", { method: "DELETE" });
        await clear();
      },
      updateProfile: async (data) => {
        const { user } = await api<{ user: User }>("/me", { method: "PATCH", body: data });
        setUser(user);
      },
    }),
    [ready, user, start, clear],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fora do AuthProvider");
  return ctx;
}
