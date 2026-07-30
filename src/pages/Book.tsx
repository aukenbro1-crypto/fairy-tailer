import { useEffect, useMemo, useRef, useState, type TouchEvent, type WheelEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Check, Lock, Mail, MessageCircle, ShoppingBag } from "lucide-react";

import { trackCheckoutStart, trackPreviewReady } from "@/lib/metrika";
import logoImage from "@/assets/logo.png";

const STATUS_ENDPOINT_BASE_URL = import.meta.env.VITE_FAIRYTELLER_STATUS_BASE_URL || "/api/fairyteller/jobs";

type JobStatus = {
  jobId: string;
  status: string;
  stage?: string;
  preview?: { title?: string } | null;
  artifacts?: {
    bookPdf?: { url?: string };
    previewPdf?: { url?: string };
    render?: { files?: { book?: { url?: string }; preview?: { url?: string } } };
  };
  payment?: { status?: string; paid?: boolean };
  paid?: boolean;
};

type FullTextChapter = {
  n?: number;
  title?: string;
  text?: string;
  textBlocks?: string[];
};

type FullTextPayload = {
  text?: {
    bible?: { bookTitle?: string; subtitle?: string; coverSummary?: string };
    preview?: { title?: string; summary?: string };
    chapters?: FullTextChapter[];
  };
};

type SampleChapter = {
  n?: number | null;
  title?: string;
  summary?: string;
  text?: string;
  textBlocks?: string[];
};

type BookSample = {
  title?: string;
  summary?: string;
  chapters?: SampleChapter[];
  availableChapters?: number;
  totalChapters?: number;
  lockedChapter?: (SampleChapter & { imageUrl?: string }) | null;
};

type PreviewPage = {
  n: number;
  url: string;
};

type PreviewChapterBreak = {
  chapter: number;
  page: number;
};

type PreviewProgress = {
  availablePages?: number;
  totalPages?: number;
  availableChapters?: number;
  totalChapters?: number;
  chapterEndPages?: PreviewChapterBreak[];
};

type PaywallStage = "revision" | "purchase";

const PREVIEW_PAGE_PRELOAD_BEFORE = 2;
const PREVIEW_PAGE_PRELOAD_AFTER = 4;

const splitParagraphs = (text: string) => String(text || "").split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);

const chapterText = (chapter: FullTextChapter | SampleChapter) => {
  if (chapter.text) return chapter.text;
  if (Array.isArray(chapter.textBlocks)) return chapter.textBlocks.join("\n\n");
  return "";
};

const withAccess = (url: string, access: string) => {
  if (!url || !access) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}access=${encodeURIComponent(access)}`;
};

const Book = () => {
  const { jobId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const access = searchParams.get("access") || "";
  const isPendingReturn = searchParams.get("status") === "pending";
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [fullText, setFullText] = useState<FullTextPayload | null>(null);
  const [sample, setSample] = useState<BookSample | null>(null);
  const [previewPages, setPreviewPages] = useState<PreviewPage[]>([]);
  const [previewProgress, setPreviewProgress] = useState<PreviewProgress | null>(null);
  const [currentPreviewPage, setCurrentPreviewPage] = useState(1);
  const [showPaywallLock, setShowPaywallLock] = useState(false);
  const [paywallCollapsed, setPaywallCollapsed] = useState(false);
  const [paywallStage, setPaywallStage] = useState<PaywallStage>("revision");
  const [revisionPromptDismissed, setRevisionPromptDismissed] = useState(false);
  const [purchasePromptDismissed, setPurchasePromptDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const previewPageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const chapterBreakRefs = useRef(new Map<number, HTMLDivElement | null>());
  const paywallTouchYRef = useRef<number | null>(null);

  const bookTitle = useMemo(() => {
    return fullText?.text?.bible?.bookTitle
      || fullText?.text?.preview?.title
      || status?.preview?.title
      || "Ваша сказка";
  }, [fullText, status]);

  const pdfUrl = useMemo(() => {
    const raw = status?.artifacts?.bookPdf?.url
      || status?.artifacts?.render?.files?.book?.url
      || status?.artifacts?.previewPdf?.url
      || status?.artifacts?.render?.files?.preview?.url
      || "";
    return withAccess(raw, access);
  }, [access, status]);

  const payUrl = useMemo(() => {
    const rawPdf = status?.artifacts?.bookPdf?.url
      || status?.artifacts?.render?.files?.book?.url
      || status?.artifacts?.previewPdf?.url
      || status?.artifacts?.render?.files?.preview?.url
      || "";
    const params = new URLSearchParams();
    if (jobId) params.set("jobId", jobId);
    if (rawPdf) params.set("pdf", rawPdf);
    return `/pay${params.toString() ? `?${params.toString()}` : ""}`;
  }, [jobId, status]);

  const isPaid = Boolean(status?.paid || status?.payment?.status === "paid");

  useEffect(() => {
    if (jobId && status && !access) {
      trackPreviewReady(jobId);
    }
  }, [access, jobId, status]);

  useEffect(() => {
    if (!jobId) return undefined;
    let cancelled = false;

    const loadStatus = async () => {
      const response = await fetch(`${STATUS_ENDPOINT_BASE_URL}/${jobId}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Не удалось открыть статус книги");
      if (!cancelled) setStatus(payload);
      return payload as JobStatus;
    };

    const loadFullText = async () => {
      if (!access) return;
      const response = await fetch(`${STATUS_ENDPOINT_BASE_URL}/${jobId}/artifacts/full-text.json?access=${encodeURIComponent(access)}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Ссылка устарела или недействительна");
      if (!cancelled) setFullText(payload);
    };

    const loadSample = async () => {
      if (access) return;
      const response = await fetch(`${STATUS_ENDPOINT_BASE_URL}/${jobId}/sample`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Не удалось открыть бесплатный фрагмент");
      if (!cancelled) setSample(payload);
    };

    const loadPreviewPages = async () => {
      if (access) return;
      const response = await fetch(`${STATUS_ENDPOINT_BASE_URL}/${jobId}/sample-pages`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Не удалось подготовить PDF-превью");
      if (!cancelled) {
        setPreviewPages(Array.isArray(payload.pages) ? payload.pages : []);
        setPreviewProgress(payload.progress || null);
      }
    };

    setIsLoading(true);
    setError("");
    setShowPaywallLock(false);
    setPaywallCollapsed(false);
    setPaywallStage("revision");
    setRevisionPromptDismissed(false);
    setPurchasePromptDismissed(false);
    Promise.all([loadStatus(), loadFullText(), loadSample(), loadPreviewPages()])
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Не удалось открыть книгу");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [access, jobId]);

  useEffect(() => {
    if (isLoading || access || isPendingReturn || isPaid || !sample || previewPages.length === 0 || !previewProgress?.chapterEndPages?.length) {
      setShowPaywallLock(false);
      return undefined;
    }

    const sentinels = [...chapterBreakRefs.current.entries()]
      .map(([chapter, element]) => ({ chapter, element }))
      .filter((entry): entry is { chapter: number; element: HTMLDivElement } => Boolean(entry.element));
    if (!sentinels.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => ({
            chapter: Number((entry.target as HTMLElement).dataset.chapter || 0),
            top: entry.boundingClientRect.top,
          }))
          .filter((entry) => entry.chapter > 0)
          .sort((a, b) => Math.abs(a.top) - Math.abs(b.top));

        if (!visible.length) return;

        const chapter = visible[0].chapter;
        if (chapter === 1 && !revisionPromptDismissed) {
          setPaywallStage("revision");
          setPaywallCollapsed(false);
          setShowPaywallLock(true);
        }

        if (chapter === 3 && !purchasePromptDismissed) {
          setPaywallStage("purchase");
          setPaywallCollapsed(false);
          setShowPaywallLock(true);
        }
      },
      { root: null, threshold: 0, rootMargin: "-18% 0px -42% 0px" },
    );

    sentinels.forEach(({ element }) => observer.observe(element));
    return () => {
      observer.disconnect();
    };
  }, [access, isLoading, isPaid, isPendingReturn, previewPages.length, previewProgress?.chapterEndPages, purchasePromptDismissed, revisionPromptDismissed, sample]);

  useEffect(() => {
    if (isLoading || access || isPendingReturn || isPaid || previewPages.length === 0) {
      setCurrentPreviewPage(1);
      return undefined;
    }

    const pageElements = previewPageRefs.current.filter(Boolean) as HTMLDivElement[];
    if (pageElements.length === 0) return undefined;

    let frameId = 0;
    const updateCurrentPage = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const viewportCenter = window.innerHeight / 2;
        let closestPage = 1;
        let closestDistance = Number.POSITIVE_INFINITY;

        for (const element of pageElements) {
          const pageNumber = Number(element.dataset.pageNumber || 0);
          const rect = element.getBoundingClientRect();
          const pageCenter = rect.top + rect.height / 2;
          const distance = Math.abs(pageCenter - viewportCenter);
          if (pageNumber > 0 && distance < closestDistance) {
            closestDistance = distance;
            closestPage = pageNumber;
          }
        }

        setCurrentPreviewPage(closestPage);
      });
    };

    const observer = new IntersectionObserver(updateCurrentPage, {
      root: null,
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });
    pageElements.forEach((element) => observer.observe(element));
    window.addEventListener("scroll", updateCurrentPage, { passive: true });
    window.addEventListener("resize", updateCurrentPage);
    updateCurrentPage();

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("scroll", updateCurrentPage);
      window.removeEventListener("resize", updateCurrentPage);
    };
  }, [access, isLoading, isPaid, isPendingReturn, previewPages.length]);

  useEffect(() => {
    if (!jobId || !isPendingReturn || access) return undefined;
    let cancelled = false;
    const intervalId = window.setInterval(async () => {
      try {
        const response = await fetch(`${STATUS_ENDPOINT_BASE_URL}/${jobId}`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) return;
        if (!cancelled) {
          setStatus(payload);
          if (payload.paid || payload.payment?.status === "paid") {
            window.clearInterval(intervalId);
          }
        }
      } catch {
        // Keep polling quietly; payment webhooks can lag behind the redirect.
      }
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [access, isPendingReturn, jobId]);

  const handleResend = async () => {
    setMessage("");
    setError("");
    try {
      const response = await fetch(`${STATUS_ENDPOINT_BASE_URL}/${jobId}/resend-link`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Не удалось отправить письмо");
      setMessage("Письмо со ссылкой отправлено повторно. Проверьте почту.");
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : "Не удалось отправить письмо");
    }
  };

  const chapters = (fullText?.text?.chapters || []).sort((a, b) => Number(a.n || 0) - Number(b.n || 0));
  const sampleChapters = sample?.chapters || [];
  const availablePages = previewProgress?.availablePages || previewPages.length;
  const totalPages = previewProgress?.totalPages || 42;
  const openFragmentPercent = totalPages > 0 ? Math.min(100, (availablePages / totalPages) * 100) : 0;
  const previewReadRatio = availablePages > 1
    ? (currentPreviewPage - 1) / (availablePages - 1)
    : 0;
  const previewScrollPercent = Math.max(0, Math.min(100, Math.round(previewReadRatio * openFragmentPercent)));
  const chapterBreaksByPage = useMemo(() => {
    const breaks = new Map<number, PreviewChapterBreak>();
    (previewProgress?.chapterEndPages || []).forEach((breakpoint) => {
      if (Number.isFinite(breakpoint.page) && Number.isFinite(breakpoint.chapter)) {
        breaks.set(Number(breakpoint.page), {
          chapter: Number(breakpoint.chapter),
          page: Number(breakpoint.page),
        });
      }
    });
    return breaks;
  }, [previewProgress]);
  const loadedPreviewPageNumbers = useMemo(() => {
    const pages = new Set<number>();
    const activePage = Math.max(1, currentPreviewPage || 1);
    const firstPage = Math.max(1, activePage - PREVIEW_PAGE_PRELOAD_BEFORE);
    const lastPage = Math.min(availablePages || previewPages.length, activePage + PREVIEW_PAGE_PRELOAD_AFTER);

    for (let pageNumber = firstPage; pageNumber <= lastPage; pageNumber += 1) {
      pages.add(pageNumber);
    }
    for (let pageNumber = 1; pageNumber <= Math.min(3, previewPages.length); pageNumber += 1) {
      pages.add(pageNumber);
    }

    return pages;
  }, [availablePages, currentPreviewPage, previewPages.length]);
  const scrollPreviewBy = (deltaY: number) => {
    if (!Number.isFinite(deltaY) || Math.abs(deltaY) < 1) return;
    const documentElement = document.documentElement;
    const body = document.body;
    const scrollTarget = body.scrollHeight > documentElement.scrollHeight
      ? body
      : (document.scrollingElement || documentElement);
    scrollTarget.scrollTop += deltaY;
  };
  const handlePaywallWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!showPaywallLock || Math.abs(event.deltaY) < 1) return;
    scrollPreviewBy(event.deltaY);
  };
  const handlePaywallTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    paywallTouchYRef.current = event.touches[0]?.clientY ?? null;
  };
  const handlePaywallTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const previousY = paywallTouchYRef.current;
    const nextY = event.touches[0]?.clientY ?? null;
    if (previousY === null || nextY === null) return;
    const deltaY = previousY - nextY;
    if (Math.abs(deltaY) < 1) return;
    scrollPreviewBy(deltaY);
    paywallTouchYRef.current = nextY;
  };
  const handlePaywallTouchEnd = () => {
    paywallTouchYRef.current = null;
  };
  const openSiteChat = () => {
    window.dispatchEvent(new Event("fairyteller:open-chat"));
  };
  const closePaywallPrompt = () => {
    if (paywallStage === "revision") {
      setRevisionPromptDismissed(true);
    } else {
      setPurchasePromptDismissed(true);
    }
    setPaywallCollapsed(true);
  };

  if (!isLoading && !access && !isPendingReturn && !isPaid && sample) {
    return (
      <main className="book-pdf-paywall min-h-screen bg-[#fffaf0] text-black">
        <style>{`
          .book-pdf-paywall {
            position: relative;
            background: #fffaf0;
          }
          .book-preview-pages {
            display: grid;
            gap: 14px;
            justify-items: center;
            padding: 18px 18px 150px;
            background: #fffaf0;
          }
          .book-preview-header {
            position: sticky;
            top: 0;
            z-index: 15;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            width: 100%;
            padding: 14px 18px 12px;
            background: rgba(255, 250, 240, .92);
            border-bottom: 1px solid rgba(17, 17, 17, .08);
            backdrop-filter: blur(10px);
          }
          .book-preview-header img {
            width: auto;
            height: 38px;
            object-fit: contain;
          }
          .book-preview-header span {
            color: #5e6264;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: .16em;
            line-height: 1.2;
            text-align: right;
            text-transform: uppercase;
          }
          .book-preview-progress {
            position: fixed;
            left: 18px;
            bottom: 18px;
            z-index: 12;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 7px;
            border: 1px solid rgba(17, 17, 17, .14);
            border-radius: 999px;
            background: rgba(255, 250, 240, .88);
            box-shadow: 0 8px 22px rgba(17, 17, 17, .08);
            padding: 10px 8px;
            backdrop-filter: blur(10px);
          }
          .book-preview-progress-percent {
            color: #111111;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: .02em;
            line-height: 1.25;
          }
          .book-preview-progress-track {
            position: relative;
            width: 7px;
            height: 78px;
            overflow: hidden;
            border-radius: 999px;
            background: rgba(17, 17, 17, .12);
          }
          .book-preview-progress-fill {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            display: block;
            width: 100%;
            border-radius: inherit;
            background: #e89c31;
          }
          .book-preview-page-shell {
            position: relative;
            width: min(100%, 640px);
            aspect-ratio: 1 / 1;
            background: #ffffff;
            border: 1px solid rgba(17, 17, 17, .08);
            contain: layout paint;
            content-visibility: auto;
            contain-intrinsic-size: 640px 640px;
            box-shadow:
              0 1px 2px rgba(17, 17, 17, .08),
              0 10px 28px rgba(17, 17, 17, .16),
              0 32px 64px rgba(17, 17, 17, .10);
          }
          .book-preview-page-slot {
            display: grid;
            justify-items: center;
            width: 100%;
          }
          .book-preview-page {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: contain;
            background: #ffffff;
          }
          .book-preview-page-placeholder {
            display: grid;
            width: 100%;
            height: 100%;
            place-items: center;
            background:
              linear-gradient(135deg, rgba(17, 17, 17, .035), rgba(255, 255, 255, 0) 42%),
              #ffffff;
            color: rgba(17, 17, 17, .42);
            font-size: 12px;
            font-weight: 900;
            letter-spacing: .08em;
            text-transform: uppercase;
          }
          .book-paywall-sentinel {
            width: 1px;
            height: 1px;
          }
          .book-preview-empty {
            display: grid;
            min-height: 70vh;
            place-items: center;
            color: #3f4447;
            font-size: 18px;
            font-weight: 800;
            text-align: center;
          }
          .book-paywall-lock {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 20;
            display: grid;
            place-items: center;
            padding: 78px 18px 28px;
            background: linear-gradient(to bottom, rgba(255,250,240,0), rgba(255,250,240,.96) 38%, #fffaf0 100%);
            opacity: 0;
            pointer-events: none;
            transform: translateY(22px);
            transition: opacity .2s ease, transform .2s ease;
          }
          .book-paywall-lock.is-visible {
            opacity: 1;
            pointer-events: none;
            transform: translateY(0);
          }
          .book-paywall-lock-card {
            position: relative;
            display: grid;
            gap: 13px;
            width: min(100%, 620px);
            border: 2px solid #111111;
            border-radius: 10px;
            background: #fffaf0;
            box-shadow: 8px 8px 0 #111111;
            padding: clamp(20px, 3vw, 30px);
            text-align: center;
            pointer-events: none;
            touch-action: pan-y;
          }
          .book-paywall-close {
            position: absolute;
            top: 10px;
            right: 10px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border: 2px solid #111111;
            border-radius: 999px;
            background: #ffffff;
            color: #111111;
            cursor: pointer;
            font-size: 22px;
            font-weight: 900;
            line-height: 1;
            pointer-events: auto;
          }
          .book-paywall-lock-card h1 {
            margin: 0;
            color: #111111;
            font-size: clamp(24px, 3.8vw, 40px);
            font-weight: 950;
            line-height: 1;
            text-transform: uppercase;
          }
          .book-paywall-lock-card p {
            margin: 0;
            color: #3f4447;
            font-size: 16px;
            font-weight: 700;
            line-height: 1.5;
          }
          .book-paywall-primary-cta {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            min-height: 58px;
            border: 2px solid #111111;
            border-radius: 8px;
            background: #111111;
            color: #ffffff;
            box-shadow: 6px 6px 0 #e89c31;
            padding: 16px 18px;
            font-size: 13px;
            font-weight: 950;
            letter-spacing: .08em;
            line-height: 1.25;
            text-transform: uppercase;
            transition: background .15s ease, box-shadow .15s ease, transform .15s ease;
            pointer-events: auto;
          }
          .book-paywall-primary-cta::after {
            content: "";
            position: absolute;
            top: 9px;
            right: 9px;
            width: 11px;
            height: 11px;
            border: 1px solid #111111;
            border-radius: 999px;
            background: #e89c31;
            animation: book-pay-cta-pulse 2.4s ease-in-out infinite;
          }
          .book-paywall-primary-cta:hover {
            background: #5e6264;
            box-shadow: 3px 3px 0 #e89c31;
            transform: translate(3px, 3px);
          }
          .book-paywall-contact-actions {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
          }
          .book-paywall-contact-actions a,
          .book-paywall-contact-actions button {
            display: inline-flex;
            min-height: 44px;
            align-items: center;
            justify-content: center;
            border: 2px solid #111111;
            border-radius: 8px;
            background: #ffffff;
            color: #111111;
            cursor: pointer;
            font: inherit;
            font-size: 11px;
            font-weight: 900;
            letter-spacing: .03em;
            line-height: 1.2;
            padding: 9px 8px;
            text-align: center;
            text-decoration: none;
            pointer-events: auto;
          }
          .book-paywall-contact-actions a:hover,
          .book-paywall-contact-actions button:hover {
            background: #fae7e1;
          }
          @keyframes book-pay-cta-pulse {
            0%, 100% {
              transform: scale(.82);
              opacity: .72;
            }
            50% {
              transform: scale(1.12);
              opacity: 1;
            }
          }
          .book-paywall-lock-card small {
            color: #5e6264;
            font-size: 12px;
            font-weight: 800;
            line-height: 1.45;
          }
          .book-paywall-strip {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            width: min(100%, 720px);
            border: 2px solid #111111;
            border-radius: 10px 10px 0 0;
            background: #111111;
            color: #ffffff;
            cursor: pointer;
            font: inherit;
            box-shadow: 0 -6px 22px rgba(17, 17, 17, .16);
            padding: 14px 16px;
            pointer-events: auto;
            text-align: left;
            touch-action: pan-y;
          }
          .book-paywall-strip span {
            color: inherit;
            font-weight: 950;
            letter-spacing: .06em;
            text-transform: uppercase;
          }
          .book-paywall-strip span:last-child {
            color: #e89c31;
            text-decoration: none;
            white-space: nowrap;
          }
          @media (max-width: 760px) {
            .book-preview-pages {
              gap: 12px;
              padding: 12px 8px 150px;
            }
            .book-preview-header {
              padding: 11px 10px 10px;
            }
            .book-preview-header img {
              height: 32px;
            }
            .book-preview-progress {
              left: 10px;
              bottom: 10px;
              padding: 8px 7px;
            }
            .book-preview-progress-track {
              height: 62px;
            }
            .book-preview-page-shell {
              width: min(100%, 620px);
              contain-intrinsic-size: 360px 360px;
            }
            .book-paywall-lock {
              padding: 58px 12px 22px;
            }
            .book-paywall-lock-card {
              gap: 10px;
              padding: 18px 16px 20px;
            }
            .book-paywall-lock-card h1 {
              font-size: 24px;
            }
            .book-paywall-lock-card p {
              font-size: 14px;
              line-height: 1.42;
            }
            .book-paywall-primary-cta {
              min-height: 52px;
              padding: 14px 16px;
              font-size: 12px;
            }
            .book-paywall-contact-actions {
              grid-template-columns: 1fr;
            }
            .book-paywall-strip {
              align-items: flex-start;
              flex-direction: column;
            }
          }
        `}</style>
        <header className="book-preview-header">
          <Link to="/" aria-label="Fairyteller">
            <img src={logoImage} alt="Fairyteller" />
          </Link>
          <span>Предпросмотр книги</span>
        </header>
        <div className="book-preview-pages" aria-label="Бесплатный фрагмент PDF-книги">
          <div className="book-preview-progress" aria-label={`Страница ${currentPreviewPage} из ${availablePages} бесплатного фрагмента`}>
            <span className="book-preview-progress-percent">{previewScrollPercent}%</span>
            <div className="book-preview-progress-track" aria-hidden="true">
              <span className="book-preview-progress-fill" style={{ height: `${previewScrollPercent}%` }} />
            </div>
          </div>
          {previewPages.length > 0 ? previewPages.map((page, index) => (
            <div key={`${page.n}-${page.url}`} className="book-preview-page-slot">
              <div
                ref={(element) => { previewPageRefs.current[index] = element; }}
                className="book-preview-page-shell"
                data-page-number={page.n}
              >
                {loadedPreviewPageNumbers.has(page.n) ? (
                  <img
                    className="book-preview-page"
                    src={page.url}
                    alt={`Страница ${page.n}`}
                    loading={index < 2 ? "eager" : "lazy"}
                    decoding="async"
                  />
                ) : (
                  <div className="book-preview-page-placeholder" aria-label={`Страница ${page.n}`}>
                    Страница {page.n}
                  </div>
                )}
              </div>
              {chapterBreaksByPage.has(page.n) && (
                <div
                  ref={(element) => {
                    const chapter = chapterBreaksByPage.get(page.n)?.chapter;
                    if (!chapter) return;
                    if (element) chapterBreakRefs.current.set(chapter, element);
                    else chapterBreakRefs.current.delete(chapter);
                  }}
                  className="book-paywall-sentinel"
                  data-chapter={chapterBreaksByPage.get(page.n)?.chapter}
                  aria-hidden="true"
                />
              )}
            </div>
          )) : (
            <div className="book-preview-empty">Готовим PDF-превью...</div>
          )}
        </div>
        <div
          className={`book-paywall-lock${showPaywallLock ? " is-visible" : ""}`}
          aria-label="Оплата полной книги"
          onWheelCapture={handlePaywallWheel}
          onTouchStartCapture={handlePaywallTouchStart}
          onTouchMoveCapture={handlePaywallTouchMove}
          onTouchEndCapture={handlePaywallTouchEnd}
          onTouchCancelCapture={handlePaywallTouchEnd}
        >
          {paywallCollapsed ? (
            <button type="button" className="book-paywall-strip" onClick={() => setPaywallCollapsed(false)}>
              <span>{paywallStage === "revision" ? "Хотите внести правки?" : "Почти готово"}</span>
              <span>{paywallStage === "revision" ? "Написать нам" : "Оплатить — 3 500 ₽"}</span>
            </button>
          ) : (
            <div className="book-paywall-lock-card">
              <button
                type="button"
                className="book-paywall-close"
                aria-label="Свернуть оплату"
                onClick={closePaywallPrompt}
              >
                ×
              </button>
              {paywallStage === "revision" ? (
                <>
                  <MessageCircle size={22} aria-hidden="true" className="mx-auto" />
                  <h1>Хотите внести правки?</h1>
                  <p>Вам нравится история, но в сюжете есть неточность? Или хочется изменить иллюстрации? Напишите нам — внесём необходимые правки.</p>
                  <div className="book-paywall-contact-actions">
                    <a href="https://wa.me/79851939841" target="_blank" rel="noopener noreferrer">WhatsApp</a>
                    <a href="https://t.me/nikita0shch" target="_blank" rel="noopener noreferrer">Telegram</a>
                    <button type="button" onClick={openSiteChat}>Написать в чате</button>
                  </div>
                  <small>Продолжайте читать — вся история уже готова.</small>
                </>
              ) : (
                <>
                  <Lock size={22} aria-hidden="true" className="mx-auto" />
                  <h1>Нравится история?</h1>
                  <p>Перед вами — драфт будущей книги. Оплатите заказ, и мы свяжемся с вами, чтобы уточнить правки в тексте и иллюстрациях и отправить макет в печать.</p>
                  <a className="book-paywall-primary-cta" href={payUrl} onClick={() => trackCheckoutStart(jobId)}>
                    <ShoppingBag size={18} aria-hidden="true" />
                    Оплатить — 3 500 ₽
                  </a>
                  <small>Мы обязательно согласуем с вами финальную версию.</small>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] px-5 py-8 text-black md:px-8 md:py-10">
      <div className="mx-auto mb-8 flex max-w-[920px] items-center justify-between gap-4">
        <Link to="/" aria-label="Fairyteller">
          <img src={logoImage} alt="Fairyteller" className="h-11 w-auto object-contain" />
        </Link>
        <span className="text-right text-[10px] font-black uppercase tracking-[0.16em] text-[#5e6264]">
          Полная книга
        </span>
      </div>

      <section className="mx-auto max-w-[920px] border-2 border-black bg-white px-5 py-8 shadow-[10px_10px_0_#111] md:px-12 md:py-12">
        {isLoading ? (
          <div className="py-16 text-center">
            <p className="text-[13px] font-black uppercase tracking-[0.18em] text-[#5e6264]">Открываем книгу</p>
          </div>
        ) : access && fullText ? (
          <>
            <p className="text-[13px] font-black uppercase tracking-[0.18em] text-[#5e6264]">Книга открыта</p>
            <h1 className="mt-4 text-[38px] font-black uppercase leading-none md:text-[64px]">{bookTitle}</h1>
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-7 inline-flex min-h-[54px] items-center justify-center gap-2 border-2 border-black bg-[#E89C31] px-6 py-3 text-[13px] font-black uppercase tracking-[0.08em] text-black transition hover:bg-black hover:text-white"
              >
                <ShoppingBag className="h-5 w-5" />
                Скачать PDF
              </a>
            )}
            <div className="mt-10 grid gap-8">
              {chapters.map((chapter, index) => (
                <article key={`${chapter.n || index}-${chapter.title || ""}`} className="border-t-2 border-black pt-8">
                  <span className="text-[12px] font-black uppercase tracking-[0.16em] text-[#5e6264]">
                    Глава {chapter.n || index + 1}
                  </span>
                  <h2 className="mt-3 text-[28px] font-black uppercase leading-tight md:text-[42px]">{chapter.title}</h2>
                  <div className="mt-5 max-w-[720px]">
                    {splitParagraphs(chapterText(chapter)).map((paragraph, paragraphIndex) => (
                      <p key={paragraphIndex} className="mb-5 text-[18px] leading-8 text-[#33383b]">{paragraph}</p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : !access && !isPendingReturn && !isPaid && sample ? (
          <div className="book-paywall-reader">
            <style>{`
              .book-paywall-reader {
                display: grid;
                gap: 22px;
              }
              .book-paywall-spread {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 16px;
                align-items: stretch;
              }
              .book-paywall-page {
                min-height: 520px;
                border: 1px solid #111;
                background: #fff;
                box-shadow: 8px 8px 0 #111;
                padding: clamp(24px, 4vw, 46px);
                overflow: hidden;
              }
              .book-paywall-page h1,
              .book-paywall-page h2,
              .book-paywall-page h3 {
                margin: 0;
                color: #111;
                font-weight: 950;
                letter-spacing: 0;
                text-transform: uppercase;
              }
              .book-paywall-title-page {
                display: grid;
                place-items: center;
                text-align: center;
              }
              .book-paywall-title-page h1 {
                color: #e89c31;
                font-size: clamp(42px, 7vw, 76px);
                line-height: .95;
              }
              .book-paywall-title-page p {
                max-width: 560px;
                margin: 22px auto 0;
                color: #5e6264;
                font-size: 18px;
                line-height: 1.6;
              }
              .book-paywall-page-label {
                display: inline-block;
                margin-bottom: 18px;
                color: #5e6264;
                font-size: 11px;
                font-weight: 900;
                letter-spacing: .16em;
                text-transform: uppercase;
              }
              .book-paywall-page h2,
              .book-paywall-page h3 {
                font-size: clamp(24px, 3.4vw, 38px);
                line-height: 1.05;
              }
              .book-paywall-page p {
                margin: 16px 0 0;
                color: #33383b;
                font-size: 17px;
                line-height: 1.72;
              }
              .book-paywall-image-page {
                padding: 0;
                background: #f7efe2;
              }
              .book-paywall-image-page img {
                display: block;
                width: 100%;
                height: 100%;
                min-height: 520px;
                object-fit: cover;
              }
              .book-paywall-blur {
                position: relative;
                max-height: 250px;
                overflow: hidden;
                filter: blur(.9px);
              }
              .book-paywall-blur::after {
                content: "";
                position: absolute;
                inset: 25% 0 0;
                background: linear-gradient(to bottom, rgba(255,255,255,0), #fff 70%);
              }
              .book-paywall-cta {
                display: grid;
                gap: 14px;
                justify-items: center;
                margin: -46px auto 0;
                width: min(100%, 620px);
                border: 2px solid #111;
                background: #fae7e1;
                box-shadow: 8px 8px 0 #111;
                padding: clamp(22px, 4vw, 34px);
                position: relative;
                z-index: 2;
                text-align: center;
              }
              .book-paywall-cta h3 {
                margin: 0;
                font-size: clamp(24px, 4vw, 38px);
                font-weight: 950;
                line-height: 1;
                text-transform: uppercase;
              }
              .book-paywall-cta p {
                margin: 0;
                color: #3f4447;
                font-size: 17px;
                line-height: 1.55;
              }
              .book-paywall-cta a {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                width: 100%;
                min-height: 58px;
                border: 2px solid #111;
                border-radius: 8px;
                background: #111;
                color: #fff;
                box-shadow: 6px 6px 0 #e89c31;
                padding: 16px 18px;
                font-size: 13px;
                font-weight: 950;
                letter-spacing: .08em;
                line-height: 1.25;
                text-transform: uppercase;
              }
              .book-paywall-cta small {
                color: #5e6264;
                font-size: 13px;
                font-weight: 800;
                line-height: 1.45;
              }
              @media (max-width: 760px) {
                .book-paywall-spread {
                  grid-template-columns: 1fr;
                }
                .book-paywall-page,
                .book-paywall-image-page img {
                  min-height: auto;
                }
              }
            `}</style>
            <div className="book-paywall-page book-paywall-title-page">
              <div>
                <span className="book-paywall-page-label">Бесплатный фрагмент</span>
                <h1>{sample.title || bookTitle}</h1>
                {sample.summary && <p>{sample.summary}</p>}
              </div>
            </div>

            <div className="book-paywall-spread">
              {sampleChapters.map((chapter, index) => (
                <article key={`${chapter.n || index}-${chapter.title || ""}`} className="book-paywall-page">
                  <span className="book-paywall-page-label">Глава {chapter.n || index + 1}</span>
                  <h2>{chapter.title}</h2>
                  {splitParagraphs(chapterText(chapter)).map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex}>{paragraph}</p>
                  ))}
                </article>
              ))}

            </div>

            {sample.lockedChapter && (
              <>
                <div className="book-paywall-spread">
                  <article className="book-paywall-page">
                    <span className="book-paywall-page-label">Глава {sample.lockedChapter.n || 3}</span>
                    <h3>{sample.lockedChapter.title}</h3>
                    <div className="book-paywall-blur">
                      {splitParagraphs(chapterText(sample.lockedChapter)).map((paragraph, paragraphIndex) => (
                        <p key={paragraphIndex}>{paragraph}</p>
                      ))}
                      <p>Дальше герои уже входят в самый важный поворот истории, но полный текст открыт только после оплаты.</p>
                    </div>
                  </article>
                  {sample.lockedChapter.imageUrl && (
                    <article className="book-paywall-page book-paywall-image-page">
                      <img src={sample.lockedChapter.imageUrl} alt="" loading="lazy" />
                    </article>
                  )}
                </div>
                <div className="book-paywall-cta">
                  <Lock size={22} aria-hidden="true" />
                    <h3>Остальные 3 главы уже написаны</h3>
                    <p>Вы уже видите стиль, героев и начало сюжета. После оплаты откроем полную книгу и подготовим печатную версию.</p>
                    <a href={payUrl} onClick={() => trackCheckoutStart(jobId)}>
                      <ShoppingBag size={18} aria-hidden="true" />
                      Перейти к оплате и доставке — 3 500 ₽
                    </a>
                    <small>Если сказка совсем не попала в ожидания — бесплатно пересоберем один раз или вернем оплату до печати.</small>
                </div>
              </>
            )}
          </div>
        ) : isPendingReturn ? (
          <div className="py-10 text-center">
            <Check className="mx-auto h-10 w-10" />
            <h1 className="mt-5 text-[36px] font-black uppercase leading-none md:text-[56px]">Подтверждаем оплату</h1>
            <p className="mx-auto mt-5 max-w-[560px] text-[18px] leading-8 text-[#5e6264]">
              Обычно это занимает несколько секунд. Как только ЮKassa подтвердит платеж, мы отправим письмо со ссылкой на всю сказку.
            </p>
            {isPaid && (
              <p className="mt-6 border-2 border-black bg-[#fae7e1] p-5 text-[16px] font-black">
                Оплата подтверждена. Проверьте почту — ссылка уже отправляется.
              </p>
            )}
          </div>
        ) : isPaid ? (
          <div className="py-10 text-center">
            <Mail className="mx-auto h-10 w-10" />
            <h1 className="mt-5 text-[36px] font-black uppercase leading-none md:text-[56px]">Книга оплачена</h1>
            <p className="mx-auto mt-5 max-w-[560px] text-[18px] leading-8 text-[#5e6264]">
              Мы отправили magic-link на email из заказа. Если письмо потерялось, отправим ссылку повторно.
            </p>
            <button
              type="button"
              onClick={handleResend}
              className="mt-7 min-h-[54px] border-2 border-black bg-black px-6 py-3 text-[13px] font-black uppercase tracking-[0.08em] text-white transition hover:bg-[#5e6264]"
            >
              Отправить письмо повторно
            </button>
          </div>
        ) : (
          <div className="py-10 text-center">
            <h1 className="text-[36px] font-black uppercase leading-none md:text-[56px]">Ссылка недействительна</h1>
            <p className="mx-auto mt-5 max-w-[560px] text-[18px] leading-8 text-[#5e6264]">
              Проверьте ссылку из письма или напишите нам — поможем открыть книгу.
            </p>
          </div>
        )}

        {message && <p className="mt-6 border-2 border-black bg-[#dcfce7] p-4 text-[15px] font-bold text-[#14532d]">{message}</p>}
        {error && <p className="mt-6 border-2 border-black bg-[#fee2e2] p-4 text-[15px] font-bold text-[#8f1d1d]">{error}</p>}
      </section>
    </main>
  );
};

export default Book;
