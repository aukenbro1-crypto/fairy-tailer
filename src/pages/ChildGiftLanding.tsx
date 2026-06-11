import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Gift,
  Heart,
  ImagePlus,
  PackageCheck,
  Sparkles,
} from "lucide-react";

import SEO from "@/components/SEO";
import FairytellerInlineConstructor from "@/components/FairytellerInlineConstructor";
import LandingHeader from "@/components/LandingHeader";
import logoImage from "@/assets/logo.png";
import tainyBookshelfImage from "@/assets/landing-photos/child-gift-tainy-bookshelf.jpg";
import tainyHeroImage from "@/assets/landing-photos/child-gift-tainy-hero.jpg";
import tainyHandsImage from "@/assets/landing-photos/child-gift-tainy-hands.jpg";
import drevogradHandsImage from "@/assets/landing-photos/child-gift-drevograd-hands.jpg";
import drevogradSpreadImage from "@/assets/landing-photos/child-gift-drevograd-spread.jpg";
import drevogradBackImage from "@/assets/landing-photos/child-gift-drevograd-back.jpg";

const typeStyle = {
  fontFamily: '"Avenir Next", "Helvetica Neue", Jost, Futura, Arial, sans-serif',
};

const sectionTitleClass =
  "max-w-[980px] text-[36px] font-black uppercase leading-[1.12] tracking-normal md:text-[58px] xl:text-[62px]";

const metrics = [
  ["От 3500₽", "Печатная книга"],
  ["40 страниц", "Полная история"],
  ["5 глав", "С иллюстрациями"],
];

const heroImages = [
  { title: "Книга Тайны заколдованной карты на книжной полке", image: tainyBookshelfImage },
  { title: "Разворот и обложка книги Тайны заколдованной карты", image: tainyHeroImage },
  { title: "Разворот книги Тайны заколдованной карты в руках", image: tainyHandsImage },
];

const ordinaryGifts = [
  {
    title: "Игрушка",
    text: "Радует быстро, но часто теряется среди других вещей, а именная книга для ребёнка дольше живет дома и возвращает его к собственной истории.",
  },
  {
    title: "Сладости",
    text: "Это приятно на вечер. Персональная книга остается после праздника и становится памятью о возрасте, характере и мечтах.",
  },
  {
    title: "Одежда",
    text: "Практично, но редко воспринимается ребенком как чудо. Здесь подарок говорит: это сделано именно про тебя.",
  },
  {
    title: "Гаджет",
    text: "Дорого, спорно и снова экран. Бумажная книга дает совместное чтение, разговор и вещь, которую можно держать в руках.",
  },
];

const occasions = [
  {
    title: "День рождения",
    text: "Это именная книга для ребёнка на день рождения, где он становится главным героем приключения, а не просто получает очередную вещь.",
  },
  {
    title: "Новый год",
    text: "Сказочная книга с зимним настроением, семейным теплом, чудом и героем, который узнает себя на страницах.",
  },
  {
    title: "Выпускной",
    text: "Для детского сада, младшей школы или важного перехода: книга про смелость, рост и новый этап.",
  },
  {
    title: "Первое чтение",
    text: "Когда хочется заинтересовать книгами: знакомый герой помогает ребенку дочитать историю до конца.",
  },
  {
    title: "От бабушки",
    text: "Теплый подарок ребенку от бабушки, дедушки или крестных: с домом, питомцем, любимой игрушкой и семейной заботой.",
  },
  {
    title: "У него все есть",
    text: "Необычный подарок ребенку, который не конкурирует с игрушками, а становится отдельной личной историей.",
  },
];

const ingredients = [
  "фото ребенка",
  "имя, возраст и характер",
  "любимый мир или жанр",
  "игрушка, питомец или талисман",
  "повод для подарка",
  "деталь, которую узнает семья",
];

const process = [
  {
    icon: ImagePlus,
    title: "Добавьте героя",
    text: "Загрузите фото ребенка, имя, возраст и несколько деталей о характере, привычках и любимых вещах.",
  },
  {
    icon: Sparkles,
    title: "Выберите жанр",
    text: "Приключение, волшебная школа, фэнтези или русский киберпанк помогают сделать подарок под интересы ребенка.",
  },
  {
    icon: BookOpen,
    title: "Посмотрите превью",
    text: "Первое превью показывает, как ребенок выглядит в истории и как работает персональная книга для ребенка.",
  },
  {
    icon: PackageCheck,
    title: "Подарите книгу",
    text: "После проверки мы готовим макет, редактуру, печать и отправляем настоящую бумажную книгу по России.",
  },
];

const faqs = [
  {
    question: "На какой возраст подходит?",
    answer:
      "Лучше всего формат работает для детей примерно от 4 до 12 лет. Для малышей книгу читают вместе с родителями, для старших можно сделать больше приключения и самостоятельности.",
  },
  {
    question: "Это именно печатная книга?",
    answer:
      "Да. Fairyteller делает физическую бумажную книгу, а не PDF. Ее можно подарить, поставить на полку, читать вместе и сохранить как память.",
  },
  {
    question: "Насколько герой похож на ребенка?",
    answer:
      "Фото помогает сохранить узнаваемые черты: прическу, выражение, одежду и общую пластику. Это художественная иллюстрация, а не фотокопия.",
  },
  {
    question: "Можно подарить без повода?",
    answer:
      "Да. Такая книга хорошо работает не только на день рождения или Новый год, но и как поддержка: когда хочется показать ребенку, что его видят и ценят.",
  },
  {
    question: "Сколько стоит и как быстро делается?",
    answer:
      "Печатная книга стоит от 3500₽. Первое превью появляется за несколько минут, после оплаты книга готовится к печати за один день и отправляется доставкой по России.",
  },
];

const childHeroSlots = ["Ребёнок", "Друг", "Родитель", "Герой 4"];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Сказка с именем ребёнка — персональная книга на заказ",
    description:
      "Именная сказка для ребёнка: уникальный сюжет, иллюстрации по фото, персонаж похож на вашего малыша, физическая книга от 3500₽ с доставкой по России.",
    brand: { "@type": "Brand", name: "Fairyteller" },
    image: "https://fairyteller.ru/images/book-exmpl6.jpg",
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: "3500",
      availability: "https://schema.org/InStock",
      url: "https://fairyteller.ru/podarok/rebenku",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: "https://fairyteller.ru/" },
      { "@type": "ListItem", position: 2, name: "Сказка с именем ребёнка", item: "https://fairyteller.ru/podarok/rebenku" },
    ],
  },
];

const ChildGiftLanding = () => {
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
        title="Сказка с именем ребёнка — персональная книга на заказ | Fairyteller"
        description="Создайте именную сказку для ребёнка: уникальный сюжет, иллюстрации по фото, персонаж похож на вашего малыша. Физическая книга от 3500₽ с доставкой по России."
        path="/podarok/rebenku"
        image="/images/book-exmpl6.jpg"
        type="product"
        jsonLd={jsonLd}
      />
      <style>
        {`
          .child-gift-page h1,
          .child-gift-page h2,
          .child-gift-page h3 {
            color: #E89C31;
            font-family: "Avenir Next", "Helvetica Neue", Jost, Futura, Arial, sans-serif;
            letter-spacing: 0;
            text-shadow: none;
          }

          .child-gift-page,
          .child-gift-page * {
            min-width: 0;
            box-sizing: border-box;
          }

          .child-gift-page {
            max-width: 100vw;
          }

          .child-gift-page h1,
          .child-gift-page h2,
          .child-gift-page h3,
          .child-gift-page p,
          .child-gift-page a {
            overflow-wrap: break-word;
          }

          .child-gift-page a,
          .child-gift-page button,
          .child-gift-page input,
          .child-gift-page textarea {
            font-family: inherit;
          }

          .child-gift-page .fairyteller-choice-strip {
            overscroll-behavior-x: contain;
            scrollbar-width: none;
          }

          .child-gift-page .fairyteller-choice-strip::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>

      <div className="child-gift-page">
        <LandingHeader />

        <section className="mx-auto grid w-full max-w-[1480px] min-w-0 overflow-hidden border-black lg:min-h-[640px] lg:grid-cols-[1.08fr_0.92fr]">
          <div className="flex min-w-0 flex-col justify-between border-black px-5 py-9 md:px-8 md:py-11 lg:border-r lg:pb-16">
            <div className="w-full max-w-[360px] md:max-w-none">
              <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#5e6264]">
                Именная сказка для ребёнка
              </p>
              <h1 className="mt-5 w-full max-w-full break-normal text-[28px] font-black uppercase leading-[1.08] tracking-normal min-[420px]:text-[34px] sm:text-[40px] md:max-w-[780px] md:text-[46px] lg:text-[44px] 2xl:text-[54px]">
                Сказка с именем ребёнка — персональная книга на заказ
              </h1>
              <p className="mt-5 w-full max-w-[340px] text-[16px] leading-[1.42] md:max-w-[680px] md:text-[21px] md:leading-[1.35]">
                Создайте именную сказку для ребёнка: имя, фото и любимые детали превращаются
                в уникальный сюжет, где персонаж похож на вашего малыша. Это физическая книга,
                которую можно читать вместе, дарить на праздник и хранить дома.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#create"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-black px-4 py-3 text-center text-[12px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#5e6264] sm:w-auto sm:px-6 sm:text-[13px]"
                >
                  <Gift className="h-5 w-5" />
                  Создать именную сказку
                </a>
                <a
                  href="#why-book"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 border border-black bg-white px-4 py-3 text-center text-[12px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-black hover:text-white sm:w-auto sm:px-6 sm:text-[13px]"
                >
                  Почему книга
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
                aria-label="Показать следующее фото подарка ребенку"
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

        <section id="why-book" className="scroll-mt-24 border-y border-black bg-[#fae7e1] px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.78fr_1.22fr]">
            <div>
              <h2 className={sectionTitleClass}>Почему именная книга, а не просто вещь.</h2>
            </div>
            <div className="grid border-l border-t border-black md:grid-cols-2">
              <article className="border-b border-r border-black bg-white p-5">
                <Heart className="h-7 w-7" />
                <h3 className="mt-10 text-[34px] font-black uppercase leading-none">Про него</h3>
                <p className="mt-5 text-[16px] leading-7 text-[#5e6264]">
                  Ребенок видит в книге себя: имя, внешность, характер, любимый мир и маленькие детали.
                  Так персональная сказка для ребёнка становится подарком, сделанным именно про него.
                </p>
              </article>
              <article className="border-b border-r border-black bg-white p-5">
                <BookOpen className="h-7 w-7" />
                <h3 className="mt-10 text-[34px] font-black uppercase leading-none">Надолго</h3>
                <p className="mt-5 text-[16px] leading-7 text-[#5e6264]">
                  Это не PDF и не игрушка на пару дней. Такие сказки с именами детей остаются на полке,
                  перечитываются и хранят конкретный возраст, мечты и семейную заботу.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="compare" className="scroll-mt-24 border-b border-black bg-white px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto max-w-[1480px]">
            <div className="mb-9 grid gap-5 md:grid-cols-[1fr_440px] md:items-end">
              <h2 className={sectionTitleClass}>Когда обычные подарки уже не попадают.</h2>
              <p className="text-[18px] leading-7 text-[#5e6264]">
                Запрос "я ищу подарок ребенку" часто начинается с сомнения: хочется не банальность
                и не очередную вещь. В этот момент именная книга для ребёнка отвечает личной историей,
                которую можно держать в руках.
              </p>
            </div>
            <div className="grid border-l border-t border-black md:grid-cols-4">
              {ordinaryGifts.map((item) => (
                <article key={item.title} className="min-h-[240px] border-b border-r border-black bg-[#f5f5f5] p-5">
                  <h3 className="text-[28px] font-black uppercase leading-none">{item.title}</h3>
                  <p className="mt-6 text-[15px] leading-7 text-[#5e6264]">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="create" className="scroll-mt-24 border-b border-black bg-[#fae7e1] px-5 py-9 md:px-8 md:py-11">
          <FairytellerInlineConstructor
            availableWorldIds={["adventure", "hogwarts", "fantasy", "cyber"]}
            worldTabLabel="Жанр"
            worldLegend="Выберите жанр"
            heading="Соберите книгу под ребенка."
            description="Добавьте фото, имя, возраст, характер и важные детали. Конструктор соберет персональную сказку по фото ребёнка: именную книгу, где он главный герой."
            locationLabel="Место истории"
            locationPlaceholder="Дом, школа, лес, город, волшебная страна"
            artifactLabel="Важная деталь"
            artifactPlaceholder="Игрушка, питомец, рюкзак, талисман, любимая книга"
            heroIntro="Добавьте ребенка как главного героя. Фото поможет сделать иллюстрации узнаваемыми, но сохранить книжный стиль."
            defaultVisibleHeroIndexes={[0]}
            defaultHeroAgeGroup="child"
            requiredHeroCount={1}
            heroSlots={childHeroSlots}
            submitLabel="Создать именную сказку"
          />
        </section>

        <section id="occasions" className="scroll-mt-24 border-b border-black bg-white px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <h2 className={sectionTitleClass}>Под какие поводы.</h2>
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
              <h2 className={sectionTitleClass}>Что делает подарок личным.</h2>
              <p className="text-[18px] leading-7 text-[#5e6264]">
                Самые сильные детали простые: фото ребенка, любимая игрушка, питомец, характер,
                место действия и повод. Так персональная сказка по фото ребёнка выглядит узнаваемой,
                но остается настоящей книжной историей.
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
                <img src={drevogradHandsImage} alt="Обложка детской книги Лист над Древоградом" className="h-full min-h-[260px] w-full border-b border-black object-cover md:border-b-0 md:border-r" />
                <img src={drevogradSpreadImage} alt="Разворот детской персональной книги" className="h-full min-h-[260px] w-full border-b border-black object-cover md:border-b-0 md:border-r" />
                <img src={drevogradBackImage} alt="Задняя обложка детской персональной книги" className="h-full min-h-[260px] w-full object-cover" />
              </div>
            </div>
          </div>
        </section>

        <section id="process" className="scroll-mt-24 border-b border-black bg-white px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <h2 className={sectionTitleClass}>Как создается книга.</h2>
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
                  <Link to="/podarok/skazka-po-foto" className="hover:text-white hover:underline">Сказка по фото</Link>
                  <Link to="/podarok/dlya-pary" className="hover:text-white hover:underline">Для пары</Link>
                  <Link to="/podarok/na-godovshchinu" className="hover:text-white hover:underline">На годовщину</Link>
                  <a href="#faq" className="hover:text-white hover:underline">FAQ</a>
                  <Link to="/blog" className="hover:text-white hover:underline">Журнал</Link>
                </nav>
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

export default ChildGiftLanding;
