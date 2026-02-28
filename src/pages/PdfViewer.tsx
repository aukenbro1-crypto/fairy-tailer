import { useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface PdfDoc {
  id: string;
  title: string;
  pages: string[]; // array of text strings, one per PDF page
}

const PdfViewer = () => {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<"next" | "prev">("next");
  const [showHeader, setShowHeader] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) { setError("Нет ID документа"); setLoading(false); return; }
      const { data, error: err } = await supabase
        .from("pdf_documents")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (err) { setError("Ошибка загрузки"); setLoading(false); return; }
      if (!data) { setError("Документ не найден"); setLoading(false); return; }
      setDoc({ id: data.id, title: data.title, pages: data.pages as string[] });
      setLoading(false);
    };
    load();
  }, [id]);

  // Show header on mouse near top
  useEffect(() => {
    const handleMove = (e: MouseEvent) => setShowHeader(e.clientY < 60);
    const handleLeave = () => setShowHeader(false);
    window.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseleave", handleLeave);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  const totalPages = doc?.pages.length ?? 0;

  const goToPage = useCallback(
    (target: number) => {
      if (isFlipping || target < 0 || target >= totalPages || target === currentPage) return;
      setFlipDirection(target > currentPage ? "next" : "prev");
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentPage(target);
        setIsFlipping(false);
      }, 600);
    },
    [isFlipping, currentPage, totalPages]
  );

  const nextPage = useCallback(() => goToPage(currentPage + 1), [goToPage, currentPage]);
  const prevPage = useCallback(() => goToPage(currentPage - 1), [goToPage, currentPage]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); nextPage(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prevPage(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [nextPage, prevPage]);

  // Touch swipe
  useEffect(() => {
    let startX = 0;
    const onStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const onEnd = (e: TouchEvent) => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) { diff > 0 ? nextPage() : prevPage(); }
    };
    window.addEventListener("touchstart", onStart);
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [nextPage, prevPage]);

  if (loading) {
    return (
      <div className="naruto-story-root">
        <div className="naruto-book-container">
          <div className="naruto-page">
            <div className="naruto-page-inner" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ color: "#6b5a3e", fontFamily: "Georgia, serif" }}>Загрузка…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="naruto-story-root">
        <div className="naruto-book-container">
          <div className="naruto-page">
            <div className="naruto-page-inner" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
              <p style={{ color: "#8b3a0f", fontFamily: "Georgia, serif" }}>{error || "Документ не найден"}</p>
              <Link to="/pdf-reader" style={{ color: "#6b5a3e", textDecoration: "underline", fontFamily: "Georgia, serif", fontSize: "0.875rem" }}>
                ← Вернуться к PDF ридеру
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pageText = doc.pages[currentPage] || "";

  return (
    <div className="naruto-story-root">
      {/* Auto-hide header */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 transition-all duration-500 ease-in-out"
        style={{
          transform: showHeader ? "translateY(0)" : "translateY(-100%)",
          opacity: showHeader ? 1 : 0,
          background: "linear-gradient(180deg, rgba(245,240,232,0.95) 0%, rgba(245,240,232,0) 100%)",
          backdropFilter: "blur(8px)",
        }}
      >
        <Link to="/pdf-reader" className="flex items-center gap-2 text-[#8b3a0f] hover:opacity-70 transition-opacity">
          <Home className="w-5 h-5" />
          <span className="text-sm font-serif">PDF ридер</span>
        </Link>
        <span className="text-sm text-[#6b5a3e] font-serif tracking-wide truncate max-w-[50%]">{doc.title}</span>
        <span className="text-xs text-[#8a7a5e]">{currentPage + 1} / {totalPages}</span>
      </header>

      {/* Book container */}
      <div className="naruto-book-container">
        <div className={`naruto-page ${isFlipping ? `naruto-flip-${flipDirection}` : ""}`}>
          {/* Click zones */}
          <div className="absolute left-0 top-0 w-1/4 h-full z-20 cursor-pointer" onClick={prevPage} />
          <div className="absolute right-0 top-0 w-1/4 h-full z-20 cursor-pointer" onClick={nextPage} />

          <div className="naruto-page-inner naruto-text-page">
            {currentPage === 0 ? (
              /* Cover/title page */
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "1.5rem", padding: "2rem" }}>
                <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.5rem, 4vw, 2.5rem)", color: "#3a2e1e", textAlign: "center", lineHeight: 1.3 }}>
                  {doc.title}
                </h1>
                <p style={{ fontFamily: "Georgia, serif", fontSize: "0.875rem", color: "#8a7a5e" }}>
                  {totalPages} {totalPages === 1 ? "страница" : totalPages < 5 ? "страницы" : "страниц"}
                </p>
              </div>
            ) : (
              /* Text pages */
              <div className="naruto-text-content">
                {pageText.split("\n\n").filter(Boolean).map((p, i) => (
                  <p key={i} className="naruto-paragraph">{p}</p>
                ))}
                {!pageText.trim() && (
                  <p style={{ color: "#8a7a5e", fontStyle: "italic", textAlign: "center" }}>Пустая страница</p>
                )}
              </div>
            )}
            <span className="naruto-page-number">{currentPage + 1}</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="naruto-nav">
        <button onClick={prevPage} disabled={currentPage === 0 || isFlipping} className="naruto-nav-btn" aria-label="Previous page">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="naruto-nav-counter">{currentPage + 1} / {totalPages}</span>
        <button onClick={nextPage} disabled={currentPage === totalPages - 1 || isFlipping} className="naruto-nav-btn" aria-label="Next page">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default PdfViewer;
