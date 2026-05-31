import { useParams, Link, Navigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ChevronRight } from "lucide-react";

import { getBlogPostBySlug, getBlogPostsByTag } from "@/data/blogPosts";
import BlogHeader from "@/components/BlogHeader";
import BlogCTA from "@/components/BlogCTA";
import BlogSEO from "@/components/BlogSEO";
import BlogImage from "@/components/BlogImage";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogPostBySlug(slug) : undefined;

  if (!post) return <Navigate to="/blog" replace />;

  const related = post.tags
    .flatMap((tag) => getBlogPostsByTag(tag))
    .filter((candidate, index, posts) => (
      candidate.slug !== post.slug &&
      !candidate.hidden &&
      posts.findIndex((item) => item.slug === candidate.slug) === index
    ))
    .slice(0, 4);

  const content = post.contentMarkdown || "";
  const lines = content.split("\n");
  const midPoint = Math.floor(lines.length * 0.4);
  const firstHalf = lines.slice(0, midPoint).join("\n");
  const secondHalf = lines.slice(midPoint).join("\n");

  return (
    <div
      className="journal-page min-h-screen overflow-x-hidden bg-white text-black"
      style={{ fontFamily: '"Avenir Next", "Helvetica Neue", Jost, Futura, Arial, sans-serif' }}
    >
      <BlogSEO post={post} />
      <style>
        {`
          .journal-page,
          .journal-page * {
            min-width: 0;
            box-sizing: border-box;
          }

          .journal-page h1,
          .journal-page h2,
          .journal-page h3,
          .journal-page a,
          .journal-page button {
            font-family: "Avenir Next", "Helvetica Neue", Jost, Futura, Arial, sans-serif;
          }

          .blog-prose {
            color: #111111;
            font-size: 18px;
            line-height: 1.85;
          }

          .blog-prose > * + * {
            margin-top: 1.35em;
          }

          .blog-prose h2,
          .blog-prose h3 {
            color: #E89C31;
            font-weight: 900;
            line-height: 0.98;
            letter-spacing: -0.02em;
            text-transform: uppercase;
          }

          .blog-prose h2 {
            margin-top: 2.1em;
            font-size: clamp(1.6rem, 3vw, 2.7rem);
          }

          .blog-prose h3 {
            margin-top: 1.8em;
            font-size: clamp(1.45rem, 3vw, 2.5rem);
          }

          .blog-prose strong {
            font-weight: 900;
          }

          .blog-prose ul,
          .blog-prose ol {
            padding-left: 1.2rem;
          }

          .blog-prose li + li {
            margin-top: 0.65rem;
          }

          .blog-prose blockquote {
            border-left: 3px solid #111111;
            background: #f5f5f5;
            padding: 1.25rem 1.5rem;
            color: #5e6264;
          }

          .blog-prose hr {
            border: 0;
            border-top: 1px solid #111111;
            margin: 3rem 0;
          }

          .blog-prose a {
            color: #111111;
            font-weight: 800;
            text-decoration: underline;
            text-decoration-thickness: 1px;
            text-underline-offset: 4px;
          }

          .blog-prose img {
            width: 100%;
            max-height: 560px;
            object-fit: cover;
            border: 1px solid #111111;
            background: #f5f5f5;
          }
        `}
      </style>

      <div className="border-b border-black bg-black px-5 py-2 text-center text-[11px] font-bold uppercase leading-4 tracking-[0.18em] text-white md:px-8">
        <span className="hidden sm:inline">Журнал Fairyteller - идеи подарков, персональные книги и истории</span>
        <span className="sm:hidden">Журнал Fairyteller</span>
      </div>
      <BlogHeader />

      <main>
        <article>
          <header className="border-b border-black px-5 py-8 md:px-8 md:py-12">
            <div className="mx-auto max-w-[1180px]">
              <Breadcrumb className="mb-8">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/" className="text-[#5e6264] hover:text-black">Главная</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-[#5e6264]" />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/blog" className="text-[#5e6264] hover:text-black">Журнал</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-[#5e6264]" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="line-clamp-1 text-black">{post.title}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <Link
                to="/blog"
                className="inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.08em] text-black hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Все материалы
              </Link>

              <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
                <div>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <Link
                        key={tag}
                        to={`/blog/tag/${encodeURIComponent(tag)}`}
                        className="border border-black px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] transition hover:bg-black hover:text-white"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                  <h1 className="mt-6 text-[38px] font-black uppercase leading-[0.96] tracking-[-0.02em] text-[#E89C31] md:text-[64px] xl:text-[72px]">
                    {post.title}
                  </h1>
                </div>
                <div className="border-l border-black pl-5 lg:pl-7">
                  <time className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#5e6264]" dateTime={post.date}>
                    {formatDate(post.date)}
                  </time>
                  <p className="mt-5 text-[19px] leading-8 text-[#5e6264]">
                    {post.description}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <section className="border-b border-black bg-[#f5f5f5] px-5 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-[1180px]">
              <BlogImage
                src={post.coverImage}
                alt={post.title}
                className="aspect-[16/9] w-full border border-black bg-white object-cover"
                loading="eager"
                decoding="async"
              />
            </div>
          </section>

          <section className="px-5 py-10 md:px-8 md:py-14">
            <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[minmax(0,760px)_260px]">
              <div>
                <div className="blog-prose">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      img: ({ node: _node, ...props }) => (
                        <BlogImage {...props} alt={props.alt || ""} loading="lazy" decoding="async" />
                      ),
                    }}
                  >
                    {firstHalf}
                  </ReactMarkdown>
                </div>

                <BlogCTA />

                <div className="blog-prose">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      img: ({ node: _node, ...props }) => (
                        <BlogImage {...props} alt={props.alt || ""} loading="lazy" decoding="async" />
                      ),
                    }}
                  >
                    {secondHalf}
                  </ReactMarkdown>
                </div>

                <BlogCTA />
              </div>

              <aside className="hidden lg:block">
                <div className="sticky top-24 border border-black bg-[#f5f5f5] p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5e6264]">
                    В этой теме
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <Link
                        key={tag}
                        to={`/blog/tag/${encodeURIComponent(tag)}`}
                        className="border border-black bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] transition hover:bg-black hover:text-white"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </section>
        </article>

        {related.length > 0 && (
          <section className="border-t border-black bg-[#f5f5f5] px-5 py-10 md:px-8 md:py-14">
            <div className="mx-auto max-w-[1180px]">
              <div className="mb-8 grid gap-4 md:grid-cols-[1fr_320px] md:items-end">
                <h2 className="text-[42px] font-black uppercase leading-[0.92] tracking-[-0.03em] text-[#E89C31] md:text-[72px]">
                  Похожие статьи.
                </h2>
                <p className="text-[17px] leading-7 text-[#5e6264]">
                  Еще несколько материалов, которые помогут выбрать повод, сюжет и формат подарка.
                </p>
              </div>
              <div className="grid border-l border-t border-black md:grid-cols-2">
                {related.map((relatedPost) => (
                  <Link key={relatedPost.slug} to={`/blog/${relatedPost.slug}`} className="group border-b border-r border-black bg-white">
                    <article className="grid gap-5 p-5 sm:grid-cols-[160px_1fr]">
                      <BlogImage
                        src={relatedPost.coverImage}
                        alt={relatedPost.title}
                        className="aspect-square w-full object-cover grayscale transition duration-500 group-hover:grayscale-0"
                        loading="lazy"
                        decoding="async"
                      />
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#5e6264]">
                          {formatDate(relatedPost.date)}
                        </p>
                        <h3 className="mt-3 text-[26px] font-black uppercase leading-[0.95] tracking-[-0.02em] text-[#E89C31]">
                          {relatedPost.title}
                        </h3>
                        <p className="mt-4 line-clamp-3 text-[15px] leading-7 text-[#5e6264]">
                          {relatedPost.description}
                        </p>
                        <span className="mt-5 inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.08em] text-black group-hover:underline">
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

export default BlogPostPage;
