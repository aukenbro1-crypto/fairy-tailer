import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Home, ExternalLink, Upload, Link2, FileWarning } from "lucide-react";

type Mode = "url" | "file";

const PdfReader = () => {
  const [mode, setMode] = useState<Mode>("url");
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [fileError, setFileError] = useState("");
  const [pdfSrc, setPdfSrc] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
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
    if (!trimmed) {
      setUrlError("Похоже, это невалидная ссылка.");
      return;
    }
    if (!trimmed.startsWith("https://")) {
      setUrlError("Нужна ссылка формата https://");
      return;
    }
    try {
      new URL(trimmed);
    } catch {
      setUrlError("Похоже, это невалидная ссылка.");
      return;
    }
    revokeObjectUrl();
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
    setPdfSrc(url);
  };

  const switchMode = (newMode: Mode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setUrlError("");
    setFileError("");
    revokeObjectUrl();
    setPdfSrc(null);
    setUrlInput("");
    if (fileInputRef.current) fileInputRef.current.value = "";
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
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setUrlError("");
                }}
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
                style={{
                  background: "#3a2e1e",
                  color: "#f5f0e8",
                }}
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

        {/* Fallback link */}
        {pdfSrc && (
          <div className="flex justify-end mt-3">
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
