import { useParams, Link, Navigate } from "react-router-dom";
import { BookOpen, ChevronLeft, ChevronRight, Home } from "lucide-react";

import { getBlogPostsByTag } from "@/data/blogPosts";
import SEO from "@/components/SEO";
import BlogImage from "@/components/BlogImage";
import logoImage from "@/assets/logo.png";

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const BlogTag = () => {
  const { tag } = useParams<{ tag: string }>();
  const decodedTag = tag ? decodeURIComponent(tag) : "";
  const posts = getBlogPostsByTag(decodedTag);

  if (!tag || posts.length === 0) return <Navigate to="/blog" replace />;

  return (
    <div
      className="journal-page min-h-screen overflow-x-hidden bg-white text-black"
      style={{ fontFamily: '"Avenir Next", "Helvetica Neue", Jost, Futura, Arial, sans-serif' }}
    >
      <SEO
        title={`Материалы про ${decodedTag} — журнал Fairyteller`}
        description={`Подборка статей Fairyteller по теме «${decodedTag}»: идеи подарков, персональные книги и поводы для личных историй.`}
        path={`/blog/tag/${encodeURIComponent(decodedTag)}`}
      />
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
        `}
      </style>

      <div className="border-b border-black bg-black px-5 py-2 text-center text-[11px] font-bold uppercase leading-4 tracking-[0.18em] text-white md:px-8">
        <span className="hidden sm:inline">Журнал Fairyteller - подборка по рубрике</span>
        <span className="sm:hidden">Журнал Fairyteller</span>
      </div>

      <header className="sticky top-0 z-50 border-b border-black bg-white">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-5 md:px-8">
          <Link to="/" aria-label="FairyTeller">
            <img src={logoImage} alt="FairyTeller" className="h-10 w-auto object-contain" />
          </Link>

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
          <div className="mx-auto max-w-[1480px]">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.08em] text-black hover:underline"
            >
              <ChevronLeft className="h-4 w-4" />
              Все материалы
            </Link>
            <p className="mt-10 text-[12px] font-bold uppercase tracking-[0.2em] text-[#5e6264]">
              Рубрика
            </p>
            <h1 className="mt-5 max-w-[920px] text-[52px] font-black uppercase leading-[0.9] tracking-[-0.03em] md:text-[104px]">
              {decodedTag}
            </h1>
          </div>
        </section>

        <section className="bg-[#f5f5f5] px-5 py-10 md:px-8 md:py-14">
          <div className="mx-auto grid max-w-[1480px] border-l border-t border-black md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.slug} to={`/blog/${post.slug}`} className="group border-b border-r border-black bg-white">
                <article className="flex h-full flex-col">
                  <BlogImage
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
                    <h2 className="mt-4 text-[28px] font-black uppercase leading-[0.94] tracking-[-0.02em]">
                      {post.title}
                    </h2>
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
        </section>
      </main>
    </div>
  );
};

export default BlogTag;
