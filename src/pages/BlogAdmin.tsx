import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BlogHeader from "@/components/BlogHeader";

// Flag to enable/disable admin page
const BLOG_ADMIN_ENABLED = true;

const BlogAdmin = () => {
  const [url, setUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  if (!BLOG_ADMIN_ENABLED) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#031B28] via-[#083248] to-[#0B2838] flex items-center justify-center">
        <p className="text-[#DBA858]">Админка блога отключена.</p>
      </div>
    );
  }

  const handleImport = async () => {
    if (!url || !webhookUrl) {
      setError("Укажите URL статьи и endpoint для импорта");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          slug: slug || undefined,
          title: title || undefined,
          description: description || undefined,
          tags: tags ? tags.split(",").map(t => t.trim()) : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ошибка ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Ошибка при импорте");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#031B28] via-[#083248] to-[#0B2838] font-serif">
      <BlogHeader />

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-3xl font-bold text-[#E89C31] mb-8">Импорт статьи</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[#DBA858]/80 mb-1">Webhook endpoint</label>
            <Input
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://hook.eu2.make.com/..."
              className="bg-[#031B28] border-[#E89C31]/20 text-[#DBA858]"
            />
          </div>

          <div>
            <label className="block text-sm text-[#DBA858]/80 mb-1">URL статьи (Teletype / Dzen)</label>
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://teletype.in/@user/article"
              className="bg-[#031B28] border-[#E89C31]/20 text-[#DBA858]"
            />
          </div>

          <div>
            <label className="block text-sm text-[#DBA858]/80 mb-1">Slug</label>
            <Input
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="my-article-slug"
              className="bg-[#031B28] border-[#E89C31]/20 text-[#DBA858]"
            />
          </div>

          <div>
            <label className="block text-sm text-[#DBA858]/80 mb-1">Заголовок (опционально)</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Заголовок статьи"
              className="bg-[#031B28] border-[#E89C31]/20 text-[#DBA858]"
            />
          </div>

          <div>
            <label className="block text-sm text-[#DBA858]/80 mb-1">Описание (опционально)</label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Короткое описание"
              className="bg-[#031B28] border-[#E89C31]/20 text-[#DBA858]"
            />
          </div>

          <div>
            <label className="block text-sm text-[#DBA858]/80 mb-1">Теги (через запятую)</label>
            <Input
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="подарки, романтика, дети"
              className="bg-[#031B28] border-[#E89C31]/20 text-[#DBA858]"
            />
          </div>

          <Button
            onClick={handleImport}
            disabled={loading}
            className="w-full bg-[#E89C31] text-[#031B28] hover:bg-[#DBA858] font-semibold py-6 text-lg rounded-xl"
          >
            {loading ? "Импортирую..." : "Импортировать"}
          </Button>

          {error && (
            <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-[#E89C31] mb-4">Результат импорта</h2>
              <pre className="bg-[#031B28] border border-[#E89C31]/20 rounded-xl p-4 text-[#DBA858]/80 text-xs overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
              <p className="mt-4 text-sm text-[#DBA858]/60">
                Скопируйте данные и добавьте в <code className="text-[#E89C31]">src/data/blogPosts.ts</code>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default BlogAdmin;
