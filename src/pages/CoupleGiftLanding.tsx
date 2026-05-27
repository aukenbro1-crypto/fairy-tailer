import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  Gift,
  Heart,
  PackageCheck,
  Sparkles,
} from "lucide-react";

import SEO from "@/components/SEO";
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
  ["3 минуты", "Первое превью"],
  ["от 3500₽", "Печатная книга"],
  ["1 день", "Печать после оплаты"],
];

const occasions = [
  {
    title: "Годовщина",
    text: "История знакомства, первое путешествие, ваш маршрут, шутки и обещания превращаются в книгу, которую хочется перечитать.",
  },
  {
    title: "14 февраля",
    text: "Романтический подарок без шаблонной открытки: личный сюжет, образы по фото и финал, который звучит только про вас.",
  },
  {
    title: "Свадьба",
    text: "Подарок паре от друзей или семьи: теплая сказка про двоих, их путь, дом, город и будущую общую главу.",
  },
  {
    title: "День рождения",
    text: "Когда хочется подарить не вещь, а внимание: книга собирает воспоминания, характер и маленькие детали человека рядом.",
  },
  {
    title: "Просто так",
    text: "Для момента, когда важнее всего сказать: я помню, как мы встретились, что нас смешит и какие места стали нашими.",
  },
  {
    title: "Расстояние",
    text: "История для пары, которая живет в разных городах, много путешествует или хочет сохранить общий символ на бумаге.",
  },
];

const ingredients = [
  "ваши имена и роли в истории",
  "место знакомства или важный город",
  "общая шутка, фраза или привычка",
  "фото для узнаваемых героев",
  "питомец, талисман или предмет",
  "жанр: романтика, приключение, фэнтези или киберпанк",
];

const process = [
  {
    icon: Heart,
    title: "Вспомните вас",
    text: "Добавьте имена, пару личных деталей, место, которое что-то значит, и настроение будущей истории.",
  },
  {
    icon: Camera,
    title: "Загрузите фото",
    text: "Фото помогают сделать героев похожими на реальных людей, но сохранить книжный, подарочный образ.",
  },
  {
    icon: Sparkles,
    title: "Выберите мир",
    text: "Романтическая история может быть нежной, смешной, приключенческой, сказочной или совсем кинематографичной.",
  },
  {
    icon: PackageCheck,
    title: "Подарите книгу",
    text: "Сначала приходит превью, затем после оплаты мы готовим печатную книгу и отправляем ее по России.",
  },
];

const faqs = [
  {
    question: "Это подходит только для влюбленных?",
    answer:
      "Нет. Страница про подарок для пары, но книга может быть про супругов, жениха и невесту, друзей, родителей или пару, которую хочется поздравить общим подарком.",
  },
  {
    question: "Можно ли сделать историю без детской сказочности?",
    answer:
      "Да. Для пары лучше работает формат романтической персональной книги: больше воспоминаний, мест, диалогов и взрослой интонации.",
  },
  {
    question: "Нужно ли загружать фото двоих?",
    answer:
      "Желательно, но не обязательно. Фото усиливают узнаваемость героев в иллюстрациях, а без фото можно собрать более условный книжный образ.",
  },
  {
    question: "Что добавить, чтобы подарок был личным?",
    answer:
      "Лучше всего работают место знакомства, первое путешествие, общая фраза, питомец, маленькая привычка, любимый маршрут или предмет-символ.",
  },
  {
    question: "Сколько стоит печатная книга?",
    answer:
      "Персональная бумажная книга стоит от 3500₽. В стоимость входит подготовка макета, редактура, печать и доставка по России.",
  },
  {
    question: "Как быстро можно получить результат?",
    answer:
      "Первое превью создается за несколько минут. После оплаты печатная книга готовится к печати за один день и отправляется в доставку.",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Персональная книга для пары",
    description:
      "Романтическая персональная книга по фото: история для двоих, где пара становится главными героями.",
    brand: { "@type": "Brand", name: "Fairyteller" },
    image: "https://fairyteller.ru/images/book-exmpl6.jpg",
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: "3500",
      availability: "https://schema.org/InStock",
      url: "https://fairyteller.ru/podarok/dlya-pary",
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
        name: "Подарок для пары",
        item: "https://fairyteller.ru/podarok/dlya-pary",
      },
    ],
  },
];

const CoupleGiftLanding = () => {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-black" style={typeStyle}>
      <SEO
        title="Подарок для пары — персональная книга о вашей истории | Fairyteller"
        description="Создайте подарок для пары: романтическую персональную книгу по фото, где двое становятся главными героями. Превью за несколько минут, печать от 3500₽."
        path="/podarok/dlya-pary"
        image="/images/book-exmpl6.jpg"
        type="product"
        jsonLd={jsonLd}
      />
      <style>
        {`
          .couple-page h1,
          .couple-page h2,
          .couple-page h3 {
            color: #E89C31;
            font-family: "Avenir Next", "Helvetica Neue", Jost, Futura, Arial, sans-serif;
            letter-spacing: 0;
            text-shadow: none;
          }

          .couple-page,
          .couple-page * {
            min-width: 0;
            box-sizing: border-box;
          }

          .couple-page {
            max-width: 100vw;
          }

          .couple-page h1,
          .couple-page h2,
          .couple-page h3,
          .couple-page p,
          .couple-page a {
            overflow-wrap: break-word;
          }

          .couple-page a,
          .couple-page button {
            font-family: inherit;
          }
        `}
      </style>

      <div className="couple-page">
        <div className="border-b border-black bg-black px-5 py-2 text-center text-[9px] font-bold uppercase leading-4 tracking-[0.14em] text-white sm:text-[10px] md:px-8">
          Персональная книга для пары
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
              <a href="#occasions" className="hover:underline">
                Поводы
              </a>
              <a href="#process" className="hover:underline">
                Как создать
              </a>
              <a href="#faq" className="hover:underline">
                FAQ
              </a>
            </nav>

            <Link
              to="/create"
              className="inline-flex h-10 items-center justify-center gap-2 border border-black bg-black px-4 text-[13px] font-bold uppercase tracking-[0.05em] text-white transition hover:bg-white hover:text-black"
            >
              <Gift className="h-4 w-4" />
              <span className="hidden sm:inline">Создать</span>
            </Link>
          </div>
        </header>

        <section className="mx-auto grid w-full max-w-[1480px] min-w-0 overflow-hidden border-black lg:min-h-[640px] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="flex min-w-0 flex-col justify-between border-black px-5 py-9 md:px-8 md:py-11 lg:border-r lg:pb-16">
            <div className="w-full max-w-[340px] md:max-w-none">
              <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#5e6264]">
                Подарок для пары
              </p>
              <h1 className="mt-5 w-full max-w-full break-words text-[26px] font-black uppercase leading-[1.1] tracking-normal min-[420px]:text-[30px] sm:text-[42px] md:max-w-[760px] md:text-[58px] xl:text-[62px]">
                Книга, где вы вдвоем главные герои.
              </h1>
              <p className="mt-5 w-full max-w-[340px] text-[16px] leading-[1.42] md:max-w-[680px] md:text-[21px] md:leading-[1.35]">
                Соберите романтическую персональную историю по фото: ваши имена, места, шутки,
                воспоминания и общий символ станут настоящей бумажной книгой.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/create"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-black px-4 py-3 text-center text-[12px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#5e6264] sm:w-auto sm:px-6 sm:text-[13px]"
                >
                  <BookOpen className="h-5 w-5" />
                  Создать книгу для пары
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

            <div className="mt-8 grid w-full max-w-[340px] border-t border-black text-sm font-bold uppercase tracking-[0.04em] sm:max-w-full sm:grid-cols-3 md:w-auto lg:mt-10">
              {metrics.map(([value, label]) => (
                <div key={value} className="border-black py-3 sm:border-r sm:px-4 sm:first:pl-0 sm:last:border-r-0">
                  <span className="block text-[15px]">{value}</span>
                  <span className="mt-1 block text-[11px] text-[#5e6264]">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid min-h-[420px] overflow-hidden bg-[#f5f5f5] md:grid-cols-2 lg:min-h-0">
            <img src={romanticBookImage} alt="Персональная книга для пары" className="h-full min-h-[360px] w-full object-cover" />
            <div className="grid border-l border-black">
              <img src={bookHandsImage} alt="Печатная романтическая книга в руках" className="h-full min-h-[220px] w-full border-b border-black object-cover" />
              <img src={romanticStoryImage} alt="Иллюстрация романтической истории для двоих" className="h-full min-h-[220px] w-full object-cover" />
            </div>
          </div>
        </section>

        <section id="meaning" className="scroll-mt-24 border-y border-black bg-[#fae7e1] px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.78fr_1.22fr]">
            <div>
              <h2 className={sectionTitleClass}>Не вещь. Общая история.</h2>
            </div>
            <div className="grid border-l border-t border-black md:grid-cols-2">
              <article className="border-b border-r border-black bg-white p-5">
                <Heart className="h-7 w-7" />
                <h3 className="mt-10 text-[34px] font-black uppercase leading-none">Попадает в отношения</h3>
                <p className="mt-5 text-[16px] leading-7 text-[#5e6264]">
                  В книге можно сохранить то, что не поместится в обычный подарок: ваш город,
                  первое свидание, внутреннюю шутку, обещание или маршрут, который понятен только вам.
                </p>
              </article>
              <article className="border-b border-r border-black bg-white p-5">
                <BookOpen className="h-7 w-7" />
                <h3 className="mt-10 text-[34px] font-black uppercase leading-none">Остается на полке</h3>
                <p className="mt-5 text-[16px] leading-7 text-[#5e6264]">
                  Это не сертификат и не сувенир. Печатная книга остается как личный артефакт пары:
                  ее можно дарить, перечитывать и показывать спустя годы.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="occasions" className="scroll-mt-24 border-b border-black bg-white px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <h2 className={sectionTitleClass}>Для каких поводов.</h2>
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
              <h2 className={sectionTitleClass}>Что можно вплести в сюжет.</h2>
              <p className="text-[18px] leading-7 text-[#5e6264]">
                Чем точнее детали, тем сильнее подарок: книга начинает звучать не как универсальная романтика,
                а как ваша собственная история.
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
                <img src={exampleCactusCityImage} alt="Пример персональной книги в руках" className="h-full min-h-[260px] w-full border-b border-black object-cover md:border-b-0 md:border-r" />
                <img src={exampleMapTableImage} alt="Разворот персональной книги на столе" className="h-full min-h-[260px] w-full border-b border-black object-cover md:border-b-0 md:border-r" />
                <img src={exampleCactusFlatlayImage} alt="Подарочная книга как необычный подарок для пары" className="h-full min-h-[260px] w-full object-cover" />
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

        <section className="bg-black px-5 py-12 text-white md:px-8 md:py-14">
          <div className="mx-auto grid max-w-[1480px] gap-8 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <h2 className="max-w-[920px] text-[34px] font-black uppercase leading-[1.08] tracking-normal text-[#E89C31] md:text-[58px]">
                Соберите книгу про вашу пару.
              </h2>
              <p className="mt-5 max-w-[640px] text-[16px] leading-7 text-white/65">
                Начните с имен, фото и пары деталей. Остальное Fairyteller превратит в историю,
                которую можно подарить в PDF или напечатанной книгой.
              </p>
            </div>
            <Link
              to="/create"
              className="inline-flex h-12 items-center justify-center gap-2 border border-white bg-white px-6 text-[13px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-black hover:text-white"
            >
              Создать книгу
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
};

export default CoupleGiftLanding;
