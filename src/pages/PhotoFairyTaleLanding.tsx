import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  ImagePlus,
  PackageCheck,
  Sparkles,
} from "lucide-react";

import SEO from "@/components/SEO";
import FairytellerInlineConstructor from "@/components/FairytellerInlineConstructor";
import LandingHeader from "@/components/LandingHeader";
import logoImage from "@/assets/logo.png";
import listFrontImage from "@/assets/landing-photos/skazka-photo-list-front.webp";
import listBackImage from "@/assets/landing-photos/skazka-photo-list-back.webp";
import listSpreadImage from "@/assets/landing-photos/skazka-photo-list-spread.webp";
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
  ["Фото героя", "Для иллюстраций"],
  ["От 3500₽", "Печать и доставка"],
  ["Превью", "За несколько минут"],
];

const steps = [
  {
    icon: ImagePlus,
    title: "Загрузи фото",
    text: "Добавьте снимок ребёнка и пару слов о характере, любимых деталях и настроении будущей сказки.",
  },
  {
    icon: Sparkles,
    title: "Получи превью",
    text: "Система собирает сюжет и первые иллюстрации, чтобы вы увидели, как работает сказка по фотографии ребёнка.",
  },
  {
    icon: PackageCheck,
    title: "Закажи книгу",
    text: "После проверки мы готовим макет, редактуру и настоящую печатную книгу с доставкой по России.",
  },
];

const differences = [
  "герой узнаётся по чертам, но остаётся книжным персонажем",
  "текст редактируется перед печатью",
  "итог — не PDF, а бумажная книга, которую можно подарить",
  "можно добавить родителей, друга, питомца или любимый предмет",
];

const faqs = [
  {
    question: "Насколько похож герой на фото?",
    answer:
      "Мы стремимся сохранить узнаваемые черты: причёску, форму лица, общее выражение, одежду или важные детали. Это не фотокопия, а художественная иллюстрация в стиле книги.",
  },
  {
    question: "Это только для детей?",
    answer:
      "Нет. Чаще всего такую книгу заказывают детям, но можно создать сказку по фото для взрослого, пары или семьи, если нужен личный подарок.",
  },
  {
    question: "Сколько делается?",
    answer:
      "Первое превью появляется за несколько минут. Печатная книга после оплаты готовится к печати за один день и отправляется доставкой по России.",
  },
];

const childHeroSlots = ["Ребёнок", "Друг", "Родитель", "Герой 4"];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Создать сказку по фото — книга с иллюстрациями",
    description:
      "Сказка по фотографии ребёнка: персональная бумажная книга с иллюстрациями, редактурой и доставкой по России.",
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
      acceptedAnswer: { "@type": "Answer", text: item.answer },
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
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-black" style={typeStyle}>
      <SEO
        title="Создать сказку по фото — книга с иллюстрациями | Fairyteller"
        description="Загрузите фото ребёнка — получите сказку где он главный герой. Иллюстрации с узнаваемыми чертами, редактура, печатная книга от 3500₽ с доставкой по России."
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
              <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#5e6264]">
                Книга-сказка с иллюстрациями по фото
              </p>
              <h1 className="mt-5 w-full max-w-full text-[28px] font-black uppercase leading-[1.08] tracking-normal sm:text-[36px] md:max-w-[780px] md:text-[42px] lg:text-[48px] 2xl:text-[56px]">
                Сказка по фото: ваш ребёнок — главный герой
              </h1>
              <p className="mt-5 w-full max-w-[700px] text-[16px] leading-[1.42] md:text-[21px] md:leading-[1.35]">
                Можно создать сказку по фото и получить персональную сказку с фото, где ребёнок
                узнаёт себя в иллюстрациях. Это сказка где ребёнок главный герой, а финал
                существует не в файле, а в настоящей печатной книге.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#create"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-black px-4 py-3 text-center text-[12px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#5e6264] sm:w-auto sm:px-6 sm:text-[13px]"
                >
                  <BookOpen className="h-5 w-5" />
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

          <div className="grid overflow-hidden bg-[#f5f5f5] md:h-[560px] md:grid-cols-2 lg:h-[640px]">
            <img src={listSpreadImage} alt="Разворот книги-сказки с иллюстрациями по фото" className="h-[360px] w-full object-cover md:h-full md:min-h-0" />
            <div className="grid grid-rows-2 border-t border-black md:h-full md:min-h-0 md:border-l md:border-t-0">
              <img src={listFrontImage} alt="Обложка именной книги по фото" className="h-[220px] w-full border-b border-black object-cover md:h-full md:min-h-0" />
              <img src={listBackImage} alt="Задняя обложка персональной сказки по фото" className="h-[220px] w-full object-cover md:h-full md:min-h-0" />
            </div>
          </div>
        </section>

        <section id="process" className="scroll-mt-24 border-y border-black bg-[#fae7e1] px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.78fr_1.22fr]">
            <div>
              <h2 className={sectionTitleClass}>Как это работает.</h2>
            </div>
            <div className="grid border-l border-t border-black md:grid-cols-3">
              {steps.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="min-h-[250px] border-b border-r border-black bg-white p-5">
                    <Icon className="h-7 w-7" />
                    <h3 className="mt-10 text-[30px] font-black uppercase leading-none">{item.title}</h3>
                    <p className="mt-5 text-[16px] leading-7 text-[#5e6264]">{item.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="difference" className="scroll-mt-24 border-b border-black bg-white px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <h2 className={sectionTitleClass}>Не PDF. Настоящая книга.</h2>
            </div>
            <div className="grid border-l border-t border-black md:grid-cols-[0.95fr_1.05fr]">
              <article className="border-b border-r border-black bg-black p-6 text-white">
                <BookOpen className="h-8 w-8" />
                <h3 className="mt-10 text-[34px] font-black uppercase leading-none text-white">Главное отличие</h3>
                <p className="mt-5 text-[18px] leading-7 text-white/75">
                  Вы заказываете не ссылку и не PDF на почту. Fairyteller делает физическую книгу:
                  с обложкой, разворотами, редактурой и доставкой.
                </p>
              </article>
              <div className="grid border-b border-r border-black bg-[#f5f5f5] p-5 md:grid-cols-2">
                {differences.map((item) => (
                  <span key={item} className="flex min-h-[64px] items-center gap-3 border-b border-black py-3 text-[15px] font-bold uppercase leading-5 last:border-b-0 md:odd:border-r md:odd:pr-4 md:even:pl-4">
                    <Check className="h-5 w-5 shrink-0" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="examples" className="scroll-mt-24 border-b border-black bg-[#f5f5f5] px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto max-w-[1480px]">
            <div className="mb-9 grid gap-5 md:grid-cols-[1fr_440px] md:items-end">
              <h2 className={sectionTitleClass}>Примеры разворотов.</h2>
              <p className="text-[18px] leading-7 text-[#5e6264]">
                Ниже реальные фото печатных книг: так выглядит книга-сказка с иллюстрациями по фото,
                когда история уже живёт на бумаге.
              </p>
            </div>
            <div className="grid border-l border-t border-black md:grid-cols-3">
              <img src={zagadkaSpreadImage} alt="Разворот персональной сказки с иллюстрациями" className="h-full min-h-[280px] w-full border-b border-r border-black object-cover" />
              <img src={zagadkaFrontImage} alt="Фронтальная обложка именной книги с фото" className="h-full min-h-[280px] w-full border-b border-r border-black object-cover" />
              <img src={zagadkaBackImage} alt="Задняя обложка персональной сказки" className="h-full min-h-[280px] w-full border-b border-r border-black object-cover" />
            </div>
          </div>
        </section>

        <section id="price" className="scroll-mt-24 border-b border-black bg-white px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <h2 className={sectionTitleClass}>Цена и сроки.</h2>
            </div>
            <div className="grid border-l border-t border-black md:grid-cols-2">
              <article className="border-b border-r border-black bg-[#f5f5f5] p-5">
                <h3 className="text-[34px] font-black uppercase leading-none">От 3500₽</h3>
                <p className="mt-5 text-[16px] leading-7 text-[#5e6264]">
                  В стоимость входят сюжет, иллюстрации, редактура, печать и доставка по России.
                  Можно именная книга с фото заказать для ребёнка, семьи или взрослого героя.
                </p>
              </article>
              <article className="border-b border-r border-black bg-[#fae7e1] p-5">
                <h3 className="text-[34px] font-black uppercase leading-none">Быстрое превью</h3>
                <p className="mt-5 text-[16px] leading-7 text-[#5e6264]">
                  Первая версия появляется за несколько минут. После оплаты печатная книга готовится
                  к печати за один день и отправляется в доставку.
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
            heading="Создайте сказку по фото."
            description="Добавьте фото ребёнка, имя, характер, место действия и важную деталь. Конструктор соберёт персональную сказку с фото и превью иллюстраций."
            locationLabel="Место сказки"
            locationPlaceholder="Лес, город, дом, школа, волшебная страна"
            artifactLabel="Важная деталь"
            artifactPlaceholder="Игрушка, рюкзак, питомец, любимая книга, талисман"
            heroIntro="Добавьте ребёнка как главного героя. Фото поможет сохранить узнаваемые черты в иллюстрациях."
            defaultVisibleHeroIndexes={[0]}
            defaultHeroAgeGroup="child"
            requiredHeroCount={1}
            heroSlots={childHeroSlots}
            submitLabel="Создать сказку по фото"
          />
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

        <section className="border-b border-black bg-white px-5 py-9 md:px-8 md:py-11">
          <div className="mx-auto flex max-w-[1480px] flex-col gap-5 border-l border-t border-black bg-[#fae7e1] p-5 md:flex-row md:items-center md:justify-between">
            <h2 className="max-w-[780px] text-[34px] font-black uppercase leading-none md:text-[48px]">
              Готовы превратить фото в книгу?
            </h2>
            <a
              href="#create"
              className="inline-flex min-h-12 items-center justify-center gap-2 bg-black px-6 py-3 text-center text-[13px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#5e6264]"
            >
              Создать сказку по фото
              <ArrowRight className="h-5 w-5" />
            </a>
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
