export type GenerationLimitPayload = {
  ok?: boolean;
  limitExceeded?: boolean;
  code?: string;
  message?: string;
  limit?: number;
  used?: number;
  resetAt?: string;
  booksUrl?: string;
  booksAbsoluteUrl?: string;
  payUrl?: string;
  payAbsoluteUrl?: string;
  support?: {
    text?: string;
    telegramUrl?: string;
    siteUrl?: string;
    email?: string;
  };
};

export const isGenerationLimitPayload = (value: unknown): value is GenerationLimitPayload => {
  if (!value || typeof value !== "object") return false;
  const payload = value as GenerationLimitPayload;
  return payload.limitExceeded === true || payload.code === "daily_limit_exceeded";
};
