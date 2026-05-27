import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const indexPath = path.join(distDir, "index.html");
const siteUrl = "https://fairyteller.ru";
const defaultImage =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/yqflbB2p1tgOlRatLU4jwL7BzS02/social-images/social-1765873256333-Untitled-3.jpg";

const commonFaq = [
  ["Сколько стоит книга?", "Персональная бумажная книга стоит от 3500₽. В стоимость входит подготовка макета, редактура, печать и доставка по России."],
  ["Когда появится первое превью?", "Готовую историю с иллюстрациями можно увидеть через несколько минут после заполнения конструктора."],
  ["Можно ли добавить фотографии?", "Да. Фото помогают сделать героев похожими на вас и ваших близких, сохраняя книжный стиль иллюстраций."],
  ["Можно ли сделать книгу для взрослого?", "Да. Это может быть романтическая история, приключение, фэнтези или другая персональная история для взрослого человека."],
];

const pages = [
  {
    path: "/",
    title: "Книги, где ты главный герой — персональная книга в подарок | Fairyteller",
    description:
      "Создайте персональную бумажную книгу о близком человеке: уникальный сюжет, иллюстрации по фото, редактура и доставка по России. Подарок от 3500₽.",
    type: "product",
    jsonLd: [
      organizationJsonLd(),
      productJsonLd("Персональная бумажная книга", "Персональная бумажная книга о близком человеке с уникальным сюжетом, иллюстрациями по фото, редактурой и доставкой по России.", "/"),
      faqJsonLd(commonFaq),
    ],
    fallback: `
      <main>
        <h1>Книги, где ты главный герой</h1>
        <p>Fairyteller создает персональные бумажные книги о близком человеке: уникальный сюжет, иллюстрации по фото, редактура и доставка по России.</p>
        <p>Подойдет как подарок ребенку, любимому человеку, родителям, другу или паре.</p>
        <ul>
          <li>Первое превью за несколько минут</li>
          <li>Печатная книга от 3500₽</li>
          <li>Печать после оплаты за один день</li>
        </ul>
        <p><a href="/create">Создать персональную книгу</a></p>
      </main>`,
  },
  {
    path: "/create",
    title: "Создать персональную книгу по фото — конструктор Fairyteller",
    description:
      "Создайте персональную книгу по фото: выберите мир, добавьте героев и получите превью за несколько минут. Печатная книга от 3500₽ с доставкой по России.",
    type: "product",
    jsonLd: [
      productJsonLd("Создание персональной книги", "Конструктор персональных книг по фото: превью за несколько минут, редактура, печать и доставка по России.", "/create"),
    ],
    fallback: `
      <main>
        <h1>Создать персональную книгу по фото</h1>
        <p>Выберите мир, добавьте героев, фото, место действия и стиль иллюстраций. Fairyteller соберет персональную историю и подготовит книгу к печати.</p>
        <ol>
          <li>Расскажите о герое</li>
          <li>Выберите мир и стиль</li>
          <li>Получите превью</li>
          <li>Закажите печатную книгу</li>
        </ol>
      </main>`,
  },
  {
    path: "/podarok/dlya-pary",
    title: "Подарок для пары — персональная книга о вашей истории | Fairyteller",
    description:
      "Создайте подарок для пары: романтическую персональную книгу по фото, где двое становятся главными героями. Превью за несколько минут, печать от 3500₽.",
    type: "product",
    jsonLd: [
      productJsonLd("Персональная книга для пары", "Романтическая персональная книга по фото: история для двоих, где пара становится главными героями.", "/podarok/dlya-pary"),
      faqJsonLd([
        ["Это подходит только для влюбленных?", "Нет. Книга может быть про супругов, жениха и невесту, друзей, родителей или пару, которую хочется поздравить общим подарком."],
        ["Можно ли сделать историю без детской сказочности?", "Да. Для пары лучше работает формат романтической персональной книги: больше воспоминаний, мест, диалогов и взрослой интонации."],
        ["Нужно ли загружать фото двоих?", "Желательно, но не обязательно. Фото усиливают узнаваемость героев в иллюстрациях."],
        ["Сколько стоит печатная книга?", "Персональная бумажная книга стоит от 3500₽. В стоимость входит подготовка макета, редактура, печать и доставка по России."],
      ]),
      breadcrumbJsonLd([
        ["Главная", "/"],
        ["Подарок для пары", "/podarok/dlya-pary"],
      ]),
    ],
    fallback: `
      <main>
        <h1>Подарок для пары: книга, где вы вдвоем главные герои</h1>
        <p>Соберите романтическую персональную историю по фото: ваши имена, места, шутки, воспоминания и общий символ станут настоящей бумажной книгой.</p>
        <h2>Для каких поводов</h2>
        <ul>
          <li>годовщина отношений</li>
          <li>14 февраля</li>
          <li>свадьба или помолвка</li>
          <li>день рождения партнера</li>
          <li>подарок паре друзей</li>
        </ul>
        <h2>Что можно добавить</h2>
        <p>Имена, фото, место знакомства, общую шутку, питомца, город, маршрут, предмет-символ и настроение истории.</p>
        <p><a href="/create">Создать книгу для пары</a></p>
      </main>`,
  },
  {
    path: "/romantic",
    title: "Романтическая книга в подарок — история любви для двоих | Fairyteller",
    description:
      "Создайте романтическую персональную книгу про вашу пару: история любви, фото, важные места, иллюстрации и печатная версия с доставкой.",
    type: "product",
    jsonLd: [productJsonLd("Романтическая персональная книга", "История любви для двоих с персональным сюжетом и иллюстрациями.", "/romantic")],
    fallback: `
      <main>
        <h1>Романтическая книга в подарок</h1>
        <p>Fairyteller создает историю любви, где главные герои - это вы.</p>
        <p><a href="/create">Создать романтическую книгу</a></p>
      </main>`,
  },
  {
    path: "/8march",
    title: "Персональная книга на 8 марта — необычный подарок для нее | Fairyteller",
    description:
      "Создайте персональную книгу на 8 марта: романтическая или теплая история по фото, превью за несколько минут и печатная версия с доставкой.",
    type: "product",
    jsonLd: [productJsonLd("Персональная книга на 8 марта", "Необычный подарок для нее: персональная история по фото с печатной версией.", "/8march")],
    fallback: `
      <main>
        <h1>Персональная книга на 8 марта</h1>
        <p>Необычный подарок для нее: история по фото, личные детали, иллюстрации и печатная книга.</p>
        <p><a href="/create">Создать книгу</a></p>
      </main>`,
  },
  {
    path: "/blog",
    title: "Журнал Fairyteller — идеи персональных подарков и книг",
    description:
      "Идеи подарков, поводы и разборы персональных книг: как выбрать сюжет, какие детали добавить и почему хороший подарок начинается с внимания.",
    type: "website",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Blog",
        name: "Журнал Fairyteller",
        description: "Идеи подарков, поводы и разборы персональных книг",
        url: `${siteUrl}/blog`,
      },
    ],
    fallback: `
      <main>
        <h1>Журнал Fairyteller</h1>
        <p>Идеи подарков, советы по созданию персональных книг и разборы поводов.</p>
        <ul>
          <li><a href="/blog/imennaya-skazka-na-den-rozhdeniya-rebenku">Именная сказка на день рождения ребенку</a></li>
          <li><a href="/blog/imennaya-kniga-dlya-rebenka">Именная книга для ребенка на заказ</a></li>
          <li><a href="/blog/nejroskazki-na-zakaz-personalnaya-kniga">Нейросказки на заказ</a></li>
        </ul>
      </main>`,
  },
  blogPage("imennaya-skazka-na-den-rozhdeniya-rebenku", "Именная сказка на день рождения ребёнку — Fairyteller", "Персональная сказка на день рождения — подарок, который запоминается ощущением «это про меня». Книга с сюжетом, иллюстрациями и печатью.", "2026-02-22"),
  blogPage("imennaya-kniga-dlya-rebenka", "Именная книга для ребёнка на заказ — Fairyteller", "Персональная сказка, где герой носит имя вашего ребёнка. Настоящая книга с сюжетом, иллюстрациями и печатью от 1 экземпляра.", "2026-02-22"),
  blogPage("nejroskazki-na-zakaz-personalnaya-kniga", "Нейросказки на заказ: персональная бумажная книга — Fairyteller", "Fairyteller создает сказки про вас и близких: внятный сюжет, выбранный стиль иллюстраций, редактура перед печатью и настоящая книга.", "2026-02-16"),
  blogPage("samyj-neudachnyj-podarok-blizkomu", "Самый неудачный подарок близкому — Fairyteller", "Как правильно дарить подарки: почему важен контекст, внимание и личный смысл, а не только цена.", "2026-02-03"),
];

const baseHtml = await fs.readFile(indexPath, "utf8");

for (const page of pages) {
  const html = buildHtml(baseHtml, page);
  const outputPath =
    page.path === "/"
      ? indexPath
      : path.join(distDir, page.path.replace(/^\/+/, ""), "index.html");

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, html);
}

console.log(`Generated SEO HTML for ${pages.length} routes.`);

function buildHtml(template, page) {
  const canonicalUrl = `${siteUrl}${page.path}`;
  let html = template;

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(page.title)}</title>`);
  html = setMeta(html, "name", "description", page.description);
  html = setMeta(html, "name", "robots", "index,follow");
  html = setMeta(html, "property", "og:title", page.title);
  html = setMeta(html, "property", "og:description", page.description);
  html = setMeta(html, "property", "og:type", page.type || "website");
  html = setMeta(html, "property", "og:url", canonicalUrl);
  html = setMeta(html, "property", "og:image", page.image || defaultImage);
  html = setMeta(html, "property", "og:site_name", "Fairyteller");
  html = setMeta(html, "property", "og:locale", "ru_RU");
  html = setMeta(html, "name", "twitter:card", "summary_large_image");
  html = setMeta(html, "name", "twitter:title", page.title);
  html = setMeta(html, "name", "twitter:description", page.description);
  html = setMeta(html, "name", "twitter:image", page.image || defaultImage);
  html = setCanonical(html, canonicalUrl);
  html = setJsonLd(html, page.jsonLd || []);
  html = html.replace(
    /<div id="root">[\s\S]*?<\/div>\s*(?=<script type="module")/,
    `<div id="root">${wrapFallback(page.fallback)}</div>\n    `,
  );

  return html;
}

function setMeta(html, attr, name, content) {
  const escaped = escapeAttr(content);
  const tag = `<meta ${attr}="${escapeAttr(name)}" content="${escaped}">`;
  const selector = new RegExp(`<meta\\s+${attr}="${escapeRegExp(name)}"[^>]*>`, "i");

  if (selector.test(html)) {
    return html.replace(selector, tag);
  }

  return html.replace("</head>", `  ${tag}\n</head>`);
}

function setCanonical(html, href) {
  const tag = `<link rel="canonical" href="${escapeAttr(href)}">`;

  if (/<link\s+rel="canonical"[^>]*>/i.test(html)) {
    return html.replace(/<link\s+rel="canonical"[^>]*>/i, tag);
  }

  return html.replace("</head>", `  ${tag}\n</head>`);
}

function setJsonLd(html, data) {
  const content = JSON.stringify(data).replace(/</g, "\\u003c");
  const tag = `<script type="application/ld+json">${content}</script>`;

  if (/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/i.test(html)) {
    return html.replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/i, tag);
  }

  return html.replace("</head>", `  ${tag}\n</head>`);
}

function wrapFallback(content) {
  return `
      <div style="max-width: 860px; margin: 0 auto; padding: 40px 20px; font-family: Arial, sans-serif; color: #111; line-height: 1.55;">
        ${content}
      </div>`;
}

function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Fairyteller",
    url: siteUrl,
    logo: `${siteUrl}/apple-touch-icon.png`,
    sameAs: ["https://vk.com/fairyteller", "https://dzen.ru/fairyteller"],
  };
}

function productJsonLd(name, description, pagePath) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    brand: { "@type": "Brand", name: "Fairyteller" },
    image: `${siteUrl}/images/book-exmpl6.jpg`,
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: "3500",
      availability: "https://schema.org/InStock",
      url: `${siteUrl}${pagePath}`,
    },
  };
}

function faqJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

function breadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, pagePath], index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
      item: `${siteUrl}${pagePath}`,
    })),
  };
}

function blogPage(slug, title, description, datePublished) {
  const pagePath = `/blog/${slug}`;

  return {
    path: pagePath,
    title,
    description,
    type: "article",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title.replace(" — Fairyteller", ""),
        description,
        datePublished,
        image: `${siteUrl}/images/book-exmpl6.jpg`,
        url: `${siteUrl}${pagePath}`,
        author: { "@type": "Organization", name: "Fairyteller" },
        publisher: { "@type": "Organization", name: "Fairyteller", url: siteUrl },
      },
      breadcrumbJsonLd([
        ["Главная", "/"],
        ["Журнал", "/blog"],
        [title.replace(" — Fairyteller", ""), pagePath],
      ]),
    ],
    fallback: `
      <main>
        <h1>${escapeHtml(title.replace(" — Fairyteller", ""))}</h1>
        <p>${escapeHtml(description)}</p>
        <p><a href="/blog">Все статьи журнала</a></p>
        <p><a href="/create">Создать персональную книгу</a></p>
      </main>`,
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
