import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  ChevronRight,
  Heart,
  ImagePlus,
  PackageCheck,
  Sparkles,
} from "lucide-react";

import SEO from "@/components/SEO";
import { DeliveryFaqAnswer } from "@/components/DeliveryFaqAnswer";
import { DELIVERY_FAQ } from "@/components/deliveryFaq";
import FairytellerInlineConstructor from "@/components/FairytellerInlineConstructor";
import LandingHeader from "@/components/LandingHeader";
import LegalFooterLinks from "@/components/LegalFooterLinks";
import logoImage from "@/assets/logo.png";
import gorodCoverImage from "@/assets/landing-photos/photo-tale-universal/gorod-vlyublennyh-serdec-cover.webp";
import cyberCoverStackImage from "@/assets/landing-photos/photo-tale-universal/ischezayushchiy-express-cover-stack.webp";
import cactusOpenBookImage from "@/assets/landing-photos/photo-tale-universal/tainy-kaktusovoy-planety-open-book.webp";
import zagadkaOpenSpreadImage from "@/assets/landing-photos/photo-tale-universal/zagadka-ovsyannikovskogo-leta-open-spread.webp";
import zvezdopadBackCoverImage from "@/assets/landing-photos/photo-tale-universal/zvezdopad-nad-volgoy-back-cover.webp";
import zvezdopadBookshelfImage from "@/assets/landing-photos/photo-tale-universal/zvezdopad-nad-volgoy-bookshelf.webp";
import zagadkaFrontImage from "@/assets/landing-photos/skazka-photo-zagadka-front.webp";
import zagadkaBackImage from "@/assets/landing-photos/skazka-photo-zagadka-back.webp";
import zagadkaSpreadImage from "@/assets/landing-photos/skazka-photo-zagadka-spread.webp";

const typeStyle = {
  fontFamily:
    '"Avenir Next", "Helvetica Neue", Jost, Futura, Arial, sans-serif',
};

const sectionTitleClass =
  "max-w-[980px] text-[36px] font-black uppercase leading-[1.12] tracking-normal md:text-[58px] xl:text-[62px]";

const metrics = [
  ["От 3500₽", "Печатная книга"],
  ["От 3-х дней", "Доставка по РФ"],
  ["40 страниц", "Полная история"],
];

const occasions = [
  {
    title: "День рождения",
    text: "Персональная сказка по фото, где ребёнок, друг или близкий становится героем приключения, комедии или тёплой семейной истории.",
  },
  {
    title: "Новый год",
    text: "Зимняя книга с подарками, семейным теплом и героем, который проходит свой путь в мире новогодних чудес.",
  },
  {
    title: "Выпускной",
    text: "Книга про взросление, смелость, друзей и новый этап: для детского сада, школы или важного перехода.",
  },
  {
    title: "Шутливый подарок",
    text: "Добрая история, где друг, коллега или близкий попадает в комедийное приключение и выходит из него победителем.",
  },
  {
    title: "Подарок бабушке",
    text: "Тёплая книга, где можно вернуться в детство, семейные места и важные воспоминания вместе с родителями или бабушкой.",
  },
  {
    title: "Коллеге",
    text: "Игровая история про человека из команды: рабочие подвиги, волшебные задачи и победа над условным вселенским злом.",
  },
];

const ingredients = [
  "чёткое фото лица и комплекции",
  "имя, возраст и характер героев",
  "любимое место или мир истории",
  "стиль иллюстраций",
  "игрушка, питомец или талисман",
  "важная деталь для сюжета",
];

const process = [
  {
    icon: ImagePlus,
    title: "Выберите жанр",
    text: "Приключение, фэнтези, магический мир, киберпанк или романтическая история задают настроение и сюжет будущей сказки.",
  },
  {
    icon: Sparkles,
    title: "Заполните поля",
    text: "Чтобы сделать сюжет более личным, добавьте фото, имя, возраст, характер, место действия и важную деталь: талисман, питомца, воспоминание или предмет.",
  },
  {
    icon: Camera,
    title: "Выберите стиль",
    text: "Фотореализм, акварель, пластилин, вязанный стиль, аниме и другие варианты помогают задать визуальный характер книги.",
  },
  {
    icon: PackageCheck,
    title: "Получите книгу",
    text: "Через несколько минут появится превью. После оплаты мы вычитаем текст, соберём макет и отправим книгу в печать с бесплатной доставкой по России.",
  },
];

const faqs = [
  {
    question: "Насколько похож герой на фото?",
    answer:
      "Фото помогает сохранить узнаваемые черты: причёску, форму лица, общее выражение, одежду или важные детали. Это не фотокопия, а художественная иллюстрация в стиле книги.",
  },
  {
    question: "Для кого подойдут эти истории?",
    answer:
      "Для детей, взрослых, пар, друзей, родителей и коллег. Формат адаптируется под героя: это может быть сказка, приключение, романтическая история, шутливый подарок или семейная книга.",
  },
  {
    question: "Что значит бумажная книга?",
    answer:
      "Fairyteller печатает небольшие бумажные книги. Сейчас доступна версия в мягком переплёте 13 × 13 см: 5 глав, около 40 страниц и отдельные иллюстрации к сюжету.",
  },
  {
    question: "Сколько стоит и как быстро делается?",
    answer:
      "Печатная книга стоит от 3500₽. Первое превью появляется за несколько минут, после оплаты команда Fairyteller вычитывает текст, собирает макет и передаёт книгу в печать.",
  },
  DELIVERY_FAQ,
];

const photoHeroSlots = ["Главный герой", "Герой 2", "Герой 3", "Герой 4"];

const CtaStrip = () => (
  <a
    href="#create"
    className="group flex min-h-[62px] items-center justify-center border-b border-black bg-black px-5 text-center text-[15px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#E89C31] hover:text-black md:text-[20px]"
  >
    Создать свою книгу
    <ArrowRight className="ml-4 h-6 w-6 transition group-hover:translate-x-1" />
  </a>
);

const heroImages = [
  { title: "Персональная книга Город влюбленных сердец в руках", image: gorodCoverImage },
  { title: "Персональная книга Исчезающий экспресс на стопке книг", image: cyberCoverStackImage },
  { title: "Открытая персональная книга Загадка овсянниковского лета", image: zagadkaOpenSpreadImage },
  { title: "Книга Тайны кактусовой планеты с открытым разворотом", image: cactusOpenBookImage },
  { title: "Персональная книга Звездопад над Волгой на полке", image: zvezdopadBookshelfImage },
  { title: "Задняя обложка книги Звездопад над Волгой", image: zvezdopadBackCoverImage },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Персональная сказка по фото — бумажная книга на заказ",
    description:
      "Создайте персональную сказку по фото для ребёнка, пары, друга или близкого: узнаваемый герой, сюжет, иллюстрации, редактура, печать и бесплатная доставка по России.",
    brand: { "@type": "Brand", name: "Fairyteller" },
    image: "https://fairyteller.ru/images/book-exmpl6.jpg",
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: "3500",
      availability: "https://schema.org/InStock",
      url: "https://fairyteller.ru/podarok/skazka-po-foto",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.structuredAnswer ?? item.answer },
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: "https://fairyteller.ru/" },
      { "@type": "ListItem", position: 2, name: "Сказка по фото", item: "https://fairyteller.ru/podarok/skazka-po-foto" },
    ],
  },
];

const PhotoFairyTaleLanding = () => {
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex((index) => (index + 1) % heroImages.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-black" style={typeStyle}>
      <SEO
        title="Персональная сказка по фото — бумажная книга на заказ | Fairyteller"
        description="Создайте персональную сказку по фото для ребёнка, пары, друга или близкого: узнаваемый герой, сюжет, иллюстрации, печать от 3500₽ и бесплатная доставка по России."
        path="/podarok/skazka-po-foto"
        image="/images/book-exmpl6.jpg"
        type="product"
        jsonLd={jsonLd}
      />
      <style>
        {`
          .photo-tale-page h1,
          .photo-tale-page h2,
          .photo-tale-page h3 {
            color: #E89C31;
            font-family: "Avenir Next", "Helvetica Neue", Jost, Futura, Arial, sans-serif;
            letter-spacing: 0;
            text-shadow: none;
          }

          .photo-tale-page,
          .photo-tale-page * {
            min-width: 0;
            box-sizing: border-box;
          }

          .photo-tale-page {
            max-width: 100vw;
          }

          .photo-tale-page h1,
          .photo-tale-page h2,
          .photo-tale-page h3,
          .photo-tale-page p,
          .photo-tale-page a {
            overflow-wrap: break-word;
          }

          .photo-tale-page a,
          .photo-tale-page button,
          .photo-tale-page input,
          .photo-tale-page textarea {
            font-family: inherit;
          }

          .photo-tale-page .fairyteller-choice-strip {
            overscroll-behavior-x: contain;
            scrollbar-width: none;
          }

          .photo-tale-page .fairyteller-choice-strip::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>

      <div className="photo-tale-page">
        <LandingHeader />

        <section className="mx-auto grid w-full max-w-[1480px] min-w-0 overflow-hidden border-black lg:min-h-[640px] lg:grid-cols-[1.08fr_0.92fr]">
          <div className="flex min-w-0 flex-col justify-between border-black px-5 py-9 md:px-8 md:py-11 lg:border-r lg:pb-16">
            <div className="w-full max-w-[360px] md:max-w-none">
              <h1 className="w-full max-w-full break-normal text-[26px] font-black uppercase leading-[1.08] tracking-normal min-[420px]:text-[30px] sm:text-[34px] md:max-w-[760px] md:text-[34px] lg:text-[34px] 2xl:text-[42px]">
                <span className="block">Персональная сказка по фото:</span>
                <span className="block">станьте героем книги</span>
              </h1>
              <p className="mt-5 w-full max-w-[340px] text-[16px] leading-[1.42] md:max-w-[680px] md:text-[21px] md:leading-[1.35]">
                Создайте историю по фото: узнайте себя и своих близких в сюжете, иллюстрациях и деталях.
                Это стильная бумажная книга на заказ, где главные герои — вы, ваши близкие и друзья. Доставка по России бесплатная.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#create"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-black px-4 py-3 text-center text-[12px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#5e6264] sm:w-auto sm:px-6 sm:text-[13px]"
                >
                  <BookOpen className="h-5 w-5" />
                  Создать сказку по фото
                </a>
                <a
                  href="#examples"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 border border-black bg-white px-4 py-3 text-center text-[12px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-black hover:text-white sm:w-auto sm:px-6 sm:text-[13px]"
                >
                  Смотреть примеры
                  <ArrowRight className="h-5 w-5" />
                </a>
              </div>
            </div>

            <div className="mt-8 grid w-full max-w-[340px] border-t border-black text-sm font-bold uppercase tracking-normal min-[520px]:max-w-full min-[520px]:grid-cols-3 md:w-auto lg:mt-10">
              {metrics.map(([value, label]) => (
                <div key={value} className="border-black py-3 min-[520px]:border-r min-[520px]:px-3 min-[520px]:first:pl-0 min-[520px]:last:border-r-0">
                  <span className="block text-[13px] leading-tight min-[640px]:text-[15px]">{value}</span>
                  <span className="mt-1 block text-[10px] leading-tight text-[#5e6264] min-[640px]:text-[11px]">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 overflow-hidden bg-[#f5f5f5]">
            <div className="relative flex h-full min-h-[420px] items-center justify-center md:min-h-[560px] lg:min-h-0">
              <button
                type="button"
                onClick={() => setHeroIndex((index) => (index + 1) % heroImages.length)}
                className="absolute inset-0 cursor-pointer"
                aria-label="Показать следующее фото сказки по фото"
              >
                {heroImages.map((item, index) => (
                  <img
                    key={item.title}
                    src={item.image}
                    alt={item.title}
                    loading={index === 0 ? "eager" : "lazy"}
                    decoding="async"
                    fetchPriority={index === 0 ? "high" : "auto"}
                    className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 ease-out ${
                      index === heroIndex ? "opacity-100" : "opacity-0"
                    }`}
                  />
                ))}
              </button>
              <div className="absolute bottom-5 left-0 right-0 z-10 flex justify-center gap-2">
                {heroImages.map((item, index) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => setHeroIndex(index)}
                    className={`h-2.5 w-8 border border-black transition ${
                      index === heroIndex ? "bg-black" : "bg-white/85 hover:bg-white"
                    }`}
                    aria-label={`Показать ${item.title}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="meaning" className="scroll-mt-24 border-y border-black bg-[#fae7e1] px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.78fr_1.22fr]">
            <div>
              <h2 className={sectionTitleClass}>Не шаблон. Личная история.</h2>
            </div>
            <div className="grid border-l border-t border-black md:grid-cols-2">
              <article className="border-b border-r border-black bg-white p-5">
                <Heart className="h-7 w-7" />
                <h3 className="mt-10 text-[34px] font-black uppercase leading-none">На основе героя</h3>
                <p className="mt-5 text-[16px] leading-7 text-[#5e6264]">
                  Добавьте фото, имя, возраст, характер, любимые места и маленькие привычки.
                  Так персональная сказка становится не абстрактной историей, а книгой про конкретного человека.
                </p>
              </article>
              <article className="border-b border-r border-black bg-white p-5">
                <BookOpen className="h-7 w-7" />
                <h3 className="mt-10 text-[34px] font-black uppercase leading-none">Хочется читать</h3>
                <p className="mt-5 text-[16px] leading-7 text-[#5e6264]">
                  Персонализированный сюжет, знакомые места и красивые иллюстрации превращают подарок
                  в книгу, которую хочется перелистывать и рассматривать.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="create" className="scroll-mt-24 border-b border-black bg-[#fae7e1] px-5 py-9 md:px-8 md:py-11">
          <FairytellerInlineConstructor
            availableWorldIds={["adventure", "hogwarts", "fantasy", "cyber"]}
            worldTabLabel="Жанр"
            worldLegend="Выберите жанр"
            heading="Создайте сказку по фото."
            description="Добавьте фото, имя, характер, место действия и важную деталь героя. Конструктор соберёт персональную сказку с фото и превью иллюстраций."
            locationLabel="Место истории"
            locationPlaceholder="Лес, город, дом, школа, волшебная страна, деревня у бабушки"
            artifactLabel="Важная деталь"
            artifactPlaceholder="Игрушка, рюкзак, питомец, любимая книга, талисман, шутка"
            heroIntro="Добавьте главного героя. Фото поможет сохранить узнаваемые черты в иллюстрациях; героем может быть ребёнок, взрослый, пара, друг, коллега или даже питомец."
            defaultVisibleHeroIndexes={[0]}
            requiredHeroCount={1}
            heroSlots={photoHeroSlots}
            submitLabel="Создать сказку по фото"
          />
        </section>

        <section id="occasions" className="scroll-mt-24 border-b border-black bg-white px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <h2 className={sectionTitleClass}>Повод для необычного подарка.</h2>
            </div>
            <div className="grid border-l border-t border-black md:grid-cols-3">
              {occasions.map((item) => (
                <article key={item.title} className="min-h-[230px] border-b border-r border-black bg-[#f5f5f5] p-5">
                  <h3 className="text-[28px] font-black uppercase leading-none">{item.title}</h3>
                  <p className="mt-6 text-[15px] leading-7 text-[#5e6264]">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="examples" className="scroll-mt-24 border-b border-black bg-[#f5f5f5] px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto max-w-[1480px]">
            <div className="mb-9 grid gap-5 md:grid-cols-[1fr_440px] md:items-end">
              <h2 className={sectionTitleClass}>Что добавить в сказку.</h2>
              <p className="text-[18px] leading-7 text-[#5e6264]">
                Фото помогает сохранить узнаваемые черты, а детали делают сюжет более личным:
                так сказка по фото превращается в настоящую подарочную книгу.
              </p>
            </div>

            <div className="grid gap-0 border-l border-t border-black lg:grid-cols-[0.9fr_1.1fr]">
              <div className="grid border-b border-r border-black bg-white p-5 md:grid-cols-2">
                {ingredients.map((item) => (
                  <span key={item} className="flex min-h-[64px] items-center gap-3 border-b border-black py-3 text-[15px] font-bold uppercase leading-5 last:border-b-0 md:odd:border-r md:odd:pr-4 md:even:pl-4">
                    <Check className="h-5 w-5 shrink-0" />
                    {item}
                  </span>
                ))}
              </div>
              <div className="grid border-b border-r border-black bg-white md:grid-cols-3">
                <img src={zagadkaSpreadImage} alt="Разворот персональной сказки с иллюстрациями" className="h-[260px] w-full border-b border-black object-cover md:h-full md:min-h-[260px] md:border-b-0 md:border-r" />
                <img src={zagadkaFrontImage} alt="Фронтальная обложка именной книги с фото" className="h-[260px] w-full border-b border-black object-cover md:h-full md:min-h-[260px] md:border-b-0 md:border-r" />
                <img src={zagadkaBackImage} alt="Задняя обложка персональной сказки" className="h-[260px] w-full object-cover md:h-full md:min-h-[260px]" />
              </div>
            </div>
          </div>
        </section>

        <section id="process" className="scroll-mt-24 border-b border-black bg-white px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <h2 className={sectionTitleClass}>Как создать книгу.</h2>
            </div>
            <div className="grid border-l border-t border-black sm:grid-cols-2">
              {process.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="min-h-[230px] border-b border-r border-black bg-[#f5f5f5] p-5">
                    <Icon className="h-7 w-7" />
                    <h3 className="mt-9 text-[30px] font-black uppercase leading-none">{item.title}</h3>
                    <p className="mt-5 text-[16px] leading-7 text-[#5e6264]">{item.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <CtaStrip />

        <section id="faq" className="scroll-mt-24 border-b border-black bg-[#f5f5f5] px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <h2 className={sectionTitleClass}>Вопросы и ответы.</h2>
            </div>
            <div className="border-l border-t border-black">
              {faqs.map((item) => (
                <article key={item.question} className="grid border-b border-r border-black bg-white p-5 md:grid-cols-[0.48fr_0.52fr] md:gap-8">
                  <h3 className="text-[24px] font-black uppercase leading-[0.98]">{item.question}</h3>
                  <p className="mt-4 text-[16px] leading-7 text-[#5e6264] md:mt-0">
                    <DeliveryFaqAnswer answer={item.answer} deliveryHref={item.deliveryHref} />
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t border-black bg-black px-5 py-12 text-white md:px-8 md:py-14">
          <div className="mx-auto max-w-[1480px]">
            <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <img src={logoImage} alt="FairyTeller" className="h-12 w-auto bg-white px-2 py-1" />
                <p className="mt-5 max-w-[620px] text-[15px] leading-7 text-white/60">
                  FairyTeller помогает создавать персональные бумажные книги по фото: для детей, любимых, родителей, друзей и важных событий.
                </p>
                <nav className="mt-6 flex flex-wrap gap-4 text-[12px] font-bold uppercase tracking-[0.12em] text-white/70">
                  <a href="#process" className="hover:text-white hover:underline">Как работает</a>
                  <a href="#create" className="hover:text-white hover:underline">Создать</a>
                  <a href="#examples" className="hover:text-white hover:underline">Примеры</a>
                  <Link to="/podarok/dlya-pary" className="hover:text-white hover:underline">Для пары</Link>
                  <Link to="/podarok/na-godovshchinu" className="hover:text-white hover:underline">На годовщину</Link>
                  <a href="#faq" className="hover:text-white hover:underline">FAQ</a>
                  <Link to="/blog" className="hover:text-white hover:underline">Журнал</Link>
                </nav>
                <LegalFooterLinks className="mt-4 flex flex-wrap gap-4 text-[12px] font-bold uppercase tracking-[0.12em] text-white/50" />
              </div>
              <div className="md:text-right">
                <div className="flex flex-wrap gap-3 md:justify-end">
                  <a href="https://vk.com/fairyteller" target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center border border-white px-5 text-[12px] font-bold uppercase tracking-[0.1em] text-white transition hover:bg-white hover:text-black">VK</a>
                  <a href="https://dzen.ru/fairyteller" target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center border border-white px-5 text-[12px] font-bold uppercase tracking-[0.1em] text-white transition hover:bg-white hover:text-black">Дзен</a>
                  <a href="#create" className="inline-flex h-11 items-center justify-center gap-2 border border-white bg-white px-5 text-[12px] font-bold uppercase tracking-[0.1em] text-black transition hover:bg-black hover:text-white">
                    Создать книгу
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </div>
                <p className="mt-6 text-[13px] font-bold uppercase tracking-[0.12em] text-white/50">
                  2026. Fairyteller.ru — персональные бумажные книги в подарок
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
};

export default PhotoFairyTaleLanding;
