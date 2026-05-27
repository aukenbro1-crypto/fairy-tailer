import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, ChevronRight, Home, Search } from "lucide-react";

import { blogPosts } from "@/data/blogPosts";
import BlogSEO from "@/components/BlogSEO";
import logoImage from "@/assets/logo.png";

const visiblePosts = blogPosts.filter((post) => !post.hidden);
const featuredPost = visiblePosts[0];
const secondaryPosts = visiblePosts.slice(1, 4);
const restPosts = visiblePosts.slice(4);
const journalTags = Array.from(new Set(visiblePosts.flatMap((post) => post.tags))).slice(0, 10);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const Blog = () => {
  return (
    <div
      className="journal-page min-h-screen overflow-x-hidden bg-white text-black"
      style={{ fontFamily: '"Avenir Next", "Helvetica Neue", Jost, Futura, Arial, sans-serif' }}
    >
      <BlogSEO isList posts={blogPosts} />
      <style>
        {`
          .journal-page h1,
          .journal-page h2,
          .journal-page h3 {
            color: #E89C31;
            font-family: "Avenir Next", "Helvetica Neue", Jost, Futura, Arial, sans-serif;
            letter-spacing: inherit;
            text-shadow: none;
          }

          .journal-page,
          .journal-page * {
            min-width: 0;
            box-sizing: border-box;
          }

          .journal-page a,
          .journal-page button {
            font-family: inherit;
          }
        `}
      </style>

      <div className="border-b border-black bg-black px-5 py-2 text-center text-[11px] font-bold uppercase leading-4 tracking-[0.18em] text-white md:px-8">
        <span className="hidden sm:inline">Журнал Fairyteller - идеи подарков, персональные книги и истории</span>
        <span className="sm:hidden">Журнал Fairyteller</span>
      </div>

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
              className="hidden h-10 shrink-0 items-center justify-center gap-2 border border-black bg-black px-4 text-[13px] font-bold uppercase tracking-[0.05em] text-white transition hover:bg-white hover:text-black sm:inline-flex"
              aria-label="Создать книгу"
            >
              <BookOpen className="h-4 w-4" />
              <span>Создать книгу</span>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-black px-5 py-12 md:px-8 md:py-16">
          <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#5e6264]">
                Редакционный раздел
              </p>
              <h1 className="mt-5 max-w-[840px] text-[50px] font-black uppercase leading-[0.9] tracking-[-0.03em] md:text-[104px]">
                Журнал о подарках, которые попадают в человека.
              </h1>
            </div>
            <div className="max-w-[620px] lg:pb-3">
              <p className="text-[20px] leading-8 text-black md:text-[24px]">
                Идеи, поводы и разборы персональных книг: как выбрать сюжет,
                какие детали добавить и почему хороший подарок начинается с внимания.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#articles"
                  className="inline-flex h-12 items-center justify-center gap-2 bg-black px-6 text-[13px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#5e6264]"
                >
                  Читать журнал
                  <ArrowRight className="h-5 w-5" />
                </a>
                <Link
                  to="/create"
                  className="inline-flex h-12 items-center justify-center gap-2 border border-black bg-white px-6 text-[13px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-black hover:text-white"
                >
                  Создать книгу
                </Link>
              </div>
            </div>
          </div>
        </section>

        {featuredPost && (
          <section className="border-b border-black bg-[#f5f5f5] px-5 py-10 md:px-8 md:py-14">
            <div className="mx-auto grid max-w-[1480px] border-l border-t border-black lg:grid-cols-[1fr_1.05fr]">
              <Link to={`/blog/${featuredPost.slug}`} className="group border-b border-r border-black bg-white">
                <article className="flex h-full flex-col justify-between p-5 md:p-8">
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#5e6264]">
                      Главный материал
                    </p>
                    <h2 className="mt-8 max-w-[760px] text-[42px] font-black uppercase leading-[0.92] tracking-[-0.03em] md:text-[72px]">
                      {featuredPost.title}
                    </h2>
                    <p className="mt-6 max-w-[680px] text-[18px] leading-8 text-[#5e6264]">
                      {featuredPost.description}
                    </p>
                  </div>
                  <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-black pt-5">
                    <time className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#5e6264]" dateTime={featuredPost.date}>
                      {formatDate(featuredPost.date)}
                    </time>
                    <span className="inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.08em] text-black group-hover:underline">
                      Читать
                      <ChevronRight className="h-5 w-5" />
                    </span>
                  </div>
                </article>
              </Link>

              <Link to={`/blog/${featuredPost.slug}`} className="group border-b border-r border-black bg-white p-4 md:p-6">
                <img
                  src={featuredPost.coverImage}
                  alt={featuredPost.title}
                  className="h-full min-h-[360px] w-full object-cover grayscale transition duration-500 group-hover:grayscale-0"
                />
              </Link>
            </div>
          </section>
        )}

        <section className="border-b border-black bg-white px-5 py-10 md:px-8 md:py-14">
          <div className="mx-auto grid max-w-[1480px] gap-8 lg:grid-cols-[360px_1fr]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#5e6264]">
                Рубрики
              </p>
              <h2 className="mt-4 text-[38px] font-black uppercase leading-[0.92] tracking-[-0.03em]">
                Найти повод.
              </h2>
              <div className="mt-7 flex flex-wrap gap-2">
                {journalTags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/blog/tag/${encodeURIComponent(tag)}`}
                    className="border border-black px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] transition hover:bg-black hover:text-white"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
              <div className="mt-8 border border-black bg-[#f5f5f5] p-5">
                <Search className="h-6 w-6" />
                <p className="mt-5 text-[15px] leading-7 text-[#5e6264]">
                  Журнал должен работать как консультант: подсказать идею подарка,
                  а затем мягко привести к созданию книги.
                </p>
              </div>
            </aside>

            <div id="articles" className="grid border-l border-t border-black md:grid-cols-3">
              {secondaryPosts.map((post) => (
                <Link key={post.slug} to={`/blog/${post.slug}`} className="group border-b border-r border-black bg-white">
                  <article className="flex h-full flex-col">
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="aspect-[4/3] w-full object-cover grayscale transition duration-500 group-hover:grayscale-0"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="flex flex-1 flex-col p-5">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#5e6264]">
                        {formatDate(post.date)}
                      </p>
                      <h3 className="mt-4 text-[26px] font-black uppercase leading-[0.94] tracking-[-0.02em]">
                        {post.title}
                      </h3>
                      <p className="mt-4 line-clamp-4 text-[15px] leading-7 text-[#5e6264]">
                        {post.description}
                      </p>
                      <span className="mt-6 inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.08em] text-black group-hover:underline">
                        Читать
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {restPosts.length > 0 && (
          <section className="border-b border-black bg-[#f5f5f5] px-5 py-10 md:px-8 md:py-14">
            <div className="mx-auto max-w-[1480px]">
              <div className="mb-8 grid gap-5 md:grid-cols-[1fr_420px] md:items-end">
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#5e6264]">
                    Архив
                  </p>
                  <h2 className="mt-4 text-[42px] font-black uppercase leading-[0.92] tracking-[-0.03em] md:text-[72px]">
                    Ещё материалы.
                  </h2>
                </div>
                <p className="text-[18px] leading-7 text-[#5e6264]">
                  Короткие разборы, идеи и поводы, которые помогают собрать
                  персональную книгу точнее.
                </p>
              </div>

              <div className="grid border-l border-t border-black md:grid-cols-2">
                {restPosts.map((post) => (
                  <Link key={post.slug} to={`/blog/${post.slug}`} className="group border-b border-r border-black bg-white">
                    <article className="grid gap-5 p-5 sm:grid-cols-[160px_1fr]">
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="aspect-square w-full object-cover grayscale transition duration-500 group-hover:grayscale-0"
                        loading="lazy"
                        decoding="async"
                      />
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#5e6264]">
                          {formatDate(post.date)}
                        </p>
                        <h3 className="mt-3 text-[26px] font-black uppercase leading-[0.95] tracking-[-0.02em]">
                          {post.title}
                        </h3>
                        <p className="mt-4 line-clamp-3 text-[15px] leading-7 text-[#5e6264]">
                          {post.description}
                        </p>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-black bg-black px-5 py-10 text-white md:px-8">
        <div className="mx-auto flex max-w-[1480px] flex-col justify-between gap-5 md:flex-row md:items-center">
          <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-white/70">
            © 2026 FairyTeller. Журнал персональных книг.
          </p>
          <Link
            to="/create"
            className="inline-flex h-12 items-center justify-center gap-2 border border-white bg-white px-6 text-[13px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-black hover:text-white"
          >
            Создать книгу
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default Blog;
