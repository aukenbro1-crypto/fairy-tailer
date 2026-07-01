const METRIKA_COUNTER_ID = 109116448;
const PRODUCT_PRICE = 3500;
const PRODUCT_CURRENCY = "RUB";
const PRODUCT_ID = "fairyteller_printed_book";
const PRODUCT_NAME = "Печатная персональная книга Fairyteller";

type MetrikaGoal =
  | "ft_constructor_start"
  | "ft_generate_submit"
  | "ft_preview_ready"
  | "ft_checkout_start"
  | "ft_payment_success";

type GoalParams = Record<string, string | number | boolean | undefined | null>;
type OnceStorage = "local" | "session";

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function trackConstructorStart() {
  return trackGoalOnce(
    "ft_constructor_start",
    pageParams(),
    `constructor_start:${currentPath()}`,
    "session",
  );
}

export function trackGenerateSubmit(jobId?: string | null) {
  return trackGoal("ft_generate_submit", {
    ...pageParams(),
    jobId: jobId || undefined,
  });
}

export function trackPreviewReady(jobId?: string | null) {
  return trackGoalOnce(
    "ft_preview_ready",
    {
      ...pageParams(),
      jobId: jobId || undefined,
    },
    `preview_ready:${jobId || currentPath()}`,
  );
}

export function trackCheckoutStart(jobId?: string | null) {
  return trackGoalOnce(
    "ft_checkout_start",
    {
      ...pageParams(),
      jobId: jobId || undefined,
      order_price: PRODUCT_PRICE,
      currency: PRODUCT_CURRENCY,
    },
    `checkout_start:${jobId || currentPath()}`,
  );
}

export function trackPaymentSuccess(jobId?: string | null) {
  const orderId = jobId || currentOrderFallback();
  pushEcommercePurchaseOnce(orderId);

  return trackGoalOnce(
    "ft_payment_success",
    {
      ...pageParams(),
      jobId: jobId || undefined,
      orderId,
      order_price: PRODUCT_PRICE,
      currency: PRODUCT_CURRENCY,
    },
    `payment_success:${orderId}`,
  );
}

function trackGoal(goal: MetrikaGoal, params: GoalParams = {}) {
  if (typeof window === "undefined" || typeof window.ym !== "function") {
    return false;
  }

  window.ym(METRIKA_COUNTER_ID, "reachGoal", goal, cleanParams(params));
  return true;
}

function trackGoalOnce(goal: MetrikaGoal, params: GoalParams, key: string, storageType: OnceStorage = "local") {
  const storage = getStorage(storageType);
  const storageKey = `fairyteller:metrika:${key}`;

  if (storage?.getItem(storageKey)) {
    return false;
  }

  const sent = trackGoal(goal, params);
  storage?.setItem(storageKey, "1");
  return sent;
}

function pushEcommercePurchaseOnce(orderId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const storage = getStorage("local");
  const storageKey = `fairyteller:metrika:ecommerce_purchase:${orderId}`;

  if (storage?.getItem(storageKey)) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    ecommerce: {
      currencyCode: PRODUCT_CURRENCY,
      purchase: {
        actionField: {
          id: orderId,
          revenue: PRODUCT_PRICE,
        },
        products: [
          {
            id: PRODUCT_ID,
            name: PRODUCT_NAME,
            price: PRODUCT_PRICE,
            quantity: 1,
          },
        ],
      },
    },
  });
  storage?.setItem(storageKey, "1");
}

function pageParams() {
  return {
    page: currentPath(),
  };
}

function currentPath() {
  if (typeof window === "undefined") {
    return "";
  }

  return `${window.location.pathname}${window.location.search}`;
}

function currentOrderFallback() {
  if (typeof window === "undefined") {
    return `fairyteller-${Date.now()}`;
  }

  return `fairyteller-${window.location.pathname}-${Date.now()}`;
}

function cleanParams(params: GoalParams) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

function getStorage(storageType: OnceStorage) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return storageType === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}
