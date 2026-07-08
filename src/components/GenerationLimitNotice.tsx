import { BookOpen, Mail, MessageCircle, ShoppingBag } from "lucide-react";

import type { GenerationLimitPayload } from "@/lib/fairytellerLimit";

type GenerationLimitNoticeProps = {
  notice: GenerationLimitPayload;
  className?: string;
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

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export default function GenerationLimitNotice({ notice, className = "" }: GenerationLimitNoticeProps) {
  const limit = Number(notice.limit || 3);
  const used = Number(notice.used || limit);
  const resetAt = formatResetAt(notice.resetAt);
  const booksHref = notice.booksUrl || notice.booksAbsoluteUrl || "";
  const payHref = notice.payUrl || notice.payAbsoluteUrl || "";
  const support = { ...fallbackSupport, ...(notice.support || {}) };

  return (
    <section className={`mx-auto w-full max-w-[760px] border-2 border-black bg-[#fae7e1] p-6 text-center shadow-[6px_6px_0_#111] md:p-8 ${className}`}>
      <div className="mx-auto flex h-16 w-16 items-center justify-center border-2 border-black bg-white">
        <BookOpen className="h-8 w-8" aria-hidden="true" />
      </div>
      <p className="mt-5 text-[12px] font-black uppercase tracking-[0.14em] text-[#5e6264]">
        Бесплатные генерации на сегодня закончились
      </p>
      <h3 className="mx-auto mt-3 max-w-[620px] text-[32px] font-black uppercase leading-[1.05] text-black md:text-[48px]">
        Сегодня уже создано {used}/{limit} сказки
      </h3>
      <p className="mx-auto mt-5 max-w-[600px] text-[17px] leading-7 text-[#5e6264]">
        {notice.message || "Посмотрите свои готовые истории или оплатите одну из них."}
        {resetAt ? ` Новый бесплатный лимит откроется ${resetAt}.` : ""}
      </p>
      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {booksHref && (
          <a
            href={booksHref}
            className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 border-2 border-black bg-white px-6 py-3 text-center text-[13px] font-black uppercase tracking-[0.08em] text-black transition hover:bg-black hover:text-white sm:w-auto"
          >
            <BookOpen className="h-5 w-5" aria-hidden="true" />
            Все мои сказки
          </a>
        )}
        {payHref && (
          <a
            href={payHref}
            className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 border-2 border-black bg-[#E89C31] px-6 py-3 text-center text-[13px] font-black uppercase tracking-[0.08em] text-black transition hover:bg-black hover:text-white sm:w-auto"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            Оплатить
          </a>
        )}
      </div>
      <p className="mx-auto mt-6 max-w-[620px] text-[14px] font-bold leading-6 text-[#5e6264]">
        Нужна помощь? Свяжитесь с нами через{" "}
        <a href={support.telegramUrl} className="font-black text-black underline">
          <MessageCircle className="mr-1 inline h-4 w-4 align-[-2px]" aria-hidden="true" />
          Telegram (t.me/nikita0shch)
        </a>
        ,{" "}
        <a href={support.siteUrl} className="font-black text-black underline">
          форму на сайте
        </a>{" "}
        или{" "}
        <a href={`mailto:${support.email}`} className="font-black text-black underline">
          <Mail className="mr-1 inline h-4 w-4 align-[-2px]" aria-hidden="true" />
          {support.email}
        </a>
        .
      </p>
    </section>
  );
}
