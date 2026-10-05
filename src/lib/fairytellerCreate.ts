import { supabase } from "@/integrations/supabase/client";
import { isGenerationLimitPayload, type GenerationLimitPayload } from "@/lib/fairytellerLimit";

type GenerationAccessPayload = {
  authenticated?: boolean;
  token?: string;
};

const generationAccessToken = async () => {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  const response = await fetch("/api/fairyteller/generation-access", {
    method: "POST",
    credentials: "same-origin",
    headers: session?.access_token
      ? { authorization: `Bearer ${session.access_token}` }
      : undefined,
  });
  if (!response.ok) return "";
  const payload = (await response.json().catch(() => ({}))) as GenerationAccessPayload;
  return payload.authenticated && payload.token ? payload.token : "";
};

export const submitFairytellerCreate = async (url: string, formData: FormData) => {
  const accessToken = await generationAccessToken().catch(() => "");
  if (accessToken) formData.set("generation_access_token", accessToken);
  else formData.delete("generation_access_token");
  return fetch(url, { method: "POST", body: formData });
};

export const checkFairytellerGenerationQuota = async (email: string): Promise<GenerationLimitPayload | null> => {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  const response = await fetch("/api/fairyteller/generation-check", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      ...(session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  const payload = (await response.json().catch(() => null)) as GenerationLimitPayload | null;
  if (response.ok) return null;
  if (isGenerationLimitPayload(payload)) return payload;
  throw new Error(payload?.message || "Не удалось проверить доступность генерации");
};
