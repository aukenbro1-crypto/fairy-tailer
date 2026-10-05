import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

const ACCOUNT_ENDPOINT = "/api/fairyteller/account";

export const useCustomerAuth = () => {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;
    let authSyncTimer: ReturnType<typeof setTimeout> | undefined;

    const checkLegacySession = async () => {
      try {
        const response = await fetch(ACCOUNT_ENDPOINT, { credentials: "same-origin" });
        const payload = await response.json().catch(() => ({ authenticated: false })) as {
          authenticated?: boolean;
        };
        if (active) setAuthenticated(response.ok && Boolean(payload.authenticated));
      } catch {
        if (active) setAuthenticated(false);
      }
    };

    const initialize = async () => {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      if (!active) return;
      if (session) {
        setAuthenticated(true);
      } else {
        await checkLegacySession();
      }
    };

    let unsubscribe = () => undefined;
    if (supabase) {
      const listener = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return;
        if (authSyncTimer) window.clearTimeout(authSyncTimer);
        setAuthenticated(Boolean(session));
        if (!session) {
          authSyncTimer = window.setTimeout(() => {
            if (active) void checkLegacySession();
          }, 0);
        }
      });
      unsubscribe = () => listener.data.subscription.unsubscribe();
    }

    void initialize();
    return () => {
      active = false;
      if (authSyncTimer) window.clearTimeout(authSyncTimer);
      unsubscribe();
    };
  }, []);

  return authenticated;
};
