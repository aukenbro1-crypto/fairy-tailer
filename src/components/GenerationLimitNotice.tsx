import { useState } from "react";
import { BookOpen, KeyRound, LoaderCircle, Mail, MessageCircle, ShoppingBag } from "lucide-react";

import type { GenerationLimitPayload } from "@/lib/fairytellerLimit";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

type GenerationLimitNoticeProps = {
  notice: GenerationLimitPayload;
  className?: string;
  email?: string;
  onAuthenticated?: () => void | Promise<void>;
};

const fallbackSupport = {
  telegramUrl: "https://t.me/nikita0shch",
  siteUrl: "https://fairyteller.ru",
  email: "books@fairyteller.ru",
};

const formatResetAt = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  if (!byType.day || !byType.month || !byType.hour || !byType.minute) return "";

  return `${byType.day} ${byType.month} в ${byType.hour}:${byType.minute}`;
};

const storyWord = (value: number) => {
  const absValue = Math.abs(value);
  const mod100 = absValue % 100;
  const mod10 = absValue % 10;
  if (mod100 >= 11 && mod100 <= 14) return "сказок";
  if (mod10 === 1) return "сказку";
  if (mod10 >= 2 && mod10 <= 4) return "сказки";
  return "сказок";
};

const authErrorMessage = (value: unknown) => {
  const message = value instanceof Error ? value.message : "";
  const normalized = message.toLowerCase();
  if (normalized.includes("token") && (normalized.includes("invalid") || normalized.includes("expired"))) {
    return "Код неверный или уже истёк. Проверьте код либо запросите новый.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Слишком много попыток. Подождите немного и запросите новый код.";
  }
  return message || "Не удалось войти. Попробуйте ещё раз.";
};

export default function GenerationLimitNotice({
  notice,
  className = "",
  email = "",
  onAuthenticated,
}: GenerationLimitNoticeProps) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const normalizedEmail = email.trim().toLowerCase();

  const requestCode = async () => {
    setBusy(true);
    setError("");
    try {
      if (!supabase || !isSupabaseConfigured) throw new Error("Авторизация временно недоступна.");
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: true },
      });
      if (authError) throw authError;
      setOtp("");
      setStep("code");
    } catch (authError) {
      setError(authErrorMessage(authError));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    setBusy(true);
    setError("");
    try {
      if (!supabase || !isSupabaseConfigured) throw new Error("Авторизация временно недоступна.");
      const { data, error: authError } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: otp.replace(/\D/g, ""),
        type: "email",
      });
      if (authError) throw authError;
      if (!data.session?.access_token) throw new Error("Не удалось открыть сессию.");
      await onAuthenticated?.();
    } catch (authError) {
      setError(authErrorMessage(authError));
      setBusy(false);
    }
  };

  if (notice.authRequired) {
    return (
      <section className={`mx-auto w-full max-w-[760px] border-2 border-black bg-[#eef5ea] p-6 text-center shadow-[6px_6px_0_#111] md:p-8 ${className}`}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center border-2 border-black bg-white">
          <KeyRound className="h-8 w-8" aria-hidden="true" />
        </div>
        <p className="mt-5 text-[14px] font-black text-[#5e6264]">Хотите создать еще одну сказку?</p>
        <h3 className="mx-auto mt-3 max-w-[640px] text-[30px] font-black uppercase leading-[1.05] text-black md:text-[46px]">
          Авторизуйтесь, чтобы сгенерировать новую историю
        </h3>
        <p className="mx-auto mt-5 max-w-[620px] text-[17px] leading-7 text-[#5e6264]">
          Войдите в личный кабинет, чтобы создать новые истории или отредактировать существующие.
        </p>
        {step === "email" ? (
          <div className="mx-auto mt-7 max-w-[520px]">
            <label className="block text-left text-[12px] font-black uppercase tracking-[0.1em] text-black" htmlFor="generation-auth-email">Почта из конструктора</label>
            <input id="generation-auth-email" type="email" value={normalizedEmail} readOnly onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (!busy && normalizedEmail) void requestCode(); } }} className="mt-2 h-14 w-full border-2 border-black bg-white px-4 text-[16px] font-bold text-black" />
            <button type="button" onClick={() => void requestCode()} disabled={busy || !normalizedEmail} className="mt-3 inline-flex min-h-[54px] w-full items-center justify-center gap-2 border-2 border-black bg-black px-6 py-3 text-[13px] font-black uppercase tracking-[0.08em] text-white transition hover:bg-white hover:text-black disabled:cursor-wait disabled:opacity-60">
              {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
              Получить код
            </button>
          </div>
        ) : (
          <div className="mx-auto mt-7 max-w-[520px]">
            <p className="mb-3 text-[14px] font-bold leading-6 text-[#5e6264]">Отправили код на {normalizedEmail}</p>
            <label className="block text-left text-[12px] font-black uppercase tracking-[0.1em] text-black" htmlFor="generation-auth-code">Код из письма</label>
            <input id="generation-auth-code" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (!busy && otp.length === 6) void verifyCode(); } }} maxLength={6} autoFocus className="mt-2 h-14 w-full border-2 border-black bg-white px-4 text-center text-[24px] font-black tracking-[0.3em] text-black" />
            <button type="button" onClick={() => void verifyCode()} disabled={busy || otp.length !== 6} className="mt-3 inline-flex min-h-[54px] w-full items-center justify-center gap-2 border-2 border-black bg-black px-6 py-3 text-[13px] font-black uppercase tracking-[0.08em] text-white transition hover:bg-white hover:text-black disabled:cursor-wait disabled:opacity-60">
              {busy && <LoaderCircle className="h-5 w-5 animate-spin" />}
              Войти и продолжить
            </button>
            <button type="button" onClick={() => { setStep("email"); setOtp(""); setError(""); }} className="mt-4 text-[13px] font-black uppercase tracking-[0.06em] underline underline-offset-4">Отправить код ещё раз</button>
          </div>
        )}
        {error && <p className="mx-auto mt-4 max-w-[520px] text-[14px] font-bold leading-6 text-[#b42318]">{error}</p>}
      </section>
    );
  }

  const limit = Number(notice.limit || 3);
  const used = Math.min(Number(notice.used || limit), limit);
  const resetAt = formatResetAt(notice.resetAt);
  const periodLabel = notice.periodLabel || "сегодня";
  const periodScopeLabel = notice.periodScopeLabel || (periodLabel === "сегодня" ? "сегодня" : "за этот период");
  const isTodayLimit = periodLabel === "сегодня";
  const isSingleExtendedLimit = limit === 1 && !isTodayLimit;
  const booksHref = notice.booksUrl || notice.booksAbsoluteUrl || "";
  const payHref = notice.payUrl || notice.payAbsoluteUrl || "";
  const support = { ...fallbackSupport, ...(notice.support || {}) };
  const limitIntro = limit === 1
    ? `Вы использовали бесплатную попытку ${periodScopeLabel}.`
    : isTodayLimit
      ? "Сегодня вы использовали все бесплатные попытки."
      : `Вы использовали все бесплатные попытки ${periodScopeLabel}.`;

  return (
    <section className={`mx-auto w-full max-w-[760px] border-2 border-black bg-[#fae7e1] p-6 text-center shadow-[6px_6px_0_#111] md:p-8 ${className}`}>
      <div className="mx-auto flex h-16 w-16 items-center justify-center border-2 border-black bg-white">
        <BookOpen className="h-8 w-8" aria-hidden="true" />
      </div>
      <p className="mt-5 text-[12px] font-black uppercase tracking-[0.14em] text-[#5e6264]">
        {isSingleExtendedLimit
          ? "Бесплатный лимит исчерпан"
          : isTodayLimit
            ? "Бесплатный лимит на сегодня исчерпан"
            : `Бесплатный лимит ${periodLabel} исчерпан`}
      </p>
      <h3 className="mx-auto mt-3 max-w-[620px] text-[32px] font-black uppercase leading-[1.05] text-black md:text-[48px]">
        Вы уже создали
        <br />
        {isSingleExtendedLimit ? "сказку" : `${used} ${storyWord(used)} ${periodLabel}`}
      </h3>
      <div className="mx-auto mt-5 max-w-[650px] space-y-3 text-[17px] leading-7 text-[#5e6264]">
        <p>{limitIntro}</p>
        <p>Посмотрите готовые сказки, выберите любимую и оформите ее в книгу.</p>
        <p>
          Если хочется что-то поправить в тексте, иллюстрациях или деталях сюжета — напишите нам. Мы поможем довести
          сказку до готовой книги вручную.
        </p>
        {resetAt && <p>Новый бесплатный лимит откроется {resetAt}.</p>}
      </div>
      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {booksHref && (
          <a
            href={booksHref}
            className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 border-2 border-black bg-white px-6 py-3 text-center text-[13px] font-black uppercase tracking-[0.08em] text-black transition hover:bg-black hover:text-white sm:w-auto"
          >
            <BookOpen className="h-5 w-5" aria-hidden="true" />
            ВСЕ МОИ СКАЗКИ
          </a>
        )}
        {payHref && (
          <a
            href={payHref}
            className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 border-2 border-black bg-[#E89C31] px-6 py-3 text-center text-[13px] font-black uppercase tracking-[0.08em] text-black transition hover:bg-black hover:text-white sm:w-auto"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            ОФОРМИТЬ КНИГУ
          </a>
        )}
      </div>
      <p className="mx-auto mt-6 max-w-[620px] text-[14px] font-bold leading-6 text-[#5e6264]">
        Нужна помощь с текстом или оформлением? Напишите нам в{" "}
        <a href={support.telegramUrl} className="font-black text-black underline">
          <MessageCircle className="mr-1 inline h-4 w-4 align-[-2px]" aria-hidden="true" />
          Telegram
        </a>
        ,{" "}
        <a href={support.siteUrl} className="font-black text-black underline">
          через форму на сайте
        </a>{" "}
        или на{" "}
        <a href={`mailto:${support.email}`} className="font-black text-black underline">
          <Mail className="mr-1 inline h-4 w-4 align-[-2px]" aria-hidden="true" />
          {support.email}
        </a>
        .
      </p>
    </section>
  );
}
