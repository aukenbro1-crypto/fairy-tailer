import { useParams, Link, Navigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getBlogPostBySlug, getBlogPostsByTag, blogPosts, type BlogPost as BlogPostType } from "@/data/blogPosts";
import BlogHeader from "@/components/BlogHeader";
import BlogCTA from "@/components/BlogCTA";
import BlogSEO from "@/components/BlogSEO";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogPostBySlug(slug) : undefined;

  if (!post) return <Navigate to="/blog" replace />;

  // Related posts by tags (exclude current)
  const related = post.tags
    .flatMap(tag => getBlogPostsByTag(tag))
    .filter((p, i, arr) => p.slug !== post.slug && !p.hidden && arr.findIndex(x => x.slug === p.slug) === i)
    .slice(0, 4);

  const content = post.contentMarkdown || "";

  // Insert CTA after ~40% of content
  const lines = content.split("\n");
  const midPoint = Math.floor(lines.length * 0.4);
  const firstHalf = lines.slice(0, midPoint).join("\n");
  const secondHalf = lines.slice(midPoint).join("\n");

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#031B28] via-[#083248] to-[#0B2838] font-serif">
      <BlogSEO post={post} />
      <BlogHeader />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="text-[#DBA858]/60 hover:text-[#E89C31]">Главная</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-[#DBA858]/40" />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/blog" className="text-[#DBA858]/60 hover:text-[#E89C31]">Блог</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-[#DBA858]/40" />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-[#DBA858] line-clamp-1">{post.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Article header */}
        <article>
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-[#E89C31] mb-4 leading-tight">
              {post.title}
            </h1>
            <p className="text-lg text-[#DBA858]/80 mb-4">{post.description}</p>
            <div className="flex items-center gap-4 flex-wrap">
              <time className="text-sm text-[#DBA858]/50" dateTime={post.date}>
                {new Date(post.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
              </time>
              <div className="flex gap-2 flex-wrap">
                {post.tags.map(tag => (
                  <Link
                    key={tag}
                    to={`/blog/tag/${encodeURIComponent(tag)}`}
                    className="text-xs px-2 py-1 rounded-full bg-[#E89C31]/10 text-[#E89C31] border border-[#E89C31]/20 hover:bg-[#E89C31]/20 transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          </header>

          {/* Cover */}
          <div className="rounded-2xl overflow-hidden mb-10">
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-auto max-h-[400px] object-cover"
              loading="eager"
              decoding="async"
            />
          </div>

          {/* Content first half */}
          <div className="blog-prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{firstHalf}</ReactMarkdown>
          </div>

          {/* Mid-article CTA */}
          <BlogCTA />

          {/* Content second half */}
          <div className="blog-prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{secondHalf}</ReactMarkdown>
          </div>

          {/* End CTA */}
          <BlogCTA />
        </article>

        {/* Related posts */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold text-[#E89C31] mb-8">Похожие статьи</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {related.map(rp => (
                <Link key={rp.slug} to={`/blog/${rp.slug}`} className="group">
                  <div className="bg-[#083248]/80 border border-[#E89C31]/20 rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-[#E89C31]/15 transition-all duration-500">
                    <div className="aspect-[16/10] overflow-hidden">
                      <img src={rp.coverImage} alt={rp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-[#E89C31] group-hover:text-[#DBA858] transition-colors line-clamp-2">{rp.title}</h3>
                      <p className="text-sm text-[#DBA858]/60 mt-1 line-clamp-2">{rp.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="bg-[#031B28] border-t border-[#E89C31]/20 py-10 mt-16">
        <div className="container mx-auto px-4 text-center text-[#DBA858]">
          <p className="text-lg">© 2026 FairyTeller. Создаем персональные истории с любовью.</p>
        </div>
      </footer>
    </div>
  );
};

export default BlogPostPage;
