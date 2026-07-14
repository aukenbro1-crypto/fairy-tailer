import { Link } from "react-router-dom";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import {
  ArrowRight,
  BookOpen,
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
import taynaOpenSpreadImage from "@/assets/landing-photos/child-gift-hero/tayna-beloy-koshki-open-spread.webp";
import taynaCoverImage from "@/assets/landing-photos/child-gift-hero/tayna-beloy-koshki-cover.webp";
import kompasStackImage from "@/assets/landing-photos/child-gift-hero/kompas-zhelaniy-stack.webp";
import kompasFrontBackImage from "@/assets/landing-photos/child-gift-hero/kompas-zhelaniy-front-back.webp";
import drevogradHandsImage from "@/assets/landing-photos/child-gift-drevograd-hands.jpg";
import drevogradSpreadImage from "@/assets/landing-photos/child-gift-drevograd-spread.jpg";
import drevogradBackImage from "@/assets/landing-photos/child-gift-drevograd-back.jpg";

const typeStyle = {
  fontFamily: '"Avenir Next", "Helvetica Neue", Jost, Futura, Arial, sans-serif',
};

const sectionTitleClass =
  "max-w-[980px] text-[36px] font-black uppercase leading-[1.12] tracking-normal md:text-[58px] xl:text-[62px]";

const metrics = [
  ["От 2-х дней", "Доставка по РФ"],
  ["40 страниц", "Полная история"],
  ["5 глав", "С иллюстрациями"],
];

const heroImages = [
  { title: "Разворот книги Тайны белой кошки", image: taynaOpenSpreadImage },
  { title: "Обложка книги Тайны белой кошки", image: taynaCoverImage },
  { title: "Книга Компас желаний на стопке книг", image: kompasStackImage },
  { title: "Передняя и задняя обложки книги Компас желаний", image: kompasFrontBackImage },
];

const occasions = [
  {
    title: "День рождения",
    text: "Персональная сказка по фото, где ребенок, ваша семья и его друзья становятся героями веселого приключения или теплой истории. Может стать как самостоятельным подарком, так и дополнять другие.",
  },
  {
    title: "Выпускной",
    text: "Книга про взросление, смелость, друзей и новый этап: для детского сада, школы или важного события.",
  },
  {
    title: "Поучительный рассказ",
    text: "История, где ваш ребенок справляется со своими страхами или учится принимать правильные решения в игровой форме — через сказочное приключение.",
  },
  {
    title: "Уроки чтения",
    text: "Персонализированные истории с яркими иллюстрациями в любимых мирах — хороший инструмент для тех, кто хочет помочь ребенку полюбить книги.",
  },
  {
    title: "Совместное время",
    text: "Создавайте истории и волшебные миры вместе, а потом — проводите время за совместным чтением и изучением красивых, иногда смешных, иллюстраций. Чтение одной истории занимает около 30 минут.",
  },
  {
    title: "Новый год",
    text: "Создайте новогоднее приключение для своего ребенка — он станет героем теплой праздничной сказки в мире, полном новогодних чудес.",
  },
];

const ingredients = [
  "чёткое фото лица и комплекции",
  "имя, возраст и характер ребёнка",
  "любимое место или мир истории",
  "игрушка, питомец или талисман",
  "повод для подарка",
  "деталь, которую узнает семья",
];

const process = [
  {
    icon: Sparkles,
    title: "Выберите жанр",
    text: "Приключение, фэнтези, магический мир или киберпанк задают настроение и сюжет будущей сказки.",
  },
  {
    icon: ImagePlus,
    title: "Расскажите о ребёнке",
    text: "Добавьте фото, имя, возраст, характер, место действия и важную деталь: талисман, питомца, воспоминание или любимый предмет.",
  },
  {
    icon: BookOpen,
    title: "Выберите стиль",
    text: "Фотореализм, акварель, пластилин, вязаный стиль, аниме и другие варианты помогают задать визуальный характер книги.",
  },
  {
    icon: PackageCheck,
    title: "Получите книгу",
    text: "Через несколько минут появится превью. После оплаты мы вычитаем текст, соберём макет и отправим книгу в печать с доставкой по России.",
  },
];

const faqs = [
  {
    question: "На какой возраст подходит?",
    answer:
      "Лучше всего — для детей примерно от 4 до 12 лет. Для малышей это история для совместного чтения с родителями, а для старших можно сделать больше приключений, самостоятельности и любимых тем.",
  },
  {
    question: "Это именно печатная книга?",
    answer:
      "Да. Fairyteller делает физическую бумажную книгу, а не PDF. Ее можно подарить, поставить на полку, читать вместе и сохранить как память.",
  },
  {
    question: "Насколько герой похож на ребенка?",
    answer:
      "Фото помогает сохранить узнаваемые черты: причёску, форму лица, выражение, одежду и важные детали. Это не фотокопия, а художественная иллюстрация в выбранном стиле книги.",
  },
  {
    question: "Какие жанры можно выбрать?",
    answer:
      "Приключение, волшебный мир, фэнтези или русский киберпанк. Жанр задаёт настроение истории, а детали о ребёнке делают её по-настоящему личной.",
  },
  {
    question: "Что получится в итоге?",
    answer:
      "Бумажная персональная книга: 5 глав, около 40 страниц и иллюстрации. Ребёнок станет главным героем истории, которую можно читать вместе, дарить и хранить на полке.",
  },
  {
    question: "Как создаётся история?",
    answer:
      "Вы заполняете короткую анкету, добавляете фото и оставляете email. Через 2–3 минуты появляется превью, а после оформления команда готовит текст, макет и книгу к печати.",
  },
  {
    question: "Сколько стоит и как быстро доставят?",
    answer:
      "Книга стоит от 3500 ₽. После оплаты мы готовим её к печати и отправляем по России; доставка занимает от двух дней.",
  },
  {
    question: "Можно ли сделать книгу без повода?",
    answer:
      "Да. Это хороший подарок не только на день рождения или Новый год, но и просто как способ провести время вместе, поддержать ребёнка или помочь ему полюбить чтение.",
  },
  {
    question: "Можно ли добавить питомца, друзей или семью?",
    answer:
      "Да. Добавьте их в описание или как дополнительных героев — тогда они смогут появиться в сюжете и иллюстрациях.",
  },
  DELIVERY_FAQ,
];

const childHeroSlots = ["Главный герой", "Герой 2", "Герой 3", "Герой 4"];

const CtaStrip = () => (
  <a
    href="#create"
    className="group flex min-h-[62px] items-center justify-center border-b border-black bg-black px-5 text-center text-[15px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#E89C31] hover:text-black md:text-[20px]"
  >
    Создать свою сказку
    <ArrowRight className="ml-4 h-6 w-6 transition group-hover:translate-x-1" />
  </a>
);

const exampleCarouselItems = [
  { title: "Обложка детской книги", alt: "Обложка детской книги Лист над Древоградом", image: drevogradHandsImage },
  { title: "Разворот детской книги", alt: "Разворот детской персональной книги", image: drevogradSpreadImage },
  { title: "Задняя обложка детской книги", alt: "Задняя обложка детской персональной книги", image: drevogradBackImage },
];

const exampleMarqueeItems = [...exampleCarouselItems, ...exampleCarouselItems, ...exampleCarouselItems];
const CHILD_EXAMPLE_AUTO_SCROLL_SPEED = 0.06;

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
      acceptedAnswer: { "@type": "Answer", text: item.structuredAnswer ?? item.answer },
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
  const exampleStripRef = useRef<HTMLDivElement>(null);
  const exampleDragRef = useRef<{ x: number; scrollLeft: number } | null>(null);
  const exampleAnimationRef = useRef<number | null>(null);
  const exampleLastFrameRef = useRef<number | null>(null);
  const exampleScrollPositionRef = useRef<number | null>(null);
  const exampleDraggingRef = useRef(false);

  const normalizeExampleScroll = useCallback(() => {
    const strip = exampleStripRef.current;
    if (!strip) return;

    const cycleWidth = strip.scrollWidth / 3;
    if (!cycleWidth) return;

    if (strip.scrollLeft < cycleWidth * 0.5) {
      strip.scrollLeft += cycleWidth;
      exampleScrollPositionRef.current = strip.scrollLeft;
    } else if (strip.scrollLeft > cycleWidth * 1.5) {
      strip.scrollLeft -= cycleWidth;
      exampleScrollPositionRef.current = strip.scrollLeft;
    }
  }, []);

  const startExampleDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!exampleStripRef.current) return;

    event.preventDefault();
    exampleStripRef.current.setPointerCapture(event.pointerId);
    exampleDraggingRef.current = true;
    exampleScrollPositionRef.current = exampleStripRef.current.scrollLeft;
    exampleDragRef.current = { x: event.clientX, scrollLeft: exampleStripRef.current.scrollLeft };
  };

  const moveExampleDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!exampleStripRef.current || !exampleDragRef.current) return;

    exampleStripRef.current.scrollLeft = exampleDragRef.current.scrollLeft - (event.clientX - exampleDragRef.current.x);
    exampleScrollPositionRef.current = exampleStripRef.current.scrollLeft;
  };

  const stopExampleDrag = () => {
    exampleDragRef.current = null;
    exampleDraggingRef.current = false;
    normalizeExampleScroll();
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex((index) => (index + 1) % heroImages.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const strip = exampleStripRef.current;
    if (!strip) return undefined;

    const resetToMiddleCycle = () => {
      const cycleWidth = strip.scrollWidth / 3;
      if (cycleWidth) {
        strip.scrollLeft = cycleWidth;
        exampleScrollPositionRef.current = cycleWidth;
      }
    };

    resetToMiddleCycle();
    const animate = (timestamp: number) => {
      if (exampleLastFrameRef.current === null) exampleLastFrameRef.current = timestamp;
      const elapsed = timestamp - exampleLastFrameRef.current;
      exampleLastFrameRef.current = timestamp;

      if (!exampleDraggingRef.current && exampleStripRef.current) {
        const nextPosition = (exampleScrollPositionRef.current ?? exampleStripRef.current.scrollLeft) + elapsed * CHILD_EXAMPLE_AUTO_SCROLL_SPEED;
        exampleScrollPositionRef.current = nextPosition;
        exampleStripRef.current.scrollLeft = nextPosition;
        normalizeExampleScroll();
      }

      exampleAnimationRef.current = window.requestAnimationFrame(animate);
    };

    exampleAnimationRef.current = window.requestAnimationFrame(animate);
    window.addEventListener("resize", resetToMiddleCycle);
    return () => {
      if (exampleAnimationRef.current !== null) window.cancelAnimationFrame(exampleAnimationRef.current);
      exampleLastFrameRef.current = null;
      exampleScrollPositionRef.current = null;
      window.removeEventListener("resize", resetToMiddleCycle);
    };
  }, [normalizeExampleScroll]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-black" style={typeStyle}>
      <SEO
        title="Персональная сказка, где ваш ребенок — главный герой | Fairyteller"
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

          .child-gift-page .fairyteller-choice-strip,
          .child-gift-page .child-gift-example-strip {
            overscroll-behavior-x: contain;
            scrollbar-width: none;
          }

          .child-gift-page .fairyteller-choice-strip::-webkit-scrollbar,
          .child-gift-page .child-gift-example-strip::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>

      <div className="child-gift-page">
        <LandingHeader />

        <section className="mx-auto grid w-full max-w-[1480px] min-w-0 overflow-hidden border-black lg:min-h-[640px] lg:grid-cols-[1.08fr_0.92fr]">
          <div className="flex min-w-0 flex-col justify-between border-black px-5 py-9 md:px-8 md:py-11 lg:border-r lg:pb-16">
            <div className="w-full max-w-[360px] md:max-w-none">
              <h1 className="w-full max-w-full break-normal text-[28px] font-black uppercase leading-[1.08] tracking-normal min-[420px]:text-[34px] sm:text-[40px] md:max-w-[780px] md:text-[46px] lg:text-[44px] 2xl:text-[54px]">
                Персональная сказка, где ваш ребенок — главный герой
              </h1>
              <p className="mt-5 w-full max-w-[340px] text-[16px] leading-[1.42] md:max-w-[680px] md:text-[21px] md:leading-[1.35]">
                Создайте бумажную книгу со стильными иллюстрациями про вашего ребенка. Веселое приключение,
                эпичное фэнтези или поучительный рассказ. История может быть любой. Стоимость книги 3500 рублей
                с бесплатной доставкой.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#create"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-black px-4 py-3 text-center text-[12px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#5e6264] sm:w-auto sm:px-6 sm:text-[13px]"
                >
                  Создать сказку
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

        <section id="process" className="scroll-mt-24 border-y border-black bg-white px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.82fr_1.18fr]">
            <div><h2 className={sectionTitleClass}>Как это работает</h2></div>
            <div className="grid border-l border-t border-black sm:grid-cols-2">
              {process.map((item) => {
                const Icon = item.icon;
                return <article key={item.title} className="min-h-[230px] border-b border-r border-black bg-[#f5f5f5] p-5">
                  <Icon className="h-7 w-7" />
                  <h3 className="mt-9 text-[30px] font-black uppercase leading-none">{item.title}</h3>
                  <p className="mt-5 text-[16px] leading-7 text-[#5e6264]">{item.text}</p>
                </article>;
              })}
            </div>
          </div>
        </section>

        <section id="examples" className="scroll-mt-24 border-b border-black bg-white">
          <div ref={exampleStripRef} onPointerDown={startExampleDrag} onPointerMove={moveExampleDrag} onPointerUp={stopExampleDrag} onPointerCancel={stopExampleDrag} onPointerLeave={stopExampleDrag} onScroll={normalizeExampleScroll} className="child-gift-example-strip cursor-grab select-none touch-pan-x overflow-x-auto overflow-y-hidden border-y border-black bg-[#f5f5f5] active:cursor-grabbing">
            <div className="flex w-max">
              {exampleMarqueeItems.map((item, index) => (
                <article key={`${item.title}-${index}`} className="w-[260px] shrink-0 border-r border-black bg-white md:w-[340px]">
                  <img src={item.image} alt={item.alt} loading="lazy" decoding="async" draggable={false} className="aspect-square w-full object-cover" />
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
            heading="Конструктор сказки"
            description="Заполните 5 коротких пунктов и оставьте email — через 2–3 минуты покажем превью истории. Чем больше живых деталей вы добавите, тем интереснее получится история."
            locationLabel="Место истории"
            locationPlaceholder="Дом, школа, лес, город, волшебная страна"
            artifactLabel="Важная деталь"
            artifactPlaceholder="Игрушка, питомец, рюкзак, талисман, любимая книга"
            heroLegend="Расскажите о ребёнке"
            heroIntro="Добавьте ребёнка как главного героя. Фото поможет сделать иллюстрации узнаваемыми, но сохранить книжный стиль."
            defaultVisibleHeroIndexes={[0]}
            defaultHeroAgeGroup="child"
            requiredHeroCount={1}
            heroSlots={childHeroSlots}
            submitLabel="Создать свою сказку"
          />
        </section>

        <section id="occasions" className="scroll-mt-24 border-b border-black bg-white px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <h2 className={sectionTitleClass}>Повод для необычного подарка</h2>
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

        <section id="details" className="scroll-mt-24 border-b border-black bg-[#f5f5f5] px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto max-w-[1480px]">
            <div className="mb-9 grid gap-5 md:grid-cols-[1fr_440px] md:items-end">
              <h2 className={sectionTitleClass}>Что добавить в сказку</h2>
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
                <img src={drevogradHandsImage} alt="Обложка детской книги Лист над Древоградом" className="h-[260px] w-full border-b border-black object-cover md:h-full md:min-h-[260px] md:border-b-0 md:border-r" />
                <img src={drevogradSpreadImage} alt="Разворот детской персональной книги" className="h-[260px] w-full border-b border-black object-cover md:h-full md:min-h-[260px] md:border-b-0 md:border-r" />
                <img src={drevogradBackImage} alt="Задняя обложка детской персональной книги" className="h-[260px] w-full object-cover md:h-full md:min-h-[260px]" />
              </div>
            </div>
          </div>
        </section>

        <section id="meaning" className="scroll-mt-24 border-b border-black bg-[#fae7e1] px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.78fr_1.22fr]">
            <div><h2 className={sectionTitleClass}>Не шаблон, а личная история</h2></div>
            <div className="grid border-l border-t border-black md:grid-cols-2">
              <article className="border-b border-r border-black bg-white p-5">
                <Heart className="h-7 w-7" />
                <h3 className="mt-10 text-[34px] font-black uppercase leading-none">На основе ребёнка</h3>
                <p className="mt-5 text-[16px] leading-7 text-[#5e6264]">Добавьте фото, имя, возраст, характер, любимые места и маленькие привычки. Так сказка становится книгой про конкретного ребёнка.</p>
              </article>
              <article className="border-b border-r border-black bg-white p-5">
                <BookOpen className="h-7 w-7" />
                <h3 className="mt-10 text-[34px] font-black uppercase leading-none">Хочется читать</h3>
                <p className="mt-5 text-[16px] leading-7 text-[#5e6264]">Персонализированный сюжет, знакомые места и красивые иллюстрации превращают подарок в книгу, которую хочется читать и рассматривать вместе.</p>
              </article>
            </div>
          </div>
        </section>

        <CtaStrip />

        <section id="faq" className="scroll-mt-24 border-b border-black bg-[#f5f5f5] px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <h2 className={sectionTitleClass}>Вопросы и ответы</h2>
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
                  <Link to="/podarok/skazka-po-foto" className="hover:text-white hover:underline">Сказка по фото</Link>
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
