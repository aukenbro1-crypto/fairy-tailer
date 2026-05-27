import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
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
import logoImage from "@/assets/logo.png";
import romanticBookImage from "@/assets/romantic-book-cover-new.png";
import bookHandsImage from "@/assets/book-hands-romantic.png";
import romanticStoryImage from "@/assets/romantic-story.png";
import exampleCactusCityImage from "@/assets/example-photos/cactus-city-open-book-hands-bench.webp";
import exampleCactusFlatlayImage from "@/assets/example-photos/cactus-flatlay-mood.webp";
import exampleMapTableImage from "@/assets/example-photos/map-open-book-table.webp";

const typeStyle = {
  fontFamily:
    '"Avenir Next", "Helvetica Neue", Jost, Futura, Arial, sans-serif',
};

const sectionTitleClass =
  "max-w-[980px] text-[36px] font-black uppercase leading-[1.12] tracking-normal md:text-[58px] xl:text-[62px]";

const metrics = [
  ["3 сюжета", "На выбор"],
  ["40 страниц", "Полная история"],
  ["От 2-х дней", "Доставка по РФ"],
];

const plotCards = [
  {
    title: "Приключения",
    text: "Годовщина как общий квест: ваш маршрут, маленькие испытания, помощники, смешные препятствия и финал, где пара выбирает друг друга.",
  },
  {
    title: "Фэнтези",
    text: "Ваша история превращается в сказочный мир: символ годовщины становится артефактом, а отношения держат вместе весь сюжет.",
  },
  {
    title: "Romantic story",
    text: "Теплая love story про встречу, важные места, общие шутки, почти признание, нежный финал и новую личную традицию.",
  },
];

const anniversaryMoments = [
  {
    title: "Год отношений",
    text: "Первая большая дата, которую хочется отметить не вещью, а историей про то, как все началось.",
  },
  {
    title: "Годовщина свадьбы",
    text: "Книга собирает путь пары: знакомство, дом, поездки, обещания, смешные сцены и то, что стало общим.",
  },
  {
    title: "Памятная дата",
    text: "Подходит для дня знакомства, помолвки, первого путешествия или любого события, которое хочется сохранить.",
  },
  {
    title: "Подарок от друзей",
    text: "Можно сделать книгу о паре от лица близких: с их привычками, городом, шутками и теплым посланием.",
  },
  {
    title: "Без банальности",
    text: "Не сертификат, не очередная рамка и не список идей. У подарка есть личный сюжет и физическая форма.",
  },
  {
    title: "В последний момент",
    text: "Первое превью появляется за несколько минут, а печатную книгу можно запустить после утверждения.",
  },
];

const ingredients = [
  "как вы познакомились",
  "первое свидание или поездка",
  "город, дом или важное место",
  "общая шутка или фраза",
  "питомец, билет, кольцо или другой символ",
  "настроение сюжета: приключения, фэнтези или romantic story",
];

const process = [
  {
    icon: CalendarDays,
    title: "Назовите дату",
    text: "Добавьте повод: год отношений, годовщина свадьбы, день знакомства или другая личная дата.",
  },
  {
    icon: Sparkles,
    title: "Выберите сюжет",
    text: "На этой странице доступны три сценария: приключения, фэнтези и romantic story.",
  },
  {
    icon: Camera,
    title: "Добавьте героев",
    text: "Имена, фото, характеры и детали пары помогают сделать книгу узнаваемой.",
  },
  {
    icon: PackageCheck,
    title: "Подарите книгу",
    text: "После превью мы готовим печатный макет, редактуру и доставку по России.",
  },
];

const coupleHeroSlots = ["Первый герой", "Второй герой", "Герой 3", "Герой 4"];

const faqs = [
  {
    question: "Чем эта страница отличается от подарка для пары?",
    answer:
      "Здесь фокус именно на годовщине: дата, общий путь, важные моменты и выбор сюжета под настроение подарка.",
  },
  {
    question: "Можно выбрать не романтический сюжет?",
    answer:
      "Да. В конструкторе есть три варианта: приключения, фэнтези и romantic story. Все три остаются персональными историями про пару.",
  },
  {
    question: "Что лучше подготовить заранее?",
    answer:
      "Имена, 1-2 фото, место знакомства или поездки, общую шутку, символ даты и пару деталей о характерах героев.",
  },
  {
    question: "Это подойдет для годовщины свадьбы?",
    answer:
      "Да. Можно сделать книгу для супругов, для себя и партнера или подарок паре от друзей и семьи.",
  },
  {
    question: "Сколько стоит печатная книга?",
    answer:
      "Персональная бумажная книга стоит от 3500₽. В стоимость входит подготовка макета, редактура, печать и доставка по России.",
  },
  {
    question: "Как быстро появится превью?",
    answer:
      "Первое превью создается за несколько минут. После оплаты печатная книга готовится к печати за один день и отправляется в доставку.",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Подарок на годовщину: персональная книга про вашу пару",
    description:
      "Персональная книга на годовщину отношений или свадьбы с именами, фото, важными местами, общими шутками и выбором сюжета.",
    brand: { "@type": "Brand", name: "Fairyteller" },
    image: "https://fairyteller.ru/images/book-exmpl6.jpg",
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: "3500",
      availability: "https://schema.org/InStock",
      url: "https://fairyteller.ru/podarok/na-godovshchinu",
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
        name: "Подарок на годовщину",
        item: "https://fairyteller.ru/podarok/na-godovshchinu",
      },
    ],
  },
];

const AnniversaryGiftLanding = () => {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-black" style={typeStyle}>
      <SEO
        title="Подарок на годовщину — персональная книга про вашу пару | Fairyteller"
        description="Создайте подарок на годовщину отношений или свадьбы: персональная книга про вашу пару с фото, важными местами, общими шутками и выбором сюжета."
        path="/podarok/na-godovshchinu"
        image="/images/book-exmpl6.jpg"
        type="product"
        jsonLd={jsonLd}
      />
      <style>
        {`
          .anniversary-page h1,
          .anniversary-page h2,
          .anniversary-page h3 {
            color: #E89C31;
            font-family: "Avenir Next", "Helvetica Neue", Jost, Futura, Arial, sans-serif;
            letter-spacing: 0;
            text-shadow: none;
          }

          .anniversary-page,
          .anniversary-page * {
            min-width: 0;
            box-sizing: border-box;
          }

          .anniversary-page {
            max-width: 100vw;
          }

          .anniversary-page h1,
          .anniversary-page h2,
          .anniversary-page h3,
          .anniversary-page p,
          .anniversary-page a {
            overflow-wrap: break-word;
          }

          .anniversary-page a,
          .anniversary-page button,
          .anniversary-page input,
          .anniversary-page textarea {
            font-family: inherit;
          }

          .anniversary-page .fairyteller-choice-strip {
            overscroll-behavior-x: contain;
            scrollbar-width: none;
          }

          .anniversary-page .fairyteller-choice-strip::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>

      <div className="anniversary-page">
        <div className="border-b border-black bg-black px-5 py-2 text-center text-[9px] font-bold uppercase leading-4 tracking-[0.14em] text-white sm:text-[10px] md:px-8">
          Персональная книга на годовщину
        </div>

        <header className="sticky inset-x-0 top-0 z-40 border-b border-black bg-white">
          <div className="mx-auto flex h-14 max-w-[1480px] items-center justify-between px-5 md:px-8">
            <Link to="/" className="flex items-center gap-3" aria-label="Fairyteller">
              <img src={logoImage} alt="Fairyteller" className="h-10 w-auto object-contain" />
            </Link>

            <nav className="hidden items-center gap-8 text-[13px] font-bold uppercase tracking-[0.05em] md:flex">
              <a href="#meaning" className="hover:underline">
                Почему это работает
              </a>
              <a href="#create" className="hover:underline">
                Создать
              </a>
              <a href="#plots" className="hover:underline">
                Сюжеты
              </a>
              <a href="#process" className="hover:underline">
                Как создать
              </a>
              <a href="#faq" className="hover:underline">
                FAQ
              </a>
            </nav>

            <a
              href="#create"
              className="inline-flex h-10 items-center justify-center gap-2 border border-black bg-black px-4 text-[13px] font-bold uppercase tracking-[0.05em] text-white transition hover:bg-white hover:text-black"
            >
              <Gift className="h-4 w-4" />
              <span className="hidden sm:inline">Создать</span>
            </a>
          </div>
        </header>

        <section className="mx-auto grid w-full max-w-[1480px] min-w-0 overflow-hidden border-black lg:min-h-[640px] lg:grid-cols-[1.08fr_0.92fr]">
          <div className="flex min-w-0 flex-col justify-between border-black px-5 py-9 md:px-8 md:py-11 lg:border-r lg:pb-16">
            <div className="w-full max-w-[340px] md:max-w-none">
              <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#5e6264]">
                Подарок на годовщину
              </p>
              <h1 className="mt-5 w-full max-w-full break-normal text-[26px] font-black uppercase leading-[1.08] tracking-normal min-[420px]:text-[30px] sm:text-[34px] md:max-w-[760px] md:text-[34px] lg:text-[34px] 2xl:text-[42px]">
                <span className="block">Книга про вашу пару</span>
                <span className="block">к годовщине</span>
              </h1>
              <p className="mt-5 w-full max-w-[340px] text-[16px] leading-[1.42] md:max-w-[680px] md:text-[21px] md:leading-[1.35]">
                Соберите персональную книгу про дату, с которой все началось: с вашими именами,
                фото, местами, шутками и сюжетом на выбор. От 3500₽
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#create"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-black px-4 py-3 text-center text-[12px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#5e6264] sm:w-auto sm:px-6 sm:text-[13px]"
                >
                  <BookOpen className="h-5 w-5" />
                  Создать подарок
                </a>
                <a
                  href="#plots"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 border border-black bg-white px-4 py-3 text-center text-[12px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-black hover:text-white sm:w-auto sm:px-6 sm:text-[13px]"
                >
                  Выбрать сюжет
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

          <div className="grid min-h-[420px] overflow-hidden bg-[#f5f5f5] md:grid-cols-2 lg:min-h-0">
            <img src={romanticBookImage} alt="Персональная книга на годовщину" className="h-full min-h-[360px] w-full object-cover" />
            <div className="grid border-l border-black">
              <img src={bookHandsImage} alt="Печатная книга в руках" className="h-full min-h-[220px] w-full border-b border-black object-cover" />
              <img src={romanticStoryImage} alt="История пары в иллюстрациях" className="h-full min-h-[220px] w-full object-cover" />
            </div>
          </div>
        </section>

        <section id="meaning" className="scroll-mt-24 border-y border-black bg-[#fae7e1] px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.78fr_1.22fr]">
            <div>
              <h2 className={sectionTitleClass}>Годовщина просит личный подарок.</h2>
            </div>
            <div className="grid border-l border-t border-black md:grid-cols-2">
              <article className="border-b border-r border-black bg-white p-5">
                <CalendarDays className="h-7 w-7" />
                <h3 className="mt-10 text-[34px] font-black uppercase leading-none">Есть дата и смысл</h3>
                <p className="mt-5 text-[16px] leading-7 text-[#5e6264]">
                  У годовщины уже есть сюжет: как вы встретились, что пережили вместе, какие места стали
                  вашими и что хочется забрать в следующую главу.
                </p>
              </article>
              <article className="border-b border-r border-black bg-white p-5">
                <Heart className="h-7 w-7" />
                <h3 className="mt-10 text-[34px] font-black uppercase leading-none">Не очередная вещь</h3>
                <p className="mt-5 text-[16px] leading-7 text-[#5e6264]">
                  Персональная книга работает как сохраненная память: ее можно открыть, перечитать,
                  показать близким и оставить на полке как часть вашей истории.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="create" className="scroll-mt-24 border-b border-black bg-[#fae7e1] px-5 py-9 md:px-8 md:py-11">
          <FairytellerInlineConstructor
            availableWorldIds={["adventure", "fantasy", "romance"]}
            worldTabLabel="Сюжет"
            worldLegend="Выберите сюжет"
            heading="Соберите книгу на годовщину."
            description="Выберите сюжет, добавьте двух героев, важное место, символ даты и стиль иллюстраций. Конструктор соберет превью персональной книги."
            locationLabel="Место или маршрут"
            locationPlaceholder="Город знакомства, первое путешествие, дом, любимое кафе"
            artifactLabel="Символ годовщины"
            artifactPlaceholder="Билет, кольцо, песня, питомец, обещание, фраза"
            heroIntro="Добавьте двух героев пары. Фото помогут сделать иллюстрации похожими и сохранить узнаваемость."
            defaultVisibleHeroIndexes={[0, 1]}
            defaultHeroAgeGroup="adult"
            requiredHeroCount={2}
            heroSlots={coupleHeroSlots}
            submitLabel="Создать книгу на годовщину"
          />
        </section>

        <section id="plots" className="scroll-mt-24 border-b border-black bg-white px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <h2 className={sectionTitleClass}>Три сюжета для вашей даты.</h2>
            </div>
            <div className="grid border-l border-t border-black md:grid-cols-3">
              {plotCards.map((item) => (
                <article key={item.title} className="min-h-[260px] border-b border-r border-black bg-[#f5f5f5] p-5">
                  <h3 className="text-[28px] font-black uppercase leading-none">{item.title}</h3>
                  <p className="mt-6 text-[15px] leading-7 text-[#5e6264]">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="occasions" className="scroll-mt-24 border-b border-black bg-[#f5f5f5] px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto max-w-[1480px]">
            <div className="mb-9 grid gap-5 md:grid-cols-[1fr_440px] md:items-end">
              <h2 className={sectionTitleClass}>Когда особенно подходит.</h2>
              <p className="text-[18px] leading-7 text-[#5e6264]">
                Страница работает под годовщины, но внутри можно собрать подарок для разных близких сценариев:
                от первой даты до семейного юбилея.
              </p>
            </div>
            <div className="grid border-l border-t border-black md:grid-cols-3">
              {anniversaryMoments.map((item) => (
                <article key={item.title} className="min-h-[230px] border-b border-r border-black bg-white p-5">
                  <h3 className="text-[28px] font-black uppercase leading-none">{item.title}</h3>
                  <p className="mt-6 text-[15px] leading-7 text-[#5e6264]">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="examples" className="scroll-mt-24 border-b border-black bg-white px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto max-w-[1480px]">
            <div className="mb-9 grid gap-5 md:grid-cols-[1fr_440px] md:items-end">
              <h2 className={sectionTitleClass}>Что добавить в подарок.</h2>
              <p className="text-[18px] leading-7 text-[#5e6264]">
                Самые сильные детали обычно маленькие: место, фраза, билет, привычка или обещание,
                которое понятно только двоим.
              </p>
            </div>

            <div className="grid gap-0 border-l border-t border-black lg:grid-cols-[0.9fr_1.1fr]">
              <div className="grid border-b border-r border-black bg-[#f5f5f5] p-5 md:grid-cols-2">
                {ingredients.map((item) => (
                  <span key={item} className="flex min-h-[64px] items-center gap-3 border-b border-black py-3 text-[15px] font-bold uppercase leading-5 last:border-b-0 md:odd:border-r md:odd:pr-4 md:even:pl-4">
                    <Check className="h-5 w-5 shrink-0" />
                    {item}
                  </span>
                ))}
              </div>
              <div className="grid border-b border-r border-black bg-white md:grid-cols-3">
                <img src={exampleCactusCityImage} alt="Пример персональной книги в руках" className="h-full min-h-[260px] w-full border-b border-black object-cover md:border-b-0 md:border-r" />
                <img src={exampleMapTableImage} alt="Разворот персональной книги на столе" className="h-full min-h-[260px] w-full border-b border-black object-cover md:border-b-0 md:border-r" />
                <img src={exampleCactusFlatlayImage} alt="Подарочная книга на годовщину" className="h-full min-h-[260px] w-full object-cover" />
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
                  <Link to="/podarok/na-godovshchinu" className="hover:text-white hover:underline">На годовщину</Link>
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
                  <a
                    href="#create"
                    className="inline-flex h-11 items-center justify-center gap-2 border border-white bg-white px-5 text-[12px] font-bold uppercase tracking-[0.1em] text-black transition hover:bg-black hover:text-white"
                  >
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

export default AnniversaryGiftLanding;
