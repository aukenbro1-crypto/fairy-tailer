const METRIKA_COUNTER_ID = 109116448;
const PRODUCT_PRICE = 3500;
const PRODUCT_CURRENCY = "RUB";
const PRODUCT_ID = "fairyteller_printed_book";
const PRODUCT_NAME = "Печатная персональная книга Fairyteller";
const STORAGE_PREFIX = "fairyteller:metrika:v2";

type MetrikaGoal =
  | "ft_constructor_start"
  | "ft_generate_submit"
  | "ft_preview_ready"
  | "ft_checkout_start"
  | "ft_payment_success"
  | "constructor_cta_clicked"
  | "constructor_first_field_started"
  | "genre_selected"
  | "hero_required_completed"
  | "style_step_reached"
  | "preview_submit_clicked"
  | "preview_submit_success";

type GoalParams = Record<string, string | number | boolean | undefined | null>;
type OnceStorage = "local" | "session";
type PendingGoal = {
  goal: MetrikaGoal;
  params: GoalParams;
  storageKey?: string;
  storageType?: OnceStorage;
  expiresAt: number;
};

const pendingGoals: PendingGoal[] = [];
let pendingFlushTimer: number | null = null;

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

export function trackConstructorCtaClicked() {
  return trackGoal("constructor_cta_clicked", pageParams());
}

export function trackConstructorFirstFieldStarted() {
  return trackGoalOnce(
    "constructor_first_field_started",
    pageParams(),
    `constructor_first_field_started:${currentPath()}`,
    "session",
  );
}

export function trackGenreSelected(genre?: string) {
  return trackGoal("genre_selected", {
    ...pageParams(),
    genre,
  });
}

export function trackHeroRequiredCompleted() {
  return trackGoalOnce(
    "hero_required_completed",
    pageParams(),
    `hero_required_completed:${currentPath()}`,
    "session",
  );
}

export function trackStyleStepReached() {
  return trackGoalOnce(
    "style_step_reached",
    pageParams(),
    `style_step_reached:${currentPath()}`,
    "session",
  );
}

export function trackPreviewSubmitClicked() {
  return trackGoal("preview_submit_clicked", pageParams());
}

export function trackPreviewSubmitSuccess(jobId?: string | null) {
  return trackGoal("preview_submit_success", {
    ...pageParams(),
    jobId: jobId || undefined,
  });
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
    queueGoal(goal, params);
    return false;
  }

  window.ym(METRIKA_COUNTER_ID, "reachGoal", goal, cleanParams(params));
  return true;
}

function trackGoalOnce(goal: MetrikaGoal, params: GoalParams, key: string, storageType: OnceStorage = "local") {
  const storage = getStorage(storageType);
  const storageKey = `${STORAGE_PREFIX}:${key}`;

  if (storage?.getItem(storageKey)) {
    return false;
  }

  if (sendGoal(goal, params)) {
    storage?.setItem(storageKey, "1");
    return true;
  }

  queueGoal(goal, params, storageKey, storageType);
  return false;
}

function sendGoal(goal: MetrikaGoal, params: GoalParams = {}) {
  if (typeof window === "undefined" || typeof window.ym !== "function") {
    return false;
  }

  window.ym(METRIKA_COUNTER_ID, "reachGoal", goal, cleanParams(params));
  return true;
}

function queueGoal(goal: MetrikaGoal, params: GoalParams = {}, storageKey?: string, storageType?: OnceStorage) {
  if (typeof window === "undefined") {
    return;
  }

  const duplicate = pendingGoals.some((pendingGoal) => pendingGoal.goal === goal && pendingGoal.storageKey === storageKey);
  if (duplicate) {
    return;
  }

  pendingGoals.push({
    goal,
    params,
    storageKey,
    storageType,
    expiresAt: Date.now() + 15000,
  });
  schedulePendingFlush();
}

function schedulePendingFlush() {
  if (typeof window === "undefined" || pendingFlushTimer !== null) {
    return;
  }

  pendingFlushTimer = window.setTimeout(flushPendingGoals, 500);
}

function flushPendingGoals() {
  pendingFlushTimer = null;

  if (typeof window === "undefined") {
    return;
  }

  const now = Date.now();
  for (let index = pendingGoals.length - 1; index >= 0; index -= 1) {
    const pendingGoal = pendingGoals[index];

    if (pendingGoal.expiresAt < now) {
      pendingGoals.splice(index, 1);
      continue;
    }

    if (sendGoal(pendingGoal.goal, pendingGoal.params)) {
      if (pendingGoal.storageKey && pendingGoal.storageType) {
        getStorage(pendingGoal.storageType)?.setItem(pendingGoal.storageKey, "1");
      }
      pendingGoals.splice(index, 1);
    }
  }

  if (pendingGoals.length > 0) {
    schedulePendingFlush();
  }
}

function pushEcommercePurchaseOnce(orderId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const storage = getStorage("local");
  const storageKey = `${STORAGE_PREFIX}:ecommerce_purchase:${orderId}`;

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
