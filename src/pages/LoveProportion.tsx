import { useState, useRef, useEffect, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Branch = "love" | "no_plan";
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface Proportions {
  atomic: number;
  ether: number;
  metals: number;
  cosmic: number;
}

interface FormState {
  name: string;
  photoUrl: string | null;
  isInLove: boolean | null;
  wantsLove: boolean | null;
  activity: string;
  proportions: Proportions;
  branch: Branch | null;
}

interface ChatMessage {
  id: string;
  role: "cupid" | "user";
  text: string;
  type?: "text" | "photo";
}

interface WebhookResult {
  story_id?: string;
  story_title?: string;
  story_text?: string;
  images?: string[];
}

// ─── Communicating Vessels ───────────────────────────────────────────────────

const VESSEL_KEYS = ["atomic", "ether", "metals", "cosmic"] as const;
const VESSEL_LABELS = ["Атомный взрыв", "Эфир", "Тяжёлые металлы", "Космическая бесконечность"];
const VESSEL_COLORS = [
  "rgba(180,160,230,0.25)", // lavender
  "rgba(140,200,240,0.22)", // sky
  "rgba(140,140,150,0.22)", // graphite
  "rgba(140,230,200,0.22)", // mint
];
const VESSEL_BORDER_COLORS = [
  "rgba(160,120,210,0.3)",
  "rgba(100,170,220,0.3)",
  "rgba(120,120,135,0.3)",
  "rgba(100,210,175,0.3)",
];

// Vessel relationship rules:
// atomic ↑  →  ether ↓,  metals ↑,  cosmic = buffer
// ether  ↑  →  atomic ↓, metals ↑,  cosmic = buffer
// cosmic ↑  →  equalizes the other three
// metals     →  blended proportional across others

const METALS_COUPLING = 0.35; // how much metals rises per unit of atomic/ether rise
const OPPONENT_SHARE  = 0.65; // share of outflow that goes to the direct opponent (ether↔atomic)

function clampInt(v: number) { return Math.max(0, Math.min(100, Math.round(v))); }

function fixRounding(next: Proportions, candidates: (keyof Proportions)[]) {
  const total = VESSEL_KEYS.reduce((s, k) => s + next[k], 0);
  if (total !== 100) {
    const largest = candidates.reduce((a, b) => (next[a] >= next[b] ? a : b));
    next[largest] = Math.max(0, next[largest] + (100 - total));
  }
}

function distributeChange(
  proportions: Proportions,
  key: keyof Proportions,
  newVal: number
): Proportions {
  const clamped = clampInt(newVal);
  if (clamped === proportions[key]) return proportions;

  const delta = clamped - proportions[key]; // + = rising
  const next: Proportions = { ...proportions, [key]: clamped };

  if (key === "cosmic") {
    // Equalize the other three
    const remaining = 100 - clamped;
    const base = Math.floor(remaining / 3);
    const extra = remaining - base * 3;
    const sorted = (["atomic", "ether", "metals"] as (keyof Proportions)[])
      .sort((a, b) => proportions[a] - proportions[b]);
    sorted.forEach((k, i) => { next[k] = Math.max(0, base + (i === 0 ? extra : 0)); });

  } else if (key === "atomic" || key === "ether") {
    const opponent: keyof Proportions = key === "atomic" ? "ether" : "atomic";

    // 1. Metals moves in the SAME direction as the dragged vessel
    next.metals = clampInt(proportions.metals + delta * METALS_COUPLING);
    const actualMetalsDelta = next.metals - proportions.metals;

    // 2. Total to absorb by opponent + cosmic
    const outflow = delta + actualMetalsDelta; // positive = they must lose

    // 3. Opponent bears the bigger share, cosmic absorbs the rest
    const opponentHit = Math.round(outflow * OPPONENT_SHARE);
    const cosmicHit   = outflow - opponentHit;

    next[opponent] = clampInt(proportions[opponent] - opponentHit);
    const actualOpponentDelta = next[opponent] - proportions[opponent];

    // Cosmic takes whatever is left to keep total = 100
    const cosmicActual = -(delta + actualMetalsDelta + actualOpponentDelta);
    next.cosmic = clampInt(proportions.cosmic + cosmicActual);

  } else {
    // Metals dragged: blended proportional across others
    const others = VESSEL_KEYS.filter((k) => k !== key) as (keyof Proportions)[];
    const remaining = 100 - clamped;
    const prevTotal = others.reduce((s, k) => s + proportions[k], 0);
    let assigned = 0;
    others.forEach((k, i) => {
      if (i < others.length - 1) {
        const propShare = prevTotal > 0 ? (proportions[k] / prevTotal) * remaining : remaining / others.length;
        const equalShare = remaining / others.length;
        next[k] = Math.max(0, Math.round(propShare * 0.6 + equalShare * 0.4));
        assigned += next[k];
      } else {
        next[k] = Math.max(0, remaining - assigned);
      }
    });
  }

  fixRounding(next, VESSEL_KEYS.filter((k) => k !== key));
  return next;
}


interface VesselsProps {
  proportions: Proportions;
  onChange: (p: Proportions) => void;
}

function CommunicatingVessels({ proportions, onChange }: VesselsProps) {
  const dragRef = useRef<{
    key: keyof Proportions;
    startY: number;
    startVal: number;
    containerHeight: number;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, key: keyof Proportions, containerEl: HTMLElement) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        key,
        startY: e.clientY,
        startVal: proportions[key],
        containerHeight: containerEl.clientHeight,
      };
    },
    [proportions]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const { key, startY, startVal, containerHeight } = dragRef.current;
      const dy = startY - e.clientY; // drag up = increase
      const delta = (dy / containerHeight) * 100;
      onChange(distributeChange(proportions, key, startVal + delta));
    },
    [proportions, onChange]
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  return (
    <div
      className="lp-vessels"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {VESSEL_KEYS.map((key, i) => {
        const pct = proportions[key];
        const col = VESSEL_COLORS[i];
        const bdr = VESSEL_BORDER_COLORS[i];
        return (
          <div key={key} className="lp-vessel-col">
            <div
              className="lp-vessel-tube"
              style={{ border: `1px solid ${bdr}` }}
              ref={(el) => {
                if (el) {
                  (el as HTMLElement & { __vesselEl?: HTMLElement }).__vesselEl = el;
                }
              }}
            >
              {/* liquid fill */}
              <div
                className="lp-vessel-liquid"
                style={{
                  height: `${pct}%`,
                  background: col,
                  borderTop: `1px solid ${bdr}`,
                }}
              />
              {/* pct label floating near surface */}
              <div
                className="lp-vessel-pct"
                style={{ bottom: `calc(${pct}% + 4px)` }}
              >
                {pct}%
              </div>
              {/* drag handle */}
              <div
                className="lp-vessel-handle"
                style={{ bottom: `calc(${pct}% - 8px)`, borderColor: bdr }}
                onPointerDown={(e) => {
                  const tube = e.currentTarget.closest(".lp-vessel-tube") as HTMLElement;
                  onPointerDown(e, key, tube);
                }}
              />
            </div>
            <p className="lp-vessel-label">{VESSEL_LABELS[i]}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Pill / Quick Reply ──────────────────────────────────────────────────────

function Pill({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="lp-pill" onClick={onClick}>
      {label}
    </button>
  );
}

// ─── Chat Bubble ─────────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: ChatMessage }) {
  return (
    <div className={`lp-bubble-row lp-bubble-row--${msg.role}`}>
      {msg.role === "cupid" && (
        <div className="lp-avatar">💘</div>
      )}
      <div className={`lp-bubble lp-bubble--${msg.role}`}>
        {msg.text}
      </div>
    </div>
  );
}

// ─── Text Input Step ─────────────────────────────────────────────────────────

function TextInputStep({
  placeholder,
  onSubmit,
}: {
  placeholder: string;
  onSubmit: (val: string) => void;
}) {
  const [val, setVal] = useState("");
  return (
    <div className="lp-text-input-row">
      <input
        className="lp-text-input"
        placeholder={placeholder}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && val.trim()) onSubmit(val.trim());
        }}
        autoFocus
      />
      <button
        className="lp-ok-btn"
        disabled={!val.trim()}
        onClick={() => val.trim() && onSubmit(val.trim())}
      >
        Ок
      </button>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function LoveProportion() {
  const [step, setStep] = useState<Step>(1);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "init", role: "cupid", text: "Как тебя зовут?" },
  ]);
  const [form, setForm] = useState<FormState>({
    name: "",
    photoUrl: null,
    isInLove: null,
    wantsLove: null,
    activity: "",
    proportions: { atomic: 25, ether: 25, metals: 25, cosmic: 25 },
    branch: null,
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(50);
  const [result, setResult] = useState<WebhookResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [rawResponseText, setRawResponseText] = useState<string | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, step]);

  function addMsg(msg: Omit<ChatMessage, "id">) {
    setMessages((prev) => [
      ...prev,
      { ...msg, id: `${Date.now()}-${Math.random()}` },
    ]);
  }

  function goStep(nextStep: Step, cupidText?: string) {
    setStep(nextStep);
    if (cupidText) {
      setTimeout(() => addMsg({ role: "cupid", text: cupidText }), 300);
    }
  }

  // ── Step handlers ──

  function handleName(name: string) {
    setForm((f) => ({ ...f, name }));
    addMsg({ role: "user", text: name });
    goStep(2, "Хочешь добавить фото? (необязательно)");
  }

  function handlePhotoChoice(choice: "add" | "skip") {
    if (choice === "skip") {
      addMsg({ role: "user", text: "Пропустить" });
      goStep(3, "Ты влюблён(а)?");
    } else {
      addMsg({ role: "user", text: "Добавить фото" });
      fileInputRef.current?.click();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoPreview(ev.target?.result as string);
      // photo_url = null since no storage backend; preview only
      setForm((f) => ({ ...f, photoUrl: null }));
      addMsg({ role: "user", text: "📷 Фото добавлено" });
      goStep(3, "Ты влюблён(а)?");
    };
    reader.readAsDataURL(file);
  }

  function handleInLove(choice: boolean) {
    addMsg({ role: "user", text: choice ? "Да" : "Нет" });
    if (choice) {
      setForm((f) => ({ ...f, isInLove: true, wantsLove: true, branch: "love" }));
      goStep(5, "Смешай пропорции. Всего 100%.");
    } else {
      setForm((f) => ({ ...f, isInLove: false }));
      goStep(4, "А хотелось бы?");
    }
  }

  function handleWantsLove(choice: boolean) {
    addMsg({ role: "user", text: choice ? "Да" : "Нет" });
    setForm((f) => ({
      ...f,
      wantsLove: choice,
      branch: choice ? "love" : "no_plan",
    }));
    if (choice) {
      goStep(5, "Смешай пропорции. Всего 100%.");
    } else {
      goStep(6, "Тогда скажи: чем ты занимаешься?");
    }
  }

  function handleProportionsDone() {
    const { atomic, ether, metals, cosmic } = form.proportions;
    const labels = [
      `Атомный ${atomic}%`,
      `Эфир ${ether}%`,
      `Металлы ${metals}%`,
      `Космос ${cosmic}%`,
    ];
    addMsg({ role: "user", text: labels.join(" · ") });
    goStep(7, "И последнее: чем ты занимаешься?");
  }

  function handleActivity(activity: string) {
    setForm((f) => ({ ...f, activity }));
    addMsg({ role: "user", text: activity });
    goStep(8, "Готово. В Путь?");
  }

  // ── CTA enabled check ──

  const isReady =
    form.name.trim() !== "" &&
    form.activity.trim() !== "" &&
    (form.branch === "no_plan" ||
      VESSEL_KEYS.reduce((s, k) => s + form.proportions[k], 0) === 100);

  // ── Webhook ──

  function stopCountdown() {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }

  async function sendToWebhook() {
    setLoading(true);
    setError(false);
    setResult(null);
    setShowResult(false);
    setDebugInfo(null);
    setRawResponseText(null);
    setResponseStatus(null);
    setCountdown(50);

    // Start countdown 50 → 1
    stopCountdown();
    countdownRef.current = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 1 : c - 1));
    }, 1000);

    const payload = {
      source: "loveproportion_exhibition",
      name: form.name,
      photo_url: form.photoUrl,
      isInLove: form.isInLove ?? false,
      wantsLove: form.wantsLove ?? false,
      activity: form.activity,
      proportions: form.proportions,
    };

    try {
      const res = await fetch(
        "https://hook.eu2.make.com/xvafun9ng5sknbt6mrot0azs46p65rdr",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const raw = await res.text();
      console.log("LoveProportion: status", res.status, "raw", raw.slice(0, 300));
      setRawResponseText(raw);
      setResponseStatus(res.status);

      if (!res.ok) throw new Error(`Bad status ${res.status}`);

      let storyTitle = "Пропорции любви";
      let storyText = "";
      let images: string[] = [];

      try {
        const parsed = JSON.parse(raw);
        // Extract only the fields we need, ignoring ok/story_id/etc.
        storyTitle = parsed.story_title || parsed.title || storyTitle;
        storyText = parsed.story_text || parsed.text || "";
        images = Array.isArray(parsed.images) ? parsed.images : [];
      } catch {
        console.warn("LoveProportion: not JSON, using raw as story_text");
        storyText = raw;
      }

      console.log("LoveProportion: storyTitle:", storyTitle, "storyText length:", storyText.length);
      stopCountdown();

      if (!storyText.trim()) {
        // No story text found — treat as error with debug
        setDebugInfo("Response received but story_text is empty or missing");
        setError(true);
      } else {
        setResult({ story_title: storyTitle, story_text: storyText, images });
        setShowResult(true);
      }
      setLoading(false);
    } catch (err) {
      console.error("LoveProportion: webhook error:", err);
      setDebugInfo(String(err));
      stopCountdown();
      setError(true);
      setLoading(false);
    }
  }

  useEffect(() => {
    return () => stopCountdown();
  }, []);

  function handleCopy() {
    if (!result?.story_text) return;
    navigator.clipboard.writeText(result.story_text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleReset() {
    setResult(null);
    setShowResult(false);
    setError(false);
    setDebugInfo(null);
    setRawResponseText(null);
    setResponseStatus(null);
  }

  // ── Chapter parsing ──
  function parseChapters(text: string) {
    // Clean markdown symbols
    const clean = text.replace(/\*{1,3}/g, '');
    // Split by chapter headings: "Глава N" with optional markdown prefix
    const chapterRegex = /^(?:#{1,4}\s*)?((Глава\s+\d+[^:\n]*)(?::?\s*(.*))?)/im;
    const lines = clean.split('\n');
    const sections: { heading: string; body: string }[] = [];
    let currentHeading = '';
    let currentBody: string[] = [];

    for (const line of lines) {
      const match = line.match(/^(?:#{1,4}\s*)?(Глава\s+\d+[^]*?)$/i);
      if (match) {
        // Save previous section
        if (currentHeading || currentBody.length > 0) {
          sections.push({ heading: currentHeading, body: currentBody.join('\n').trim() });
        }
        currentHeading = match[1].replace(/^#+\s*/, '').trim();
        currentBody = [];
      } else {
        currentBody.push(line);
      }
    }
    // Push last section
    if (currentHeading || currentBody.length > 0) {
      sections.push({ heading: currentHeading, body: currentBody.join('\n').trim() });
    }
    return sections;
  }

  function renderParagraphs(text: string) {
    if (!text) return null;
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    if (paragraphs.length <= 1) {
      // Single block — split by single newlines
      const lines = text.split('\n').filter(l => l.trim());
      return lines.map((line, i) => <p key={i} className="lp-story-p">{line.trim()}</p>);
    }
    return paragraphs.map((p, i) => <p key={i} className="lp-story-p">{p.trim()}</p>);
  }

  // ── Render ──

  return (
    <>
      <style>{LP_STYLES}</style>
      {/* Countdown overlay */}
      {loading && (
        <div className="lp-countdown-overlay">
          <div className="lp-countdown-number">{countdown}</div>
          <p className="lp-countdown-subtitle">Купидон смешивает ингредиенты…</p>
        </div>
      )}

      <div className="lp-root">
        {/* Background glow blobs */}
        <div className="lp-blob lp-blob--tl" />
        <div className="lp-blob lp-blob--tr" />
        <div className="lp-blob lp-blob--bc" />

        <div className="lp-container">
          {/* Show story result when available */}
          {showResult && result?.story_text ? (
            <div className="lp-story-result" lang="ru">
              <h1 className="lp-story-title">
                {result.story_title || "Пропорции любви"}
              </h1>

              {(() => {
                const sections = parseChapters(result.story_text!);
                const hasChapters = sections.some(s => s.heading);
                if (hasChapters) {
                  return sections.map((sec, i) => (
                    <div key={i} className="lp-chapter">
                      {sec.heading && (
                        <h2 className="lp-chapter-heading">{sec.heading}</h2>
                      )}
                      <div className="lp-chapter-body">{renderParagraphs(sec.body)}</div>
                    </div>
                  ));
                }
                return <div className="lp-chapter-body">{renderParagraphs(result.story_text!)}</div>;
              })()}

              {result.images && result.images.length > 0 && (
                <div className="lp-story-images">
                  {result.images.map((url, i) => (
                    <img key={i} src={url} alt={`Иллюстрация ${i + 1}`} className="lp-story-img" />
                  ))}
                </div>
              )}

              <div className="lp-story-actions">
                <button className="lp-copy-btn" onClick={handleCopy}>
                  {copied ? "Скопировано ✓" : "Скопировать текст"}
                </button>
                <button className="lp-again-link" onClick={handleReset}>
                  Сгенерировать ещё
                </button>
              </div>
            </div>
          ) : (showResult || error) && debugInfo ? (
            /* Debug block: only shown when story_text is missing or error */
            <div style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
              <p style={{ fontWeight: 600, color: "#c00", marginBottom: 12 }}>Не удалось получить историю</p>
              <details style={{ fontFamily: "monospace", fontSize: 13, color: "#666", wordBreak: "break-all", marginBottom: 16 }}>
                <summary style={{ cursor: "pointer", marginBottom: 8 }}>Показать отладочную информацию</summary>
                <p><strong>Статус:</strong> {responseStatus ?? "—"}</p>
                <p><strong>Ошибка:</strong> {debugInfo}</p>
                {rawResponseText && (
                  <p><strong>Ответ (первые 300 символов):</strong> {rawResponseText.slice(0, 300)}</p>
                )}
              </details>
              <button className="lp-retry-btn" onClick={handleReset}>Назад</button>
            </div>
          ) : (
            <>
              {/* Hero */}
              <header className="lp-hero">
                <p className="lp-hero-eyebrow">✦</p>
                <h1 className="lp-hero-title">Пропорции любви</h1>
                <p className="lp-hero-subtitle">
                  Купидон смешивает ингредиенты и готов запустить стрелу
                </p>
                <p className="lp-hero-helper">
                  История появится сразу на экране.
                </p>
              </header>

              {/* Chat card */}
              <div className="lp-chat-card">
                <div className="lp-chat-messages">
                  {messages.map((m) => (
                    <Bubble key={m.id} msg={m} />
                  ))}

                  {step === 1 && (
                    <TextInputStep placeholder="Имя" onSubmit={handleName} />
                  )}

                  {step === 2 && (
                    <div className="lp-pills-row">
                      <Pill label="Добавить фото" onClick={() => handlePhotoChoice("add")} />
                      <Pill label="Пропустить" onClick={() => handlePhotoChoice("skip")} />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="lp-hidden-file"
                        onChange={handleFileChange}
                      />
                    </div>
                  )}

                  {photoPreview && step > 2 && (
                    <div className="lp-photo-preview">
                      <img src={photoPreview} alt="Твоё фото" />
                    </div>
                  )}

                  {step === 3 && (
                    <div className="lp-pills-row">
                      <Pill label="Да" onClick={() => handleInLove(true)} />
                      <Pill label="Нет" onClick={() => handleInLove(false)} />
                    </div>
                  )}

                  {step === 4 && (
                    <div className="lp-pills-row">
                      <Pill label="Да" onClick={() => handleWantsLove(true)} />
                      <Pill label="Нет" onClick={() => handleWantsLove(false)} />
                    </div>
                  )}

                  {step === 5 && (
                    <div className="lp-vessels-wrapper">
                      <CommunicatingVessels
                        proportions={form.proportions}
                        onChange={(p) => setForm((f) => ({ ...f, proportions: p }))}
                      />
                      <p className="lp-vessels-hint">
                        Перелей одну часть — остальное перераспределится само.
                      </p>
                      <button
                        className="lp-ok-btn lp-ok-btn--full"
                        onClick={handleProportionsDone}
                      >
                        Готово
                      </button>
                    </div>
                  )}

                  {(step === 6 || step === 7) && (
                    <TextInputStep
                      placeholder="Например: дизайнер, предприниматель, редактор…"
                      onSubmit={handleActivity}
                    />
                  )}

                  {step === 8 && (
                    <p className="lp-step8-hint">
                      {form.name} · {form.branch === "love" ? `Влюблён(а)` : "Свободен(а)"} · {form.activity}
                      {form.photoUrl || photoFile ? " · 📷" : ""}
                    </p>
                  )}

                  {error && (
                    <div className="lp-bubble-row lp-bubble-row--cupid">
                      <div className="lp-avatar">💘</div>
                      <div className="lp-bubble lp-bubble--cupid">
                        Похоже, во Вселенной помехи. Попробуем ещё раз?
                      </div>
                    </div>
                  )}
                  {error && debugInfo && (
                    <p style={{ fontSize: 11, color: "#999", padding: "0 16px", fontFamily: "monospace", wordBreak: "break-all" }}>
                      Debug: {debugInfo}
                    </p>
                  )}
                  {error && (
                    <button className="lp-retry-btn" onClick={sendToWebhook}>
                      Попробовать ещё раз
                    </button>
                  )}

                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Spacer for sticky CTA */}
              <div style={{ height: 96 }} />
            </>
          )}
        </div>

        {/* Sticky CTA */}
        {!showResult && !result && (
          <div className="lp-sticky-cta">
            <button
              className="lp-cta-btn"
              disabled={!isReady || loading || step < 8}
              onClick={sendToWebhook}
            >
              {loading ? (
                <span className="lp-loading-inner">
                  <span className="lp-spinner" />
                  Купидон смешивает ингредиенты…
                </span>
              ) : (
                "в Путь!"
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Scoped Styles ───────────────────────────────────────────────────────────

const LP_STYLES = `
/* Reset scope */
.lp-root {
  min-height: 100vh;
  background: #ffffff;
  color: #111111;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  position: relative;
  overflow-x: hidden;
}

/* Blobs */
.lp-blob {
  position: fixed;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}
.lp-blob--tl {
  width: 560px; height: 560px;
  top: -140px; left: -140px;
  background: radial-gradient(circle, #B8D9FF 0%, #D9BBFF 50%, #FFD6F0 100%);
  filter: blur(80px);
  opacity: 0.45;
  animation: lp-drift-tl 12s ease-in-out infinite alternate;
}
.lp-blob--tr {
  width: 480px; height: 480px;
  top: -80px; right: -120px;
  background: radial-gradient(circle, #C8EDFF 0%, #FFE4FB 50%, #D0F5FF 100%);
  filter: blur(75px);
  opacity: 0.42;
  animation: lp-drift-tr 15s ease-in-out infinite alternate;
}
.lp-blob--bc {
  width: 580px; height: 460px;
  bottom: -140px; left: 50%;
  transform: translateX(-50%);
  background: radial-gradient(circle, #C2F0E8 0%, #B8E0FF 45%, #E8D5FF 100%);
  filter: blur(80px);
  opacity: 0.40;
  animation: lp-drift-bc 18s ease-in-out infinite alternate;
}

@keyframes lp-drift-tl {
  from { transform: translate(0, 0) scale(1); }
  to   { transform: translate(30px, 20px) scale(1.08); }
}
@keyframes lp-drift-tr {
  from { transform: translate(0, 0) scale(1); }
  to   { transform: translate(-25px, 25px) scale(1.06); }
}
@keyframes lp-drift-bc {
  from { transform: translateX(-50%) scale(1); }
  to   { transform: translateX(calc(-50% + 20px)) scale(1.07); }
}

/* Container */
.lp-container {
  position: relative;
  z-index: 1;
  max-width: 420px;
  margin: 0 auto;
  padding: 0 16px 24px;
}

/* Hero */
.lp-hero {
  text-align: center;
  padding: 52px 0 28px;
}
.lp-hero-eyebrow {
  font-size: 20px;
  color: rgba(111,111,200,0.6);
  margin-bottom: 12px;
  letter-spacing: 4px;
}
.lp-hero-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin: 0 0 10px;
  line-height: 1.2;
  background: linear-gradient(
    90deg,
    #5BB8F5 0%,
    #A78BFA 18%,
    #F472B6 34%,
    #34D399 50%,
    #60A5FA 66%,
    #C084FC 82%,
    #5BB8F5 100%
  );
  background-size: 280% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: lp-siri-flow 14s linear infinite;
}

@keyframes lp-siri-flow {
  0%   { background-position: 0% 50%; }
  100% { background-position: 280% 50%; }
}
.lp-hero-subtitle {
  font-size: 15px;
  color: rgba(17,17,17,0.65);
  line-height: 1.55;
  margin: 0 0 8px;
}
.lp-hero-helper {
  font-size: 12px;
  color: rgba(17,17,17,0.4);
  margin: 0;
}

/* Chat card */
.lp-chat-card {
  background: #ffffff;
  border: 1px solid rgba(17,17,17,0.08);
  border-radius: 24px;
  box-shadow: 0 2px 20px rgba(0,0,0,0.05), 0 0 0 0 transparent;
  padding: 20px 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.lp-chat-messages {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Bubbles */
.lp-bubble-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  animation: lp-fade-in 0.3s ease-out both;
}
.lp-bubble-row--cupid { justify-content: flex-start; }
.lp-bubble-row--user  { justify-content: flex-end; flex-direction: row-reverse; }

@keyframes lp-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.lp-avatar {
  width: 28px; height: 28px;
  background: rgba(17,17,17,0.04);
  border: 1px solid rgba(17,17,17,0.08);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}
.lp-bubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.55;
}
.lp-bubble--cupid {
  background: #ffffff;
  border: 1px solid rgba(17,17,17,0.1);
  border-bottom-left-radius: 4px;
  color: #111111;
}
.lp-bubble--user {
  background: rgba(17,17,17,0.04);
  border: 1px solid rgba(17,17,17,0.06);
  border-bottom-right-radius: 4px;
  color: #111111;
}

/* Pills */
.lp-pills-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-left: 36px;
  animation: lp-fade-in 0.3s ease-out both;
}
.lp-pill {
  padding: 8px 18px;
  border-radius: 100px;
  border: 1px solid rgba(91,184,245,0.35);
  background: rgba(255,255,255,0.85);
  color: #111111;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.15s, box-shadow 0.2s;
  animation: lp-pill-breathe 3.2s ease-in-out infinite;
  backdrop-filter: blur(4px);
}
.lp-pill:nth-child(2) {
  animation-delay: 0.4s;
}
.lp-pill:nth-child(3) {
  animation-delay: 0.8s;
}
.lp-pill:hover {
  background: rgba(91,184,245,0.1);
  border-color: rgba(91,184,245,0.65);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(91,184,245,0.3);
  animation: none;
}

@keyframes lp-pill-breathe {
  0%   { box-shadow: 0 0 0px rgba(91,184,245,0); border-color: rgba(91,184,245,0.25); }
  50%  { box-shadow: 0 0 14px rgba(91,184,245,0.35), 0 0 4px rgba(168,218,255,0.3); border-color: rgba(91,184,245,0.55); }
  100% { box-shadow: 0 0 0px rgba(91,184,245,0); border-color: rgba(91,184,245,0.25); }
}

/* Text input */
.lp-text-input-row {
  display: flex;
  gap: 8px;
  padding-left: 36px;
  animation: lp-fade-in 0.3s ease-out both;
}
.lp-text-input {
  flex: 1;
  height: 40px;
  border: 1px solid rgba(17,17,17,0.12);
  border-radius: 12px;
  padding: 0 14px;
  font-size: 14px;
  color: #111111;
  background: #ffffff;
  outline: none;
  transition: border-color 0.15s;
}
.lp-text-input:focus { border-color: rgba(17,17,17,0.35); }
.lp-text-input::placeholder { color: rgba(17,17,17,0.3); }

.lp-ok-btn {
  height: 40px;
  padding: 0 18px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #5BB8F5 0%, #7EC8F7 100%);
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.15s, transform 0.15s;
  box-shadow: 0 2px 12px rgba(91,184,245,0.35);
}
.lp-ok-btn:hover { opacity: 0.88; transform: translateY(-1px); }
.lp-ok-btn:disabled { opacity: 0.3; cursor: default; transform: none; }
.lp-ok-btn--full {
  width: 100%;
  margin-top: 16px;
  height: 44px;
  border-radius: 14px;
}

/* Hidden file input */
.lp-hidden-file { display: none; }

/* Photo preview */
.lp-photo-preview {
  padding-left: 36px;
  animation: lp-fade-in 0.3s ease-out both;
}
.lp-photo-preview img {
  width: 80px; height: 80px;
  object-fit: cover;
  border-radius: 14px;
  border: 1px solid rgba(17,17,17,0.08);
}

/* Vessels wrapper */
.lp-vessels-wrapper {
  padding-left: 0;
  animation: lp-fade-in 0.4s ease-out both;
}
.lp-vessels-hint {
  font-size: 12px;
  color: rgba(17,17,17,0.4);
  text-align: center;
  margin: 10px 0 0;
}

/* Communicating Vessels */
.lp-vessels {
  display: flex;
  gap: 8px;
  align-items: stretch;
  height: 160px;
  user-select: none;
}
.lp-vessel-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.lp-vessel-tube {
  flex: 1;
  width: 100%;
  border-radius: 12px;
  background: rgba(17,17,17,0.03);
  position: relative;
  overflow: visible;
  cursor: ns-resize;
  touch-action: none;
}
.lp-vessel-liquid {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  border-radius: 0 0 11px 11px;
  transition: height 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.lp-vessel-pct {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: 600;
  color: rgba(17,17,17,0.5);
  transition: bottom 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  white-space: nowrap;
  pointer-events: none;
}
.lp-vessel-handle {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 24px; height: 16px;
  background: #ffffff;
  border: 1px solid;
  border-radius: 8px;
  cursor: ns-resize;
  z-index: 2;
  touch-action: none;
  transition: bottom 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.lp-vessel-label {
  font-size: 9px;
  color: rgba(17,17,17,0.4);
  text-align: center;
  line-height: 1.3;
  max-width: 100%;
}

/* Step 8 hint */
.lp-step8-hint {
  font-size: 12px;
  color: rgba(17,17,17,0.4);
  text-align: center;
  padding: 4px 0;
  animation: lp-fade-in 0.3s ease-out both;
}

/* Error / retry */
.lp-retry-btn {
  margin-left: 36px;
  padding: 8px 18px;
  border-radius: 100px;
  border: 1px solid rgba(17,17,17,0.15);
  background: transparent;
  font-size: 13px;
  cursor: pointer;
  color: #111111;
  animation: lp-fade-in 0.3s ease-out both;
}
.lp-retry-btn:hover { background: rgba(17,17,17,0.04); }

/* Sticky CTA */
.lp-sticky-cta {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  z-index: 100;
  padding: 12px 24px env(safe-area-inset-bottom, 12px);
  background: linear-gradient(to top, rgba(255,255,255,1) 60%, rgba(255,255,255,0));
}
.lp-cta-btn {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  display: block;
  height: 52px;
  border-radius: 18px;
  border: none;
  background: linear-gradient(135deg, #5BB8F5 0%, #7EC8F7 60%, #A8DAFF 100%);
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 0.3px;
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
  box-shadow: 0 4px 20px rgba(91,184,245,0.45);
}
.lp-cta-btn:not(:disabled):hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 6px 28px rgba(91,184,245,0.55);
}
.lp-cta-btn:disabled {
  opacity: 0.25;
  cursor: default;
}

.lp-loading-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.lp-spinner {
  width: 18px; height: 18px;
  border: 2px solid rgba(255,255,255,0.35);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: lp-spin 0.8s linear infinite;
}
@keyframes lp-spin {
  to { transform: rotate(360deg); }
}

/* Result */
.lp-result {
  margin-top: 28px;
  background: #ffffff;
  border: 1px solid rgba(17,17,17,0.08);
  border-radius: 24px;
  padding: 24px 20px;
  box-shadow: 0 2px 20px rgba(0,0,0,0.04);
  animation: lp-fade-in 0.5s ease-out both;
}
.lp-result-title {
  font-size: 20px;
  font-weight: 600;
  color: #111111;
  margin: 0 0 16px;
  letter-spacing: -0.3px;
}
.lp-result-text {
  font-size: 14px;
  line-height: 1.65;
  color: rgba(17,17,17,0.8);
  white-space: pre-wrap;
  margin-bottom: 20px;
}
.lp-result-gallery {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}
.lp-result-img {
  width: 100%;
  border-radius: 20px;
  border: 1px solid rgba(17,17,17,0.08);
  object-fit: cover;
  max-height: 260px;
}
.lp-result-img-placeholder {
  width: 100%;
  height: 160px;
  border-radius: 20px;
  border: 1px solid rgba(17,17,17,0.08);
  background: rgba(17,17,17,0.03);
  display: flex;
  align-items: center;
  justify-content: center;
}
.lp-result-img-placeholder span {
  font-size: 12px;
  color: rgba(17,17,17,0.3);
  text-align: center;
  padding: 0 16px;
}
.lp-result-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}
.lp-copy-btn {
  width: 100%;
  height: 44px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #5BB8F5 0%, #7EC8F7 100%);
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;
  box-shadow: 0 2px 12px rgba(91,184,245,0.3);
}
.lp-copy-btn:hover { opacity: 0.88; transform: translateY(-1px); }
.lp-again-link {
  background: none;
  border: none;
  font-size: 13px;
  color: rgba(17,17,17,0.4);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.lp-again-link:hover { color: rgba(17,17,17,0.7); }

/* Countdown overlay */
.lp-countdown-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.lp-countdown-number {
  font-size: 96px;
  font-weight: 200;
  color: #111111;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: -2px;
}
.lp-countdown-subtitle {
  font-size: 15px;
  color: rgba(17,17,17,0.45);
  font-weight: 400;
}

/* Story result */
.lp-story-result {
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 24px 60px;
  animation: lp-fade-in 0.6s ease-out both;
}
@media (max-width: 480px) {
  .lp-story-result { padding: 36px 20px 48px; }
}
.lp-story-title {
  font-size: 34px;
  font-weight: 500;
  color: #111111;
  margin: 0 0 36px;
  line-height: 1.25;
  letter-spacing: -0.5px;
  text-align: center;
}
@media (max-width: 480px) {
  .lp-story-title { font-size: 28px; margin-bottom: 28px; }
}

/* Chapters */
.lp-chapter {
  margin-bottom: 8px;
}
.lp-chapter-heading {
  font-size: 18px;
  font-weight: 600;
  color: #111111;
  margin: 32px 0 6px;
  padding-bottom: 8px;
  letter-spacing: 0.3px;
  border-bottom: 1px solid rgba(17,17,17,0.08);
}
@media (max-width: 480px) {
  .lp-chapter-heading { font-size: 16px; margin-top: 28px; }
}

/* Body paragraphs */
.lp-chapter-body {
  margin-bottom: 4px;
}
.lp-story-p {
  font-size: 18px;
  line-height: 1.75;
  color: #222222;
  text-align: justify;
  hyphens: auto;
  -webkit-hyphens: auto;
  text-justify: inter-word;
  margin: 0 0 16px;
}
@media (max-width: 480px) {
  .lp-story-p { font-size: 17px; line-height: 1.7; margin-bottom: 14px; }
}

.lp-story-images {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 32px 0;
}
.lp-story-img {
  width: 100%;
  border-radius: 16px;
  object-fit: cover;
}
.lp-story-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  margin-top: 36px;
}
`;
