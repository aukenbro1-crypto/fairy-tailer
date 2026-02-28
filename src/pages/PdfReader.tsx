import { useState, useCallback, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Home, ExternalLink, Upload, Link2, FileWarning, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import * as pdfjsLib from "pdfjs-dist";

// Set worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

type Mode = "url" | "file";

async function extractTextFromPdf(source: string | ArrayBuffer): Promise<string[]> {
  const loadingTask = pdfjsLib.getDocument(
    typeof source === "string" ? { url: source } : { data: source }
  );
  const pdf = await loadingTask.promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => item.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push(text);
  }
  return pages;
}

const PdfReader = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("url");
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [fileError, setFileError] = useState("");
  const [pdfSrc, setPdfSrc] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const objectUrlRef = useRef<string | null>(null);
  const fileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => revokeObjectUrl();
  }, [revokeObjectUrl]);

  const handleOpenUrl = () => {
    setUrlError("");
    const trimmed = urlInput.trim();
    if (!trimmed) { setUrlError("Похоже, это невалидная ссылка."); return; }
    if (!trimmed.startsWith("https://")) { setUrlError("Нужна ссылка формата https://"); return; }
    try { new URL(trimmed); } catch { setUrlError("Похоже, это невалидная ссылка."); return; }
    revokeObjectUrl();
    fileRef.current = null;
    setPdfSrc(trimmed);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setFileError("Нужен PDF файл.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setFileError("Файл слишком большой. Максимум 50MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    revokeObjectUrl();
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    fileRef.current = file;
    setPdfSrc(url);
  };

  const switchMode = (newMode: Mode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setUrlError("");
    setFileError("");
    setExtractError("");
    revokeObjectUrl();
    setPdfSrc(null);
    setUrlInput("");
    fileRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExtractAndView = async () => {
    if (!pdfSrc) return;
    setExtracting(true);
    setExtractError("");
    try {
      let pages: string[];
      if (fileRef.current) {
        const buffer = await fileRef.current.arrayBuffer();
        pages = await extractTextFromPdf(buffer);
      } else {
        pages = await extractTextFromPdf(pdfSrc);
      }

      if (pages.every((p) => !p.trim())) {
        setExtractError("Не удалось извлечь текст. Возможно, PDF содержит только изображения.");
        setExtracting(false);
        return;
      }

      // Filter out empty pages and create title from first non-empty page
      const nonEmptyPages = pages.filter((p) => p.trim());
      const title = nonEmptyPages[0]?.substring(0, 80) || "Без названия";

      // First page = title, rest = content pages
      const allPages = [title, ...nonEmptyPages];

      const { data, error } = await supabase
        .from("pdf_documents")
        .insert({ title, pages: allPages })
        .select("id")
        .single();

      if (error) {
        setExtractError("Ошибка сохранения: " + error.message);
        setExtracting(false);
        return;
      }

      navigate(`/pdf-reader/view/${data.id}`);
    } catch (err: any) {
      setExtractError("Ошибка извлечения текста: " + (err?.message || "неизвестная ошибка"));
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: "#f5f0e8",
        color: "#3a2e1e",
        fontFamily: "'Georgia', 'Times New Roman', serif",
      }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 py-3"
        style={{
          background: "rgba(245, 240, 232, 0.95)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(58, 46, 30, 0.1)",
        }}
      >
        <Link
          to="/"
          className="flex items-center gap-2 text-sm opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: "#3a2e1e" }}
        >
          <Home size={16} />
          <span>На главную</span>
        </Link>
        <span className="text-sm font-medium" style={{ color: "#3a2e1e", opacity: 0.7 }}>
          PDF ридер
        </span>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1
          className="text-2xl md:text-3xl font-bold text-center mb-2"
          style={{ color: "#3a2e1e", fontFamily: "'Georgia', serif" }}
        >
          PDF ридер
        </h1>
        <p className="text-center text-sm mb-8" style={{ color: "#3a2e1e", opacity: 0.6 }}>
          Вставь ссылку или загрузи файл — открою PDF прямо здесь
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 justify-center">
          {([
            { key: "url" as Mode, label: "По ссылке", icon: Link2 },
            { key: "file" as Mode, label: "Загрузить файл", icon: Upload },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => switchMode(key)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200"
              style={{
                background: mode === key ? "#3a2e1e" : "transparent",
                color: mode === key ? "#f5f0e8" : "#3a2e1e",
                border: `1.5px solid ${mode === key ? "#3a2e1e" : "rgba(58,46,30,0.25)"}`,
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* URL mode */}
        {mode === "url" && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); setUrlError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleOpenUrl()}
                placeholder="Вставь ссылку на PDF (https://…)"
                className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: "rgba(58, 46, 30, 0.06)",
                  border: `1.5px solid ${urlError ? "#c0392b" : "rgba(58, 46, 30, 0.15)"}`,
                  color: "#3a2e1e",
                  fontFamily: "inherit",
                }}
              />
              <button
                onClick={handleOpenUrl}
                className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:opacity-90 active:scale-95"
                style={{ background: "#3a2e1e", color: "#f5f0e8" }}
              >
                Открыть
              </button>
            </div>
            {urlError && (
              <p className="text-xs flex items-center gap-1.5" style={{ color: "#c0392b" }}>
                <FileWarning size={13} /> {urlError}
              </p>
            )}
          </div>
        )}

        {/* File mode */}
        {mode === "file" && (
          <div className="flex flex-col gap-3">
            <label
              className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl cursor-pointer transition-all duration-200 hover:opacity-80"
              style={{
                background: "rgba(58, 46, 30, 0.06)",
                border: "1.5px dashed rgba(58, 46, 30, 0.25)",
              }}
            >
              <Upload size={18} style={{ opacity: 0.5 }} />
              <span className="text-sm" style={{ opacity: 0.7 }}>
                Выбери PDF файл (до 50MB)
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {fileError && (
              <p className="text-xs flex items-center gap-1.5" style={{ color: "#c0392b" }}>
                <FileWarning size={13} /> {fileError}
              </p>
            )}
          </div>
        )}

        {/* Actions when PDF is loaded */}
        {pdfSrc && (
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={handleExtractAndView}
              disabled={extracting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-50"
              style={{ background: "#8b3a0f", color: "#f5f0e8" }}
            >
              {extracting ? <Loader2 size={15} className="animate-spin" /> : null}
              {extracting ? "Извлекаю текст…" : "📖 Читать как книгу"}
            </button>
            <a
              href={pdfSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
              style={{ color: "#3a2e1e", opacity: 0.5 }}
            >
              Открыть в новой вкладке <ExternalLink size={12} />
            </a>
          </div>
        )}

        {extractError && (
          <p className="text-xs flex items-center gap-1.5 mt-3" style={{ color: "#c0392b" }}>
            <FileWarning size={13} /> {extractError}
          </p>
        )}

        {/* Viewer */}
        <div
          className="mt-6 rounded-2xl overflow-hidden"
          style={{
            border: "1px solid rgba(58, 46, 30, 0.12)",
            boxShadow: "0 4px 24px rgba(58, 46, 30, 0.08)",
            background: "#fff",
            minHeight: pdfSrc ? "75vh" : "200px",
          }}
        >
          {pdfSrc ? (
            <iframe
              src={pdfSrc}
              title="PDF Viewer"
              className="w-full border-0"
              style={{ height: "75vh" }}
            />
          ) : (
            <div
              className="flex flex-col items-center justify-center gap-3 py-16 px-4"
              style={{ color: "#3a2e1e", opacity: 0.35 }}
            >
              <FileWarning size={36} />
              <p className="text-sm text-center max-w-xs">
                Выбери PDF: вставь ссылку или загрузи файл — и он появится здесь.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PdfReader;
