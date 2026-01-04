"use client";

import { useCallback, useEffect, useState } from "react";

type FirebaseUser = {
  id: string;
  email: string;
  name?: string | null;
  locale?: string;
  onboarded?: boolean;
};

export function useFirebaseUser() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/firebase/me", { cache: "no-store" });
      const data = (await res.json()) as { user?: FirebaseUser | null };
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { user, loading, refresh };
}
