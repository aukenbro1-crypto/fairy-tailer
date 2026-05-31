import { Link } from "react-router-dom";
import logoImage from "@/assets/logo.png";
import { BookOpen, Home } from "lucide-react";

const BlogHeader = () => {
  return (
    <header className="sticky top-0 z-50 border-b border-black bg-white">
      <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-5 md:px-8">
        <Link to="/" aria-label="FairyTeller">
          <img src={logoImage} alt="FairyTeller" className="h-10 w-auto object-contain" />
        </Link>

        <nav className="hidden items-center gap-8 text-[13px] font-bold uppercase tracking-[0.05em] md:flex">
          <Link to="/" className="hover:underline">
            Главная
          </Link>
          <Link to="/blog" className="hover:underline">
            Журнал
          </Link>
          <Link to="/create" className="hover:underline">
            Создать
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="hidden h-10 w-10 items-center justify-center border border-black bg-white text-black transition hover:bg-black hover:text-white sm:inline-flex"
            aria-label="На главную"
          >
            <Home className="h-4 w-4" />
          </Link>
          <Link
            to="/create"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 border border-black bg-black px-4 text-[13px] font-bold uppercase tracking-[0.05em] text-white transition hover:bg-white hover:text-black"
            aria-label="Создать книгу"
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Создать книгу</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default BlogHeader;
