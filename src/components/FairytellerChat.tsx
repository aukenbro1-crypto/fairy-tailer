import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Send, X } from "lucide-react";
import "./FairytellerChat.css";

const CHAT_API_BASE = import.meta.env.VITE_FAIRYTELLER_CHAT_BASE_URL || "/api/fairyteller/chat";
const SESSION_STORAGE_KEY = "fairyteller-chat-session-v1";
const MESSAGES_STORAGE_KEY = "fairyteller-chat-messages-v1";

type ChatMessage = {
  id: string;
  role: "visitor" | "operator";
  text: string;
  createdAt: string;
};

type ChatResponse = {
  ok: boolean;
  sessionId: string;
  messages: ChatMessage[];
};

function readStoredSession() {
  try {
    return window.localStorage.getItem(SESSION_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function readStoredMessages() {
  try {
    const raw = window.localStorage.getItem(MESSAGES_STORAGE_KEY);
    return raw ? JSON.parse(raw) as ChatMessage[] : [];
  } catch {
    return [];
  }
}

function storeSession(sessionId: string) {
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  } catch {
    // Local storage is optional for the chat experience.
  }
}

function storeMessages(messages: ChatMessage[]) {
  try {
    window.localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages.slice(-80)));
  } catch {
    // Local storage is optional for the chat experience.
  }
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export default function FairytellerChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(() => readStoredSession());
  const [messages, setMessages] = useState<ChatMessage[]>(() => readStoredMessages());
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const isAdminPage = typeof window !== "undefined" && window.location.pathname.startsWith("/blog-admin");

  const applyServerChat = useCallback((data: ChatResponse) => {
    if (data.sessionId) {
      setSessionId(data.sessionId);
      storeSession(data.sessionId);
    }
    if (Array.isArray(data.messages)) {
      setMessages(data.messages);
      storeMessages(data.messages);
    }
  }, []);

  const refreshMessages = useCallback(async () => {
    if (!sessionId) return;
    const response = await fetch(`${CHAT_API_BASE}/sessions/${encodeURIComponent(sessionId)}/messages`, {
      cache: "no-store",
    });
    if (!response.ok) return;
    applyServerChat(await response.json() as ChatResponse);
  }, [applyServerChat, sessionId]);

  useEffect(() => {
    if (!isOpen || !sessionId) return;
    void refreshMessages();
    const timer = window.setInterval(() => {
      void refreshMessages();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [isOpen, refreshMessages, sessionId]);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [isOpen, messages]);

  const sendMessage = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || status === "sending") return;

    const optimisticMessage: ChatMessage = {
      id: `local_${Date.now()}`,
      role: "visitor",
      text,
      createdAt: new Date().toISOString(),
    };
    setDraft("");
    setStatus("sending");
    setMessages((current) => {
      const next = [...current, optimisticMessage];
      storeMessages(next);
      return next;
    });

    try {
      const response = await fetch(`${CHAT_API_BASE}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId || undefined,
          message: text,
          pageUrl: window.location.href,
        }),
      });
      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.status}`);
      }
      applyServerChat(await response.json() as ChatResponse);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  const handleDraftKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  if (isAdminPage) return null;

  return (
    <div className="ft-chat">
      {isOpen && (
        <section className="ft-chat__panel" aria-label="Чат поддержки FairyTeller">
          <header className="ft-chat__header">
            <div>
              <span className="ft-chat__badge">Живая помощь</span>
              <strong>FairyTeller</strong>
              <span>Задайте вопрос, мы ответим здесь</span>
            </div>
            <button
              className="ft-chat__icon-button"
              type="button"
              aria-label="Закрыть чат"
              title="Закрыть чат"
              onClick={() => setIsOpen(false)}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <div className="ft-chat__messages" aria-live="polite">
            {messages.length === 0 ? (
              <div className="ft-chat__empty">
                <BookOpen size={28} aria-hidden="true" />
                <strong>Книжная мастерская на связи</strong>
                <span>Напишите, если нужна помощь с заказом, подарком или готовой книгой.</span>
              </div>
            ) : (
              messages.map((message) => (
                <div className={`ft-chat__message ft-chat__message--${message.role}`} key={message.id}>
                  <div className="ft-chat__bubble">
                    <p>{message.text}</p>
                    <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="ft-chat__form" onSubmit={sendMessage}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleDraftKeyDown}
              maxLength={2000}
              rows={2}
              placeholder="Ваш вопрос..."
              aria-label="Сообщение"
            />
            <button className="ft-chat__send" type="submit" disabled={!draft.trim() || status === "sending"} aria-label="Отправить">
              <Send size={18} aria-hidden="true" />
            </button>
          </form>
          {status === "error" && (
            <div className="ft-chat__status">Не получилось отправить. Проверьте интернет и попробуйте ещё раз.</div>
          )}
        </section>
      )}

      {!isOpen && (
        <button
          className="ft-chat__launcher"
          type="button"
          aria-label="Открыть чат"
          title="Открыть чат"
          onClick={() => setIsOpen(true)}
        >
          <BookOpen size={25} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
