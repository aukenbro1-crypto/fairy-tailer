import { Link } from "react-router-dom";
import { Menu, ShoppingBag } from "lucide-react";

import logoImage from "@/assets/logo.png";

const LandingHeader = () => (
  <>
    <div className="border-b border-black bg-black px-5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white md:px-8">
      Персональные книги - история за 3 минуты, печать за 1 день
    </div>

    <header className="sticky inset-x-0 top-0 z-40 border-b border-black bg-white">
      <div className="mx-auto flex h-14 max-w-[1480px] items-center justify-between px-5 md:px-8">
        <div className="flex items-center gap-5">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center border border-black bg-white text-black transition hover:bg-black hover:text-white md:hidden"
            aria-label="Открыть меню"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="flex items-center gap-3" aria-label="FairyTeller">
            <img src={logoImage} alt="FairyTeller" className="h-10 w-auto object-contain" />
          </Link>
        </div>

        <nav className="hidden items-center gap-8 text-[13px] font-bold uppercase tracking-[0.05em] md:flex">
          <a href="#process" className="hover:underline">
            Как это работает
          </a>
          <a href="#create" className="hover:underline">
            Создать
          </a>
          <a href="#examples" className="hover:underline">
            Примеры
          </a>
          <a href="#faq" className="hover:underline">
            FAQ
          </a>
          <Link to="/blog" className="hover:underline">
            Журнал
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="#create"
            className="inline-flex h-10 items-center justify-center gap-2 border border-black bg-black px-4 text-[13px] font-bold uppercase tracking-[0.05em] text-white transition hover:bg-white hover:text-black"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Заказать</span>
          </a>
        </div>
      </div>
    </header>
  </>
);

export default LandingHeader;
