import { useParams, Link, Navigate } from "react-router-dom";
import { getBlogPostsByTag } from "@/data/blogPosts";
import BlogHeader from "@/components/BlogHeader";

const BlogTag = () => {
  const { tag } = useParams<{ tag: string }>();
  const decodedTag = tag ? decodeURIComponent(tag) : "";
  const posts = getBlogPostsByTag(decodedTag);

  if (!tag || posts.length === 0) return <Navigate to="/blog" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#031B28] via-[#083248] to-[#0B2838] font-serif">
      <BlogHeader />

      <main className="container mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 text-[#E89C31]">
          #{decodedTag}
        </h1>
        <p className="text-center text-[#DBA858]/60 mb-12">
          <Link to="/blog" className="hover:text-[#E89C31] transition-colors">← Все статьи</Link>
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {posts.map((post) => (
            <Link key={post.slug} to={`/blog/${post.slug}`} className="group">
              <article className="bg-[#083248]/80 border border-[#E89C31]/20 rounded-2xl overflow-hidden shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/20 transition-all duration-500 h-full flex flex-col">
                <div className="aspect-[16/10] overflow-hidden">
                  <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h2 className="text-xl font-bold text-[#E89C31] mb-2 group-hover:text-[#DBA858] transition-colors line-clamp-2">{post.title}</h2>
                  <p className="text-[#DBA858]/70 text-sm mb-4 flex-1 line-clamp-3">{post.description}</p>
                  <time className="text-xs text-[#DBA858]/50" dateTime={post.date}>
                    {new Date(post.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                  </time>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </main>

      <footer className="bg-[#031B28] border-t border-[#E89C31]/20 py-10">
        <div className="container mx-auto px-4 text-center text-[#DBA858]">
          <p className="text-lg">© 2026 FairyTeller. Создаем персональные истории с любовью.</p>
        </div>
      </footer>
    </div>
  );
};

export default BlogTag;
