import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  ChevronRight,
  Gift,
  Heart,
  PackageCheck,
  Sparkles,
} from "lucide-react";

import SEO from "@/components/SEO";
import FairytellerInlineConstructor from "@/components/FairytellerInlineConstructor";
import LandingHeader from "@/components/LandingHeader";
import logoImage from "@/assets/logo.png";
import wifePoletOpenHandsImage from "@/assets/landing-photos/wife-polet-open-hands.webp";
import wifePoletBookshelfImage from "@/assets/landing-photos/wife-polet-bookshelf.webp";
import wifePoletBackCoverImage from "@/assets/landing-photos/wife-polet-back-cover.webp";
import wifeZvezdopadClosedBookImage from "@/assets/landing-photos/wife-zvezdopad-closed-book.webp";
import wifeZvezdopadOpenTableImage from "@/assets/landing-photos/wife-zvezdopad-open-table.webp";
import wifeZvezdopadWideHeroImage from "@/assets/landing-photos/wife-zvezdopad-wide-hero.webp";

const typeStyle = {
  fontFamily:
    '"Avenir Next", "Helvetica Neue", Jost, Futura, Arial, sans-serif',
};

const sectionTitleClass =
  "max-w-[980px] text-[36px] font-black uppercase leading-[1.12] tracking-normal md:text-[58px] xl:text-[62px]";

const metrics = [
  ["От 2-х дней", "Доставка по РФ"],
  ["40 страниц", "Полная история"],
  ["5 глав", "С иллюстрациями"],
];

const ingredients = [
  "ее имя и характер",
  "фото для узнаваемой героини",
  "любимые места и маршруты",
  "детали вашей жизни вместе",
  "маленькие привычки и фразы",
  "настроение: нежно, смешно или кинематографично",
];

const process = [
  {
    icon: Heart,
    title: "Вы рассказываете о жене",
    text: "Имя, характер, детали которые делают ее собой: любимые места, важные моменты, что-то из вашей жизни вместе. Занимает 10-15 минут.",
  },
  {
    icon: Camera,
    title: "Мы пишем книгу",
    text: "История создается под конкретного человека, не шаблон с вставленным именем. Иллюстрации рисуются по фотографии: герой похож на нее.",
  },
  {
    icon: PackageCheck,
    title: "Книга приезжает домой",
    text: "Твердый переплет, качественная печать, доставка по России от 2 дней. Можно заказать заранее или успеть к дате.",
  },
];

const romanticLockedWorld = {
  value: "romantic_story",
  title: "Романтическая история",
  text: "Теплая персональная книга о ней: характер, детали вашей жизни вместе, узнаваемые сцены и финал с ощущением подарка от мужа.",
};

const wifeHeroSlots = ["Жена", "Муж", "Герой 3", "Герой 4"];

const heroImages = [
  { title: "Открытый разворот персональной книги для жены", image: wifePoletOpenHandsImage },
  { title: "Книга Полет над древом на полке", image: wifePoletBookshelfImage },
  { title: "Задняя обложка персональной книги о семье", image: wifePoletBackCoverImage },
];

const exampleImages = [
  { title: "Обложка книги Звездопад над Волгой в руках", image: wifeZvezdopadClosedBookImage },
  { title: "Открытый разворот персональной книги на столе", image: wifeZvezdopadOpenTableImage },
  { title: "Персональная книга Звездопад над Волгой в интерьере", image: wifeZvezdopadWideHeroImage },
];

const faqs = [
  {
    question: "Это подойдет как подарок жене на день рождения?",
    answer:
      "Да. Страница собрана именно под подарок жене на день рождения от мужа: книга получается личной, с ее именем, характером, фото и деталями вашей жизни вместе.",
  },
  {
    question: "Можно сделать книгу только про нее?",
    answer:
      "Да. Жена может быть главной героиней, а муж, семья, город, путешествие или важное воспоминание станут частью сюжета.",
  },
  {
    question: "Насколько героиня будет похожа на фото?",
    answer:
      "Фото помогает сохранить узнаваемые черты, прическу, образ и настроение. Это художественная иллюстрация, а не фотокопия.",
  },
  {
    question: "Это физическая книга или PDF?",
    answer:
      "Главный формат Fairyteller - печатная бумажная книга. Электронная версия может прийти быстрее, если день рождения уже скоро.",
  },
  {
    question: "Сколько стоит книга?",
    answer:
      "От 3500₽: персональный сюжет, иллюстрации по фото, редактура и печатная книга с доставкой по России.",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Подарок жене на день рождения от мужа — книга о ней",
    description:
      "Персональная книга жене на день рождения: она главная героиня, сюжет про нее, иллюстрации по фото. От 3500₽, доставка по России от 2 дней.",
    brand: { "@type": "Brand", name: "Fairyteller" },
    image: "https://fairyteller.ru/images/book-exmpl6.jpg",
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: "3500",
      availability: "https://schema.org/InStock",
      url: "https://fairyteller.ru/podarok/zhene",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Главная",
        item: "https://fairyteller.ru/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Подарок жене",
        item: "https://fairyteller.ru/podarok/zhene",
      },
    ],
  },
];

const WifeGiftLanding = () => {
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
        title="Подарок жене на день рождения от мужа — книга о ней | Fairyteller"
        description="Персональная книга жене на день рождения: она главная героиня, сюжет про неё, иллюстрации по фото. От 3500₽, доставка по России от 2 дней."
        path="/podarok/zhene"
        image="/images/book-exmpl6.jpg"
        type="product"
        jsonLd={jsonLd}
      />
      <style>
        {`
          .wife-page h1,
          .wife-page h2,
          .wife-page h3 {
            color: #E89C31;
            font-family: "Avenir Next", "Helvetica Neue", Jost, Futura, Arial, sans-serif;
            letter-spacing: 0;
            text-shadow: none;
          }

          .wife-page,
          .wife-page * {
            min-width: 0;
            box-sizing: border-box;
          }

          .wife-page {
            max-width: 100vw;
          }

          .wife-page h1,
          .wife-page h2,
          .wife-page h3,
          .wife-page p,
          .wife-page a {
            overflow-wrap: break-word;
          }

          .wife-page a,
          .wife-page button,
          .wife-page input,
          .wife-page textarea {
            font-family: inherit;
          }

          .wife-page .fairyteller-choice-strip {
            overscroll-behavior-x: contain;
            scrollbar-width: none;
          }

          .wife-page .fairyteller-choice-strip::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>

      <div className="wife-page">
        <LandingHeader />

        <section className="mx-auto grid w-full max-w-[1480px] min-w-0 overflow-hidden border-black lg:min-h-[640px] lg:grid-cols-[1.08fr_0.92fr]">
          <div className="flex min-w-0 flex-col justify-between border-black px-5 py-9 md:px-8 md:py-11 lg:border-r lg:pb-16">
            <div className="w-full max-w-[340px] md:max-w-none">
              <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#5e6264]">
                Подарок жене
              </p>
              <h1 className="mt-5 w-full max-w-full break-normal text-[25px] font-black uppercase leading-[1.08] tracking-normal min-[420px]:text-[29px] sm:text-[33px] md:max-w-[780px] md:text-[34px] lg:text-[34px] 2xl:text-[42px]">
                Подарок жене на день рождения: книга, в которой она главная героиня
              </h1>
              <p className="mt-5 w-full max-w-[340px] text-[16px] leading-[1.42] md:max-w-[680px] md:text-[21px] md:leading-[1.35]">
                Персональная книга с ее именем, характером, фото и деталями которые знаете только вы. От 3500₽.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/create"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-black px-4 py-3 text-center text-[12px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#5e6264] sm:w-auto sm:px-6 sm:text-[13px]"
                >
                  <BookOpen className="h-5 w-5" />
                  Создать книгу жене
                </Link>
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
                aria-label="Показать следующее фото книги для жены"
              >
                {heroImages.map((item, index) => (
                  <img
                    key={item.title}
                    src={item.image}
                    alt={item.title}
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
              <h2 className={sectionTitleClass}>Не вещь</h2>
            </div>
            <div className="grid border-l border-t border-black md:grid-cols-2">
              <article className="border-b border-r border-black bg-white p-5">
                <Gift className="h-7 w-7" />
                <h3 className="mt-10 text-[34px] font-black uppercase leading-none">Про нее одну</h3>
                <p className="mt-5 text-[16px] leading-7 text-[#5e6264]">
                  Хороший подарок не пополняет коллекцию предметов. Он говорит что-то о человеке которому предназначен.
                </p>
              </article>
              <article className="border-b border-r border-black bg-white p-5">
                <Heart className="h-7 w-7" />
                <h3 className="mt-10 text-[34px] font-black uppercase leading-none">Не из магазина</h3>
                <p className="mt-5 text-[16px] leading-7 text-[#5e6264]">
                  Книга о жене - это история написанная под нее одну. С ее именем, ее характером, деталями из вашей жизни вместе.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="create" className="scroll-mt-24 border-b border-black bg-[#fae7e1] px-5 py-9 md:px-8 md:py-11">
          <FairytellerInlineConstructor
            lockedWorld={romanticLockedWorld}
            heading="Соберите книгу для жены."
            description="Добавьте ее имя, фото, характер, важное место, личную деталь или символ вашей жизни вместе. История будет строиться вокруг нее."
            defaultVisibleHeroIndexes={[0, 1]}
            defaultHeroAgeGroup="adult"
            requiredHeroCount={1}
            heroSlots={wifeHeroSlots}
            submitLabel="Создать книгу жене"
          />
        </section>

        <section id="process" className="scroll-mt-24 border-b border-black bg-white px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <h2 className={sectionTitleClass}>Как это устроено</h2>
            </div>
            <div className="grid border-l border-t border-black sm:grid-cols-3">
              {process.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="min-h-[260px] border-b border-r border-black bg-[#f5f5f5] p-5">
                    <Icon className="h-7 w-7" />
                    <h3 className="mt-9 text-[28px] font-black uppercase leading-none">{item.title}</h3>
                    <p className="mt-5 text-[16px] leading-7 text-[#5e6264]">{item.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="examples" className="scroll-mt-24 border-b border-black bg-[#f5f5f5] px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto max-w-[1480px]">
            <div className="mb-9 grid gap-5 md:grid-cols-[1fr_440px] md:items-end">
              <h2 className={sectionTitleClass}>Что внутри</h2>
              <p className="text-[18px] leading-7 text-[#5e6264]">
                40 страниц, 5 глав - полноценная история, не открытка. Перед печатью текст читает редактор, чтобы история читалась как книга.
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
                {exampleImages.map((item) => (
                  <img
                    key={item.title}
                    src={item.image}
                    alt={item.title}
                    className="h-full min-h-[260px] w-full border-b border-black object-cover md:border-b-0 md:border-r md:last:border-r-0"
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="price" className="scroll-mt-24 border-b border-black bg-white px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <h2 className={sectionTitleClass}>Стоимость</h2>
            </div>
            <div className="border-l border-t border-black">
              <article className="border-b border-r border-black bg-[#f5f5f5] p-5 md:p-8">
                <Sparkles className="h-7 w-7" />
                <p className="mt-8 max-w-[760px] text-[20px] leading-8 text-[#5e6264]">
                  От 3500₽ - персональный сюжет, иллюстрации по фото, редактура и печатная книга с доставкой по России.
                  Если день рождения уже скоро - электронная версия приходит быстрее.
                </p>
                <Link
                  to="/create"
                  className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 bg-black px-6 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#5e6264]"
                >
                  Создать книгу жене
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </article>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 border-b border-black bg-[#f5f5f5] px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <h2 className={sectionTitleClass}>Вопросы и ответы.</h2>
            </div>
            <div className="border-l border-t border-black">
              {faqs.map((item) => (
                <article key={item.question} className="grid border-b border-r border-black bg-white p-5 md:grid-cols-[0.48fr_0.52fr] md:gap-8">
                  <h3 className="text-[24px] font-black uppercase leading-[0.98]">{item.question}</h3>
                  <p className="mt-4 text-[16px] leading-7 text-[#5e6264] md:mt-0">{item.answer}</p>
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
                  <Link to="/podarok/rebenku" className="hover:text-white hover:underline">Ребенку</Link>
                  <a href="#faq" className="hover:text-white hover:underline">FAQ</a>
                  <Link to="/blog" className="hover:text-white hover:underline">Журнал</Link>
                </nav>
              </div>
              <div className="md:text-right">
                <div className="flex flex-wrap gap-3 md:justify-end">
                  <a
                    href="https://vk.com/fairyteller"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center border border-white px-5 text-[12px] font-bold uppercase tracking-[0.1em] text-white transition hover:bg-white hover:text-black"
                  >
                    VK
                  </a>
                  <a
                    href="https://dzen.ru/fairyteller"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center border border-white px-5 text-[12px] font-bold uppercase tracking-[0.1em] text-white transition hover:bg-white hover:text-black"
                  >
                    Дзен
                  </a>
                  <Link
                    to="/create"
                    className="inline-flex h-11 items-center justify-center gap-2 border border-white bg-white px-5 text-[12px] font-bold uppercase tracking-[0.1em] text-black transition hover:bg-black hover:text-white"
                  >
                    Создать книгу
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
                <p className="mt-6 text-[13px] font-bold uppercase tracking-[0.12em] text-white/50">
                  2026. Fairyteller.ru - персональные бумажные книги в подарок
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
};

export default WifeGiftLanding;
