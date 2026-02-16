import { Link } from "react-router-dom";
import { blogPosts } from "@/data/blogPosts";
import BlogHeader from "@/components/BlogHeader";
import BlogSEO from "@/components/BlogSEO";

const Blog = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#031B28] via-[#083248] to-[#0B2838] font-serif">
      <BlogSEO isList posts={blogPosts} />
      <BlogHeader />

      <main className="container mx-auto px-4 py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 text-[#E89C31] drop-shadow-[0_0_15px_rgba(232,156,49,0.3)]">
          Блог
        </h1>
        <p className="text-center text-[#DBA858]/80 text-lg mb-12 max-w-2xl mx-auto">
          Идеи подарков, советы и вдохновение для создания персональных историй
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {blogPosts.map((post) => (
            <Link key={post.slug} to={`/blog/${post.slug}`} className="group">
              <article className="bg-[#083248]/80 border border-[#E89C31]/20 rounded-2xl overflow-hidden shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/20 transition-all duration-500 h-full flex flex-col">
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.tags.map(tag => (
                      <Link
                        key={tag}
                        to={`/blog/tag/${encodeURIComponent(tag)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs px-2 py-1 rounded-full bg-[#E89C31]/10 text-[#E89C31] border border-[#E89C31]/20 hover:bg-[#E89C31]/20 transition-colors"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                  <h2 className="text-xl font-bold text-[#E89C31] mb-2 group-hover:text-[#DBA858] transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                  <p className="text-[#DBA858]/70 text-sm mb-4 flex-1 line-clamp-3">
                    {post.description}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <time className="text-xs text-[#DBA858]/50" dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                    </time>
                    <span className="text-[#E89C31] text-sm font-medium group-hover:underline">
                      Читать →
                    </span>
                  </div>
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

export default Blog;
