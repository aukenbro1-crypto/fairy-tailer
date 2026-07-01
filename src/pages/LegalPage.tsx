import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";

import LegalFooterLinks from "@/components/LegalFooterLinks";
import SEO from "@/components/SEO";
import { legalFooterLinks, legalOwner, legalPages, type LegalPageId } from "@/data/legalPages";
import logoImage from "@/assets/logo-compact.webp";

type LegalPageProps = {
  pageId: LegalPageId;
};

const textStyle = {
  fontFamily: '"Avenir Next", "Helvetica Neue", Jost, Futura, Arial, sans-serif',
};

const LegalPage = ({ pageId }: LegalPageProps) => {
  const page = legalPages[pageId];

  return (
    <main className="min-h-screen bg-[#f5f5f5] text-black" style={textStyle}>
      <SEO title={`${page.title} | Fairyteller`} description={page.description} path={page.path} />

      <div className="border-b border-black bg-black px-5 py-2 text-center text-[11px] font-bold uppercase leading-4 tracking-[0.18em] text-white md:px-8">
        Технические документы fairyteller.ru
      </div>

      <header className="sticky top-0 z-40 border-b border-black bg-white">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between gap-4 px-5 md:px-8">
          <Link to="/" aria-label="FairyTeller">
            <img src={logoImage} alt="FairyTeller" className="h-11 w-auto bg-white object-contain" />
          </Link>
          <nav className="hidden items-center gap-7 text-[13px] font-bold uppercase tracking-[0.05em] md:flex">
            <Link to="/" className="hover:underline">
              Главная
            </Link>
            <Link to="/create" className="hover:underline">
              Создать
            </Link>
            <Link to="/blog" className="hover:underline">
              Журнал
            </Link>
          </nav>
          <Link
            to="/create"
            className="inline-flex h-10 items-center justify-center gap-2 border border-black bg-black px-4 text-[13px] font-bold uppercase tracking-[0.05em] text-white transition hover:bg-white hover:text-black"
          >
            Создать
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="border-b border-black bg-white px-5 py-10 md:px-8 md:py-14">
        <div className="mx-auto max-w-[1180px]">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-[#5e6264] hover:text-black hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            На главную
          </Link>
          <p className="mt-8 text-[13px] font-bold uppercase tracking-[0.16em] text-[#5e6264]">{page.eyebrow}</p>
          <h1 className="mt-4 max-w-[980px] text-[38px] font-black uppercase leading-[1.05] tracking-normal md:text-[64px]">
            {page.title}
          </h1>
          <p className="mt-6 max-w-[760px] text-[18px] leading-8 text-[#3f4447]">{page.lead}</p>
          <p className="mt-6 text-[13px] font-bold uppercase tracking-[0.12em] text-[#5e6264]">
            Редакция от {page.updatedAt}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {legalFooterLinks.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`inline-flex min-h-11 items-center border border-black px-4 text-[12px] font-bold uppercase tracking-[0.08em] transition hover:bg-black hover:text-white ${
                  item.href === page.path ? "bg-black text-white" : "bg-white text-black"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-10 md:px-8 md:py-14">
        <div className="mx-auto grid max-w-[1180px] gap-5">
          {page.sections.map((section) => (
            <article key={section.title} className="border border-black bg-white p-5 md:p-7">
              <h2 className="text-[24px] font-black uppercase leading-tight tracking-normal md:text-[30px]">
                {section.title}
              </h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-5 text-[16px] leading-8 text-[#3f4447]">
                  {paragraph}
                </p>
              ))}
              {section.items && (
                <ul className="mt-5 grid gap-3 text-[16px] leading-8 text-[#3f4447]">
                  {section.items.map((item) => (
                    <li key={item} className="grid grid-cols-[18px_1fr] gap-3">
                      <span aria-hidden="true" className="mt-[0.8em] h-1.5 w-1.5 bg-black" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-black bg-black px-5 py-12 text-white md:px-8">
        <div className="mx-auto grid max-w-[1480px] gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <img src={logoImage} alt="FairyTeller" className="h-12 w-auto bg-white px-2 py-1" />
            <p className="mt-5 max-w-[640px] text-[15px] leading-7 text-white/60">
              {legalOwner.projectName} помогает создавать персональные бумажные книги по фото: для детей, любимых,
              родителей, друзей и важных событий.
            </p>
            <LegalFooterLinks className="mt-6 flex flex-wrap gap-4 text-[12px] font-bold uppercase tracking-[0.12em] text-white/70" />
          </div>
          <div className="md:text-right">
            <Link
              to="/create"
              className="inline-flex h-11 items-center justify-center gap-2 border border-white bg-white px-5 text-[12px] font-bold uppercase tracking-[0.1em] text-black transition hover:bg-black hover:text-white"
            >
              Создать книгу
              <ChevronRight className="h-4 w-4" />
            </Link>
            <p className="mt-6 text-[13px] font-bold uppercase tracking-[0.12em] text-white/50">
              2026. Fairyteller.ru - персональные бумажные книги в подарок
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default LegalPage;
