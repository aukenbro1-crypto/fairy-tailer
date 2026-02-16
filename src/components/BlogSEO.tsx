import { useEffect } from "react";
import { BlogPost } from "@/data/blogPosts";

interface BlogSEOProps {
  post?: BlogPost;
  isList?: boolean;
  posts?: BlogPost[];
}

const BlogSEO = ({ post, isList, posts }: BlogSEOProps) => {
  useEffect(() => {
    if (isList && posts) {
      document.title = "Блог FairyTeller — статьи о персональных подарках и сказках";
      setMeta("description", "Идеи подарков, советы по созданию персонализированных книг и сказок. Блог FairyTeller.");
      setMeta("og:title", "Блог FairyTeller — статьи о персональных подарках и сказках");
      setMeta("og:description", "Идеи подарков, советы по созданию персонализированных книг и сказок.");
      setMeta("og:type", "blog");
      setMeta("og:url", "https://fairyteller.ru/blog");
      setCanonical("https://fairyteller.ru/blog");
      setJsonLd({
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": "Блог FairyTeller",
        "description": "Идеи подарков, советы по созданию персонализированных книг и сказок",
        "url": "https://fairyteller.ru/blog",
        "blogPost": posts.map(p => ({
          "@type": "BlogPosting",
          "headline": p.title,
          "description": p.description,
          "datePublished": p.date,
          "image": p.coverImage,
          "url": `https://fairyteller.ru/blog/${p.slug}`
        }))
      });
    } else if (post) {
      document.title = `${post.title} — FairyTeller`;
      setMeta("description", post.description);
      setMeta("og:title", post.title);
      setMeta("og:description", post.description);
      setMeta("og:image", post.coverImage);
      setMeta("og:type", "article");
      setMeta("og:url", `https://fairyteller.ru/blog/${post.slug}`);
      setMeta("twitter:title", post.title);
      setMeta("twitter:description", post.description);
      setMeta("twitter:image", post.coverImage);
      setCanonical(`https://fairyteller.ru/blog/${post.slug}`);
      setJsonLd({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.title,
        "description": post.description,
        "datePublished": post.date,
        "image": post.coverImage,
        "url": `https://fairyteller.ru/blog/${post.slug}`,
        "author": { "@type": "Organization", "name": "FairyTeller" },
        "publisher": { "@type": "Organization", "name": "FairyTeller", "url": "https://fairyteller.ru" }
      });
    }

    return () => {
      // cleanup
      const jsonLd = document.getElementById("blog-jsonld");
      if (jsonLd) jsonLd.remove();
      const canonical = document.querySelector('link[data-blog-canonical]');
      if (canonical) canonical.remove();
    };
  }, [post, isList, posts]);

  return null;
};

function setMeta(name: string, content: string) {
  const isOg = name.startsWith("og:") || name.startsWith("twitter:");
  const attr = isOg ? "property" : "name";
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setCanonical(href: string) {
  let el = document.querySelector('link[data-blog-canonical]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    el.setAttribute("data-blog-canonical", "true");
    document.head.appendChild(el);
  }
  el.href = href;
}

function setJsonLd(data: object) {
  let el = document.getElementById("blog-jsonld") as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = "blog-jsonld";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export default BlogSEO;
