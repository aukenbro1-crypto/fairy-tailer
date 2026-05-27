import { useEffect } from "react";

const SITE_URL = "https://fairyteller.ru";
const DEFAULT_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/yqflbB2p1tgOlRatLU4jwL7BzS02/social-images/social-1765873256333-Untitled-3.jpg";

type SEOProps = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "article" | "product";
  jsonLd?: object | object[];
};

const SEO = ({
  title,
  description,
  path = "/",
  image = DEFAULT_IMAGE,
  type = "website",
  jsonLd,
}: SEOProps) => {
  useEffect(() => {
    const canonicalUrl = `${SITE_URL}${path}`;

    document.title = title;
    setMeta("description", description);
    setMeta("robots", "index,follow");
    setMeta("og:title", title);
    setMeta("og:description", description);
    setMeta("og:type", type);
    setMeta("og:url", canonicalUrl);
    setMeta("og:image", absoluteUrl(image));
    setMeta("og:site_name", "Fairyteller");
    setMeta("og:locale", "ru_RU");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", absoluteUrl(image));
    setCanonical(canonicalUrl);

    if (jsonLd) {
      setJsonLd(jsonLd);
    }

    return () => {
      document.querySelector('link[data-route-canonical="true"]')?.remove();
      document.getElementById("route-jsonld")?.remove();
    };
  }, [description, image, jsonLd, path, title, type]);

  return null;
};

function setMeta(name: string, content: string) {
  const attr = name.startsWith("og:") ? "property" : "name";
  let element = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, name);
    document.head.appendChild(element);
  }

  element.content = content;
}

function setCanonical(href: string) {
  let element = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;

  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }

  element.href = href;
  element.setAttribute("data-route-canonical", "true");
}

function setJsonLd(data: object | object[]) {
  let element = document.getElementById("route-jsonld") as HTMLScriptElement | null;

  if (!element) {
    element = document.createElement("script");
    element.type = "application/ld+json";
    element.id = "route-jsonld";
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify(data);
}

function absoluteUrl(url: string) {
  if (url.startsWith("http")) {
    return url;
  }

  return `${SITE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

export default SEO;
