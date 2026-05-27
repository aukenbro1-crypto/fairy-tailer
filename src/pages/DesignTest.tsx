import { Link, useLocation } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Mail,
  Menu,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import logoImage from "@/assets/logo.png";
import disneyStyleImage from "@/assets/disney-style.jpg";
import minibrickStyleImage from "@/assets/minibrick-style.jpg";
import naiveStyleImage from "@/assets/naive-style.jpg";
import claymotionStyleImage from "@/assets/claymotion-style.png";
import watercolorStyleImage from "@/assets/watercolor-style.jpg";
import yarncraftStyleImage from "@/assets/yarncraft-style.jpg";
import toonflatStyleImage from "@/assets/toonflat-style.jpg";
import celCinemaStyleImage from "@/assets/celcinema-style.jpg";
import romanticStoryImage from "@/assets/romantic-story.png";
import heroCyberStackImage from "@/assets/header-photos/ischezayushchiy-express_header_cyber-stack_1800x1400.webp";
import heroMapCoverImage from "@/assets/header-photos/tainy-zakoldovannoy-karty_header_cover-color-field_1800x1400.webp";
import heroOpenSpreadImage from "@/assets/header-photos/tropa-za-holm_header_open-spread_1800x1400.webp";
import heroStillLifeImage from "@/assets/header-photos/tropa-za-holm_header_website-hero-still-life_1800x1400.webp";
import exampleGenerated04Image from "@/assets/example-photos/generated-04.webp";
import exampleGenerated23Image from "@/assets/example-photos/generated-23.webp";
import exampleGenerated56Image from "@/assets/example-photos/generated-56.webp";
import exampleCactusCityImage from "@/assets/example-photos/cactus-city-open-book-hands-bench.webp";
import exampleCactusShelfImage from "@/assets/example-photos/cactus-marocco-zellige-shelf-spine.webp";
import exampleCactusLapImage from "@/assets/example-photos/cactus-open-spread-lap.webp";
import exampleCactusFlatlayImage from "@/assets/example-photos/cactus-flatlay-mood.webp";
import exampleCactusHeaderImage from "@/assets/example-photos/cactus-header.webp";
import exampleMapTableImage from "@/assets/example-photos/map-open-book-table.webp";
import exampleMapBackImage from "@/assets/example-photos/map-back-cover.webp";

const typeStyle = {
  fontFamily:
    '"Avenir Next", "Helvetica Neue", Jost, Futura, Arial, sans-serif',
};

const DEFAULT_CREATE_ENDPOINT_URL = "/webhook/fairyteller/create";
const CREATE_ENDPOINT_URL = import.meta.env.VITE_FAIRYTELLER_CREATE_URL || DEFAULT_CREATE_ENDPOINT_URL;
const STATUS_ENDPOINT_BASE_URL = import.meta.env.VITE_FAIRYTELLER_STATUS_BASE_URL || "/api/fairyteller/jobs";

const sectionTitleClass =
  "max-w-[980px] text-[36px] font-black uppercase leading-[1.14] tracking-normal md:text-[58px] xl:text-[62px]";

const worlds = [
  {
    id: "romance",
    value: "disney_light",
    title: "Романтическая история",
    text: "Знаковые места, общие моменты, нежность и личная память.",
    detail: "романтическая история",
  },
  {
    id: "adventure",
    value: "adventure_classic",
    title: "Приключения",
    text: "Путь героя, помощники, испытания и возвращение домой.",
    detail: "приключения",
  },
  {
    id: "hogwarts",
    value: "hogwarts_world",
    title: "Мир Хогварства",
    text: "Письмо, заклинания, тайная библиотека и личная история внутри волшебного мира.",
    detail: "мир Хогварства",
  },
  {
    id: "fantasy",
    value: "fantasy_epic",
    title: "Фэнтези",
    text: "Магия, выбор, древняя тайна и герой, который взрослеет по пути.",
    detail: "фэнтези",
  },
  {
    id: "cyber",
    value: "cyberpunk_dream",
    title: "Русский киберпанк",
    text: "Поезд, город, тайна и личная история внутри яркого будущего.",
    detail: "русский киберпанк",
  },
];

const styles = [
  { id: "photorealistic", title: "Фотореализм", label: "Фотореализм", image: romanticStoryImage },
  { id: "disney", title: "Дисней", label: "Дисней", image: disneyStyleImage },
  { id: "toonflat", title: "Мультяшный", label: "Мультяшный", image: toonflatStyleImage },
  { id: "minibrick", title: "Лего", label: "Лего", image: minibrickStyleImage },
  { id: "naive", title: "Наивный", label: "Наивный", image: naiveStyleImage },
  { id: "watercolor", title: "Акварель", label: "Акварель", image: watercolorStyleImage },
  { id: "claymotion", title: "Пластилин", label: "Пластилин", image: claymotionStyleImage },
  { id: "yarncraft", title: "Вязаный", label: "Вязаный", image: yarncraftStyleImage },
  { id: "celcinema", title: "Аниме", label: "Аниме", image: celCinemaStyleImage },
];

const illustrationStylePrompts: Record<string, string> = {
  photorealistic:
    "photorealistic cinematic book illustration: realistic people, natural skin texture, true-to-life faces, accurate facial proportions, natural hair and fabric, believable hands and anatomy, 50mm lens depth, warm editorial lighting, print-ready composition; use uploaded photos as strong identity references when available; no cartoon, no painterly stylization, no plastic/toy look, no distorted anatomy.",
  disney:
    "hand-drawn storybook animation aesthetic: expressive faces, clean outlines, vivid yet balanced colors, cinematic lighting, gentle gradients, painterly backgrounds; harmonious composition and emotional warmth; strictly figurative, readable silhouettes; original characters; no broken anatomy; no collage/3D.",
  toonflat:
    "vintage TV-cartoon aesthetic: bold black outlines, flat warm colors, simple geometric forms, playful exaggerated expressions, soft yellowish skin tones optional; strictly figurative, clear character poses; original characters only; no broken anatomy; no collage/3D.",
  minibrick:
    "brick-miniature diorama style: visible studs and seams, glossy plastic material, simplified blocky anatomy (cylindrical head, curved hands), modular brick-built scenery; strictly figurative, readable poses; original characters; no printed logos or text; no photoreal humans.",
  naive:
    "naive folk painting: childlike proportions, flat perspective, bold simple shapes, decorative folk motifs; in the manner of early 20th-century primitivism; strictly figurative, readable silhouettes; original characters; no broken anatomy.",
  watercolor:
    "soft watercolor illustration: gentle washes, translucent pigment layers, visible paper grain, diffused light, wet-on-wet edges, subtle gradients; strictly figurative, readable silhouettes; original characters; no broken anatomy; no collage/3D.",
  claymotion:
    "clay stop-motion aesthetic: sculpted clay characters with visible texture, soft handmade look, warm lighting, slight surface imperfections, tactile realism; carefully staged poses, readable silhouettes; strictly figurative; original characters; no photorealism or 3D-rendered surfaces.",
  yarncraft:
    "fully hand-knitted textile world: characters and environment made only of yarn/felt/thread; human figures are knitted dolls with visible stitches and soft wool fuzz; embroidered facial features (eyebrows/eyelashes/mouth), button/felt-disc eyes; hair = twisted yarn strands; knitted clothing (rib/garter/stockinette); plush volumes, braided cords/rails; knitted snow and embroidered stars; warm window glow vs cold night; cozy fairy-tale diorama, shallow depth of field. strictly figurative, readable silhouettes, clear poses, original characters only. represent glass/water/fire as yarn/felt. no photorealism/CG sheen/3D/collage/plastic.",
  celcinema:
    "cinematic cel-animation aesthetic: expressive faces, clean color blocks with soft shading, painterly backgrounds, atmospheric warm light; strictly figurative (no manga panels or speech bubbles); original characters; no broken anatomy.",
};

const process = [
  ["01", "Расскажите о себе", "Имя, возраст, фото, характер и детали, которые сделают историю личной."],
  [
    "02",
    "Выберите мир",
    "Романтическая история, приключения, мир Хогварства, фэнтези или русский киберпанк. Выберите атмосферу и стиль изображений, который подходит именно вам.",
  ],
  ["03", "Получите превью", "Готовую историю с иллюстрациями вы увидите через 2-3 минуты."],
  [
    "04",
    "Отправьте книгу в печать",
    "Оплатите заказ, мы напечатаем книгу в течение одного дня и вышлем ее по указанному адресу.",
  ],
];

const heroMetrics = [
  ["3 минуты", "Создание истории"],
  ["1 день", "Печать после оплаты"],
  ["40 страниц", "5 иллюстрированных глав"],
];

const heroImages = [
  { title: "Тропа за холм", image: heroOpenSpreadImage },
  { title: "Исчезающий экспресс", image: heroCyberStackImage },
  { title: "Тайны заколдованной карты", image: heroMapCoverImage },
  { title: "Подарочная книга", image: heroStillLifeImage },
];

const exampleCarousel = [
  { title: "Книга на столе", label: "Пример", image: exampleGenerated04Image },
  { title: "Книжная стопка", label: "Пример", image: exampleGenerated23Image },
  { title: "Готовая обложка", label: "Пример", image: exampleGenerated56Image },
  { title: "Книга в руках", label: "Пример", image: exampleCactusCityImage },
  { title: "Корешок на полке", label: "Пример", image: exampleCactusShelfImage },
  { title: "Разворот на коленях", label: "Пример", image: exampleCactusLapImage },
  { title: "Подарочный flat lay", label: "Пример", image: exampleCactusFlatlayImage },
  { title: "Обложка с кактусами", label: "Пример", image: exampleCactusHeaderImage },
  { title: "Разворот на столе", label: "Пример", image: exampleMapTableImage },
  { title: "Задняя обложка", label: "Пример", image: exampleMapBackImage },
];

const giftIdeas = [
  {
    title: "Ребенку",
    text: "Приключение, где ребенок узнает себя, свои привычки, любимые вещи и маленькие победы. И с удовольствием прочтет рассказ сам или вместе с родителем.",
  },
  {
    title: "Любимому человеку",
    text: "История про вашу встречу, знаковые места и общие моменты.",
  },
  {
    title: "Родителям",
    text: "Семейная книга с благодарностью, памятью о детстве и традициях.",
  },
  {
    title: "Другу",
    text: "Подарок для близкого человека, которого хочется рассмешить, поддержать или удивить.",
  },
  {
    title: "На годовщину",
    text: "Издание про пару: поездку, обещание, смешное событие или что-то, что хочется сохранить в памяти.",
  },
  {
    title: "Для себя",
    text: "Личная книга как способ пережить и отрефлексировать период жизни, мечту или важное событие.",
  },
];

const formats = [
  {
    icon: Mail,
    title: "Уникальный сюжет",
    text: "Иллюстрации с вашими лицами, примерно 20 минут чтения.",
  },
  {
    icon: BookOpen,
    title: "Подарок за 3500₽",
    text: "Команда опытных редакторов вычитает текст и подготовит макет к печати.",
  },
  {
    icon: PackageCheck,
    title: "Бесплатная доставка по России",
    text: "Доставка в ближайший ПВЗ Яндекс Маркет, СДЭК и 5Post, от двух дней.",
  },
];

const faqs = [
  {
    question: "Что нужно, чтобы создать книгу?",
    answer: "Вы выбираете мир, место действия, артефакт, описываете героев, добавляете фото и оставляете email для готового превью.",
  },
  {
    question: "Когда появится первое превью?",
    answer: "Готовую историю с иллюстрациями можно увидеть через 2-3 минуты после заполнения конструктора.",
  },
  {
    question: "Можно ли добавить фотографии?",
    answer: "Да. Фото помогают сделать героев похожими на вас и ваших близких. Лучше всего работают портреты, где хорошо видно лицо.",
  },
  {
    question: "Можно ли сделать книгу для взрослого?",
    answer: "Да. Это может быть романтическая история, приключение, мир Хогварства, фэнтези или русский киберпанк, не только детская сказка.",
  },
  {
    question: "Что происходит после оплаты?",
    answer: "Редакторы вычитывают текст, вносят правки, собирают макет и передают книгу в печать.",
  },
  {
    question: "Как я получу печатную книгу?",
    answer: "Мы печатаем книгу за один день после оплаты и отправляем из Москвы по всей РФ. Сроки доставки зависят от города.",
  },
];

const homeJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Fairyteller",
    url: "https://fairyteller.ru",
    logo: "https://fairyteller.ru/apple-touch-icon.png",
    sameAs: ["https://vk.com/fairyteller", "https://dzen.ru/fairyteller"],
  },
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Персональная бумажная книга",
    description:
      "Персональная бумажная книга о близком человеке с уникальным сюжетом, иллюстрациями по фото, редактурой и доставкой по России.",
    brand: { "@type": "Brand", name: "Fairyteller" },
    image: "https://fairyteller.ru/images/book-exmpl6.jpg",
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: "3500",
      availability: "https://schema.org/InStock",
      url: "https://fairyteller.ru/",
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
];

const createJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Создать персональную книгу",
    description:
      "Онлайн-конструктор Fairyteller: выберите мир, добавьте героев, фото и стиль иллюстраций, чтобы получить персональную книгу.",
    url: "https://fairyteller.ru/create",
  },
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Создание персональной книги",
    description:
      "Конструктор персональных книг по фото: превью за несколько минут, редактура, печать и доставка по России.",
    brand: { "@type": "Brand", name: "Fairyteller" },
    image: "https://fairyteller.ru/images/book-exmpl6.jpg",
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: "3500",
      availability: "https://schema.org/InStock",
      url: "https://fairyteller.ru/create",
    },
  },
];

const constructorTabs = ["Мир", "Герои", "Стиль"];
const heroSlots = ["Главный герой", "Герой 2", "Герой 3", "Герой 4"];
const ageGroups = [
  { value: "child", label: "Ребенок" },
  { value: "teen", label: "Подросток" },
  { value: "adult", label: "Взрослый" },
];
const marqueeItems = [...exampleCarousel, ...exampleCarousel, ...exampleCarousel];

type HeroDraft = {
  name: string;
  desc: string;
  photo: File | null;
};

type CreateResponse = {
  ok?: boolean;
  jobId?: string;
  statusUrl?: string;
  message?: string;
};

type JobStatus = {
  jobId?: string;
  status?: string;
  stage?: string;
  progress?: number;
  message?: string;
  preview?: {
    title?: string;
  } | null;
  artifacts?: {
    fullText?: { status?: string };
    fullVisuals?: { status?: string };
    cover?: { status?: string };
    render?: {
      status?: string;
      files?: {
        book?: { url?: string };
        preview?: { url?: string };
      };
    };
    bookPdf?: { url?: string };
    previewPdf?: { url?: string };
  };
  error?: string | null;
};

const CtaStrip = () => (
  <a
    href="#create"
    className="group flex min-h-[62px] items-center justify-center border-b border-black bg-black px-5 text-center text-[15px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#E89C31] hover:text-black md:text-[20px]"
  >
    Создать свою книгу
    <ArrowRight className="ml-4 h-6 w-6 transition group-hover:translate-x-1" />
  </a>
);

const DesignTest = () => {
  const { toast } = useToast();
  const { pathname } = useLocation();
  const isCreatePath = pathname === "/create";
  const [world, setWorld] = useState(worlds[0].id);
  const [style, setStyle] = useState(styles[0].id);
  const [heroIndex, setHeroIndex] = useState(0);
  const [constructorStep, setConstructorStep] = useState(0);
  const [visibleHeroes, setVisibleHeroes] = useState([0]);
  const [location, setLocation] = useState("");
  const [artifact, setArtifact] = useState("");
  const [email, setEmail] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [heroes, setHeroes] = useState<Record<number, HeroDraft>>({
    0: { name: "", desc: "", photo: null },
  });
  const [heroAgeGroups, setHeroAgeGroups] = useState<Record<number, string>>({});
  const [isHeroMenuOpen, setIsHeroMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);
  const [submittedStatusUrl, setSubmittedStatusUrl] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const worldStripRef = useRef<HTMLDivElement>(null);
  const styleStripRef = useRef<HTMLDivElement>(null);
  const exampleStripRef = useRef<HTMLDivElement>(null);
  const generationStatusRef = useRef<HTMLDivElement>(null);
  const exampleDragRef = useRef<{ x: number; scrollLeft: number } | null>(null);
  const exampleHoverRef = useRef(false);
  const exampleDraggingRef = useRef(false);

  const selectedWorld = useMemo(
    () => worlds.find((item) => item.id === world) ?? worlds[0],
    [world],
  );
  const renderStatus = jobStatus?.artifacts?.render?.status || null;
  const bookPdfUrl =
    jobStatus?.artifacts?.previewPdf?.url ||
    jobStatus?.artifacts?.render?.files?.preview?.url ||
    jobStatus?.artifacts?.bookPdf?.url ||
    jobStatus?.artifacts?.render?.files?.book?.url ||
    "";
  const statusProgress = Math.max(0, Math.min(100, Number(jobStatus?.progress || (submittedJobId ? 8 : 0))));
  const isGenerationReady = renderStatus === "ready" && Boolean(bookPdfUrl);
  const hiddenHeroes = heroSlots
    .map((slot, index) => ({ slot, index }))
    .filter((item) => item.index > 0 && !visibleHeroes.includes(item.index));
  const goHero = (direction: -1 | 1) => {
    setHeroIndex((index) => (index + direction + heroImages.length) % heroImages.length);
  };
  const addHero = (index: number) => {
    setVisibleHeroes((items) => [...items, index].sort((a, b) => a - b));
    setHeroes((items) => ({
      ...items,
      [index]: items[index] ?? { name: "", desc: "", photo: null },
    }));
    setIsHeroMenuOpen(false);
  };
  const removeHero = (index: number) => {
    setVisibleHeroes((items) => items.filter((item) => item !== index));
    setHeroes((items) => {
      const next = { ...items };
      delete next[index];
      return next;
    });
    setHeroAgeGroups((items) => {
      const next = { ...items };
      delete next[index];
      return next;
    });
  };
  const updateHero = (index: number, patch: Partial<HeroDraft>) => {
    setHeroes((items) => ({
      ...items,
      [index]: {
        name: "",
        desc: "",
        photo: null,
        ...(items[index] ?? {}),
        ...patch,
      },
    }));
  };
  const handlePhotoChange = (index: number, fileList: FileList | null) => {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Неверный формат",
        description: "Загрузите изображение в JPG, PNG или WebP.",
      });
      return;
    }

    updateHero(index, { photo: file });
  };
  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
  const heroHasContent = (index: number) => {
    const hero = heroes[index];
    return Boolean(hero?.name.trim() || hero?.desc.trim() || hero?.photo);
  };
  const handleSubmitBook = async () => {
    if (isSubmitting) {
      return;
    }

    if (!consentChecked) {
      toast({
        variant: "destructive",
        title: "Нужно согласие",
        description: "Подтвердите согласие на обработку персональных данных.",
      });
      return;
    }

    if (!validateEmail(email)) {
      toast({
        variant: "destructive",
        title: "Почта",
        description: "Введите корректный email для превью.",
      });
      setConstructorStep(2);
      return;
    }

    const missingAgeHero = visibleHeroes.find((index) => heroHasContent(index) && !heroAgeGroups[index]);
    if (missingAgeHero !== undefined) {
      toast({
        variant: "destructive",
        title: "Возраст героя",
        description: `Выберите возраст для поля «${heroSlots[missingAgeHero]}».`,
      });
      setConstructorStep(1);
      return;
    }

    const multipartData = new FormData();
    multipartData.append("world", selectedWorld.value);
    multipartData.append("newyear_mode", "false");
    multipartData.append("location", location);
    multipartData.append("artifact", artifact);
    multipartData.append("length_target", "15000");
    multipartData.append("chapters", "5");
    multipartData.append("title_need", "false");
    multipartData.append("language", "ru");
    multipartData.append("email", email.toLowerCase());
    multipartData.append("illustration_style", style);
    multipartData.append("illustration_style_prompt", illustrationStylePrompts[style] || style);

    visibleHeroes.forEach((index) => {
      const n = index + 1;
      const hero = heroes[index] ?? { name: "", desc: "", photo: null };
      multipartData.append(`hero${n}_name`, hero.name);
      multipartData.append(`hero${n}_desc`, hero.desc);
      multipartData.append(`hero${n}_rel`, "");
      multipartData.append(`hero${n}_age_group`, heroAgeGroups[index] || "");

      if (hero.photo) {
        multipartData.append(`hero${n}_photo`, hero.photo);
        multipartData.append(`hero${n}_photo_name`, hero.photo.name);
        multipartData.append(`hero${n}_photo_mime`, hero.photo.type);
      }
    });

    setIsSubmitting(true);
    setSubmittedJobId(null);
    setSubmittedStatusUrl(null);
    setJobStatus(null);

    try {
      const response = await fetch(CREATE_ENDPOINT_URL, {
        method: "POST",
        body: multipartData,
      });
      const contentType = response.headers.get("content-type") || "";
      const createResult = contentType.includes("application/json")
        ? ((await response.json()) as CreateResponse)
        : null;

      if (!response.ok) {
        throw new Error(createResult?.message || "Create request failed");
      }

      setSubmittedJobId(createResult?.jobId || null);
      setSubmittedStatusUrl(createResult?.statusUrl || null);
      toast({
        title: "Книга создается",
        description: "Запустили генерацию текста, иллюстраций и печатного макета.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Не получилось отправить форму",
        description: "Проверьте данные и попробуйте еще раз.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const scrollWorlds = (direction: -1 | 1) => {
    worldStripRef.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  };
  const scrollStyles = (direction: -1 | 1) => {
    styleStripRef.current?.scrollBy({ left: direction * 260, behavior: "smooth" });
  };
  const normalizeExampleScroll = useCallback(() => {
    const strip = exampleStripRef.current;
    if (!strip) {
      return;
    }

    const cycleWidth = strip.scrollWidth / 3;
    if (!cycleWidth) {
      return;
    }

    if (strip.scrollLeft < cycleWidth * 0.5) {
      strip.scrollLeft += cycleWidth;
    } else if (strip.scrollLeft > cycleWidth * 1.5) {
      strip.scrollLeft -= cycleWidth;
    }
  }, []);
  const startExampleDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!exampleStripRef.current) {
      return;
    }

    event.preventDefault();
    exampleStripRef.current.setPointerCapture(event.pointerId);
    exampleDraggingRef.current = true;
    exampleDragRef.current = {
      x: event.clientX,
      scrollLeft: exampleStripRef.current.scrollLeft,
    };
  };
  const moveExampleDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!exampleStripRef.current || !exampleDragRef.current) {
      return;
    }

    exampleStripRef.current.scrollLeft = exampleDragRef.current.scrollLeft - (event.clientX - exampleDragRef.current.x);
  };
  const stopExampleDrag = () => {
    exampleDragRef.current = null;
    exampleDraggingRef.current = false;
    normalizeExampleScroll();
  };
  const handleExamplePointerEnter = () => {
    exampleHoverRef.current = true;
  };
  const handleExamplePointerLeave = () => {
    exampleHoverRef.current = false;
    stopExampleDrag();
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex((index) => (index + 1) % heroImages.length);
    }, 8500);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const strip = exampleStripRef.current;
    if (!strip) {
      return undefined;
    }

    const cycleWidth = strip.scrollWidth / 3;
    if (cycleWidth) {
      strip.scrollLeft = cycleWidth;
    }

    const intervalId = window.setInterval(() => {
      if (!exampleHoverRef.current && !exampleDraggingRef.current && exampleStripRef.current) {
        exampleStripRef.current.scrollLeft += 1;
        normalizeExampleScroll();
      }
    }, 60);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [normalizeExampleScroll]);

  useEffect(() => {
    if (!submittedJobId) {
      return;
    }

    let cancelled = false;
    const statusUrl = submittedStatusUrl || `${STATUS_ENDPOINT_BASE_URL}/${submittedJobId}`;

    const loadStatus = async () => {
      try {
        const response = await fetch(statusUrl, { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const status = (await response.json()) as JobStatus;
        if (!cancelled) {
          setJobStatus(status);
        }
      } catch (error) {
        if (!cancelled) {
          setJobStatus((current) => current);
        }
      }
    };

    void loadStatus();
    const intervalId = window.setInterval(loadStatus, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [submittedJobId, submittedStatusUrl]);

  useEffect(() => {
    if (window.location.pathname !== "/create") {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById("create")?.scrollIntoView({ block: "start" });
    });
  }, []);

  useEffect(() => {
    if (!submittedJobId) {
      return;
    }

    window.requestAnimationFrame(() => {
      generationStatusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [submittedJobId]);

  return (
    <main className="design-test-page min-h-screen overflow-x-hidden bg-white text-black" style={typeStyle}>
      <SEO
        title={
          isCreatePath
            ? "Создать персональную книгу по фото — конструктор Fairyteller"
            : "Книги, где ты главный герой — персональная книга в подарок | Fairyteller"
        }
        description={
          isCreatePath
            ? "Создайте персональную книгу по фото: выберите мир, добавьте героев и получите превью за несколько минут. Печатная книга от 3500₽ с доставкой по России."
            : "Создайте персональную бумажную книгу о близком человеке: уникальный сюжет, иллюстрации по фото, редактура и доставка по России. Подарок от 3500₽."
        }
        path={isCreatePath ? "/create" : "/"}
        image="/images/book-exmpl6.jpg"
        type="product"
        jsonLd={isCreatePath ? createJsonLd : homeJsonLd}
      />
      <style>
        {`
          .design-test-page h1,
          .design-test-page h2 {
            color: #E89C31;
            font-family: "Avenir Next", "Helvetica Neue", Jost, Futura, Arial, sans-serif;
            letter-spacing: inherit;
            line-height: 1.12 !important;
            text-shadow: none;
          }

          .design-test-page h3 {
            color: #E89C31;
            font-family: "Avenir Next", "Helvetica Neue", Jost, Futura, Arial, sans-serif;
            letter-spacing: inherit;
            line-height: 1.08 !important;
            text-shadow: none;
          }

          .design-test-page,
          .design-test-page * {
            min-width: 0;
          }

          .design-test-page h1,
          .design-test-page h2,
          .design-test-page h3,
          .design-test-page p {
            overflow-wrap: break-word;
          }

          .design-test-page a,
          .design-test-page button,
          .design-test-page input,
          .design-test-page textarea {
            font-family: inherit;
          }

          .fairyteller-marquee-track {
            transform: translateZ(0);
          }

          .fairyteller-example-strip {
            overscroll-behavior-x: contain;
            scrollbar-width: none;
          }

          .fairyteller-choice-strip {
            overscroll-behavior-x: contain;
            scrollbar-width: none;
          }

          .fairyteller-example-strip::-webkit-scrollbar {
            display: none;
          }

          .fairyteller-choice-strip::-webkit-scrollbar {
            display: none;
          }

        `}
      </style>

      <div className="border-b border-black bg-black px-5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white md:px-8">
        Персональные книги - история за 3 минуты, печать за 1 день
      </div>

      <header className="sticky inset-x-0 top-0 z-40 border-b border-black bg-white">
        <div className="mx-auto flex h-14 max-w-[1480px] items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-5">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center border border-black bg-white text-black transition hover:bg-black hover:text-white md:hidden"
              aria-label="Открыть меню"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="flex items-center gap-3" aria-label="FairyTeller">
              <img src={logoImage} alt="FairyTeller" className="h-10 w-auto object-contain" />
            </Link>
          </div>

          <nav className="hidden items-center gap-8 text-[13px] font-bold uppercase tracking-[0.05em] md:flex">
            <a href="#process" className="hover:underline">
              Как работает
            </a>
            <a href="#create" className="hover:underline">
              Создать
            </a>
            <a href="#examples" className="hover:underline">
              Примеры
            </a>
            <Link to="/podarok/dlya-pary" className="hover:underline">
              Для пары
            </Link>
            <a href="#faq" className="hover:underline">
              FAQ
            </a>
            <Link to="/blog" className="hover:underline">
              Журнал
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="#examples"
              className="hidden h-10 w-10 items-center justify-center border border-black bg-white text-black transition hover:bg-black hover:text-white sm:inline-flex"
              aria-label="Смотреть примеры книг"
            >
              <Search className="h-4 w-4" />
            </a>
            <a
              href="#create"
              className="inline-flex h-10 items-center justify-center gap-2 border border-black bg-black px-4 text-[13px] font-bold uppercase tracking-[0.05em] text-white transition hover:bg-white hover:text-black"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Заказать</span>
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-[1480px] min-w-0 border-black lg:h-[620px] lg:grid-cols-[0.92fr_1.08fr] lg:overflow-hidden">
        <div className="relative flex min-w-0 flex-col justify-between border-black px-5 py-9 md:px-8 md:py-11 lg:border-r lg:pb-16">
          <div className="w-[calc(100vw-40px)] max-w-[760px] md:w-auto">
            <h1 className={`${sectionTitleClass} w-full max-w-full break-words md:max-w-[760px]`}>
              <span className="block">Книги, где ты</span>
              <span className="block">главный герой.</span>
            </h1>
            <p className="mt-5 w-full max-w-[360px] text-[18px] leading-[1.42] sm:max-w-[660px] md:text-[21px] md:leading-[1.35]">
              Создайте бумажную книгу о близком человеке. Персональные книги для себя, родных и друзей — от 3500₽.
            </p>
            <div className="mt-5 flex w-full flex-col gap-3 sm:flex-row">
              <a
                href="#create"
                className="inline-flex h-12 items-center justify-center gap-2 bg-black px-6 text-[13px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#5e6264]"
              >
                <BookOpen className="h-5 w-5" />
                Создать книгу
              </a>
              <a
                href="#examples"
                className="inline-flex h-12 items-center justify-center gap-2 border border-black bg-white px-6 text-[13px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-black hover:text-white"
              >
                Смотреть примеры
                <ArrowRight className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="mt-5 grid w-[calc(100vw-40px)] border-t border-black text-sm font-bold uppercase tracking-[0.04em] sm:grid-cols-3 md:w-auto lg:absolute lg:bottom-0 lg:left-8 lg:right-8 lg:mt-0 lg:w-auto">
            {heroMetrics.map(([value, label]) => (
              <div key={value} className="border-black py-2 sm:border-r sm:px-4 sm:first:pl-0 sm:last:border-r-0">
                <span className="block text-[15px]">{value}</span>
                <span className="mt-1 block text-[11px] text-[#5e6264]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 overflow-hidden">
          <div className="relative flex h-full min-h-[340px] items-center justify-center md:min-h-[500px] lg:min-h-0">
            <button
              type="button"
              onClick={() => goHero(1)}
              className="absolute inset-0 cursor-pointer"
              aria-label="Показать следующее фото"
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

      <CtaStrip />

      <section id="process" className="scroll-mt-24 border-b border-black bg-[#f5f5f5] px-5 py-9 md:px-8 md:py-11">
        <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <h2 className={sectionTitleClass}>
              Как это работает.
            </h2>
          </div>

          <div className="grid border-l border-t border-black sm:grid-cols-2">
            {process.map(([n, title, text]) => (
              <article key={n} className="min-h-[210px] border-b border-r border-black bg-white p-5">
                <span className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#5e6264]">
                  {n}
                </span>
                <h3 className="mt-7 text-[28px] font-black uppercase leading-none tracking-[-0.02em]">
                  {title}
                </h3>
                <p className="mt-5 text-[16px] leading-7 text-[#5e6264]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="create" className="scroll-mt-24 border-b border-black bg-[#fae7e1] px-5 py-9 md:px-8 md:py-11">
        <div className="mx-auto max-w-[1480px]">
          <div className="mb-9 grid gap-5 md:grid-cols-[1fr_420px] md:items-end">
            <div>
              <h2 className={sectionTitleClass}>
                Соберите свою книгу.
              </h2>
            </div>
            <p className="text-[18px] leading-7 text-[#5e6264]">
              Мир, место действия, артефакт, герои, фото, стиль иллюстраций и email: это тот же сценарий старого конструктора, но в более спокойной книжной подаче.
            </p>
          </div>

          <div className="border border-black bg-white">
            <form className="bg-white p-5 md:p-8">
              <div className="mb-8 flex flex-wrap gap-0 border-l border-t border-black">
                {constructorTabs.map((step, index) => (
                  <button
                    type="button"
                    key={step}
                    onClick={() => setConstructorStep(index)}
                    className={`inline-flex h-11 items-center gap-2 border-b border-r border-black px-4 text-[12px] font-bold uppercase tracking-[0.12em] ${
                      index === constructorStep ? "bg-black text-white" : "bg-white text-black hover:bg-[#f5f5f5]"
                    }`}
                  >
                    {index === constructorStep ? <Check className="h-4 w-4" /> : <span>{`0${index + 1}`}</span>}
                    <span>{step}</span>
                  </button>
                ))}
              </div>

              {constructorStep === 0 && (
                <div>
                  <fieldset>
                    <div className="flex items-center justify-between gap-4">
                      <legend className="text-[28px] font-black uppercase leading-none tracking-[-0.02em]">
                        Выберите мир
                      </legend>
                      <div className="flex shrink-0 border-l border-t border-black">
                        <button
                          type="button"
                          onClick={() => scrollWorlds(-1)}
                          className="inline-flex h-11 w-11 items-center justify-center border-b border-r border-black bg-white transition hover:bg-black hover:text-white"
                          aria-label="Прокрутить миры влево"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollWorlds(1)}
                          className="inline-flex h-11 w-11 items-center justify-center border-b border-r border-black bg-white transition hover:bg-black hover:text-white"
                          aria-label="Прокрутить миры вправо"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    <div
                      ref={worldStripRef}
                      className="fairyteller-choice-strip mt-5 flex snap-x snap-mandatory overflow-x-auto scroll-smooth border-l border-t border-black"
                    >
                      {worlds.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setWorld(item.id)}
                          className={`flex h-[206px] w-[260px] shrink-0 snap-start flex-col border-b border-r border-black p-4 text-left transition md:h-[194px] md:w-[310px] ${
                            world === item.id ? "bg-black text-white" : "bg-white text-black hover:bg-[#f5f5f5]"
                          }`}
                        >
                          <span className="block min-h-[52px] text-[21px] font-black uppercase leading-[1.08] tracking-normal">
                            {item.title}
                          </span>
                          <span className={`mt-4 block text-[14px] leading-6 ${world === item.id ? "text-white/72" : "text-[#5e6264]"}`}>
                            {item.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <div className="mt-8 grid gap-5 md:grid-cols-2">
                    <label className="block">
                      <span className="text-[13px] font-bold uppercase tracking-[0.12em]">Место действия</span>
                      <input
                        value={location}
                        onChange={(event) => setLocation(event.currentTarget.value)}
                        className="mt-2 h-[52px] w-full border border-black bg-white px-4 text-[18px] text-black outline-none transition placeholder:text-[#8a8a8a] focus:bg-[#f5f5f5]"
                        placeholder="Мехико, дача, поезд, старый город"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[13px] font-bold uppercase tracking-[0.12em]">Артефакт</span>
                      <input
                        value={artifact}
                        onChange={(event) => setArtifact(event.currentTarget.value)}
                        className="mt-2 h-[52px] w-full border border-black bg-white px-4 text-[18px] text-black outline-none transition placeholder:text-[#8a8a8a] focus:bg-[#f5f5f5]"
                        placeholder="Компас, кулон, билет, игрушка"
                      />
                    </label>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setConstructorStep(1)}
                      className="inline-flex h-[52px] items-center justify-center gap-2 bg-black px-6 text-[13px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#5e6264]"
                    >
                      Перейти к героям
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}

              {constructorStep === 1 && (
                <div>
                  <fieldset>
                    <legend className="text-[28px] font-black uppercase leading-none tracking-[-0.02em]">
                      Герои и фото
                    </legend>
                    <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
                      <p className="max-w-[520px] text-[14px] leading-6 text-[#5e6264]">
                        Главный герой обязателен. Дополнительных героев можно добавить вручную.
                      </p>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsHeroMenuOpen((value) => !value)}
                          disabled={hiddenHeroes.length === 0}
                          className="inline-flex h-11 items-center justify-center gap-2 border border-black bg-white px-4 text-[12px] font-bold uppercase tracking-[0.1em] transition hover:bg-black hover:text-white disabled:cursor-default disabled:border-[#8a8a8a] disabled:text-[#8a8a8a] disabled:hover:bg-white"
                        >
                          <Plus className="h-4 w-4" />
                          Добавить героя
                        </button>
                        {isHeroMenuOpen && hiddenHeroes.length > 0 && (
                          <div className="absolute right-0 top-[calc(100%+8px)] z-10 w-[210px] border border-black bg-white shadow-[8px_8px_0_#000]">
                            {hiddenHeroes.map(({ slot, index }) => (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => addHero(index)}
                                className="flex h-11 w-full items-center justify-between border-b border-black px-4 text-left text-[12px] font-bold uppercase tracking-[0.1em] last:border-b-0 hover:bg-[#f5f5f5]"
                              >
                                {slot}
                                <Plus className="h-4 w-4" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                      {visibleHeroes.map((index) => (
                        <article key={heroSlots[index]} className="border border-black p-4">
                          <div className="flex items-center justify-between gap-4">
                            <h3 className="text-[20px] font-black uppercase leading-none tracking-[-0.02em]">
                              {heroSlots[index]}
                            </h3>
                            {index === 0 ? (
                              <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#8a8a8a]">
                                Обязательно
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => removeHero(index)}
                                className="inline-flex h-8 w-8 items-center justify-center border border-black bg-white text-black transition hover:bg-black hover:text-white"
                                aria-label={`Убрать ${heroSlots[index]}`}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <div className="mt-5 grid gap-4">
                            <input
                              value={heroes[index]?.name ?? ""}
                              onChange={(event) => updateHero(index, { name: event.currentTarget.value })}
                              className="h-[48px] w-full border border-black bg-white px-4 text-[16px] text-black outline-none transition placeholder:text-[#8a8a8a] focus:bg-[#f5f5f5]"
                              placeholder="Имя"
                            />
                            <input
                              type="hidden"
                              name={`hero${index + 1}_age_group`}
                              value={heroAgeGroups[index] ?? ""}
                            />
                            <div>
                              <span className="mb-2 block text-[12px] font-bold uppercase tracking-[0.12em] text-[#5e6264]">
                                Возраст
                              </span>
                              <div
                                className="grid grid-cols-3 border-l border-t border-black"
                                role="radiogroup"
                                aria-label={`Возраст героя ${index + 1}`}
                              >
                                {ageGroups.map((option) => {
                                  const isSelected = heroAgeGroups[index] === option.value;

                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      role="radio"
                                      aria-checked={isSelected}
                                      onClick={() => setHeroAgeGroups((items) => ({ ...items, [index]: option.value }))}
                                      className={`min-h-[44px] border-b border-r border-black px-2 text-[11px] font-bold uppercase tracking-[0.07em] transition ${
                                        isSelected ? "bg-black text-white" : "bg-white text-black hover:bg-[#f5f5f5]"
                                      }`}
                                    >
                                      {option.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            <textarea
                              value={heroes[index]?.desc ?? ""}
                              onChange={(event) => updateHero(index, { desc: event.currentTarget.value })}
                              className="min-h-[96px] w-full resize-none border border-black bg-white px-4 py-3 text-[16px] leading-6 text-black outline-none transition placeholder:text-[#8a8a8a] focus:bg-[#f5f5f5]"
                              placeholder="Описание героя: характер, привычки, важные детали."
                            />
                            <input
                              id={`hero-photo-${index}`}
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              onChange={(event) => handlePhotoChange(index, event.currentTarget.files)}
                            />
                            <button
                              type="button"
                              onClick={() => document.getElementById(`hero-photo-${index}`)?.click()}
                              className="inline-flex h-12 items-center justify-center gap-2 border border-black bg-[#f5f5f5] px-4 text-[12px] font-bold uppercase tracking-[0.08em] transition hover:bg-black hover:text-white"
                            >
                              {heroes[index]?.photo?.name ?? "Загрузить фото"}
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </fieldset>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <button
                      type="button"
                      onClick={() => setConstructorStep(0)}
                      className="inline-flex h-[52px] items-center justify-center gap-2 border border-black bg-white px-6 text-[13px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-black hover:text-white"
                    >
                      <ChevronLeft className="h-5 w-5" />
                      Назад
                    </button>
                    <button
                      type="button"
                      onClick={() => setConstructorStep(2)}
                      className="inline-flex h-[52px] items-center justify-center gap-2 bg-black px-6 text-[13px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#5e6264]"
                    >
                      Перейти к стилю
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}

              {constructorStep === 2 && (
                <div>
                  <fieldset>
                    <div className="flex items-center justify-between gap-4">
                      <legend className="text-[28px] font-black uppercase leading-none tracking-[-0.02em]">
                        Стиль иллюстраций
                      </legend>
                      <div className="flex shrink-0 border-l border-t border-black">
                        <button
                          type="button"
                          onClick={() => scrollStyles(-1)}
                          className="inline-flex h-11 w-11 items-center justify-center border-b border-r border-black bg-white transition hover:bg-black hover:text-white"
                          aria-label="Прокрутить стили влево"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollStyles(1)}
                          className="inline-flex h-11 w-11 items-center justify-center border-b border-r border-black bg-white transition hover:bg-black hover:text-white"
                          aria-label="Прокрутить стили вправо"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    <div
                      ref={styleStripRef}
                      className="fairyteller-choice-strip mt-5 flex snap-x snap-mandatory overflow-x-auto scroll-smooth border-l border-t border-black"
                    >
                      {styles.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setStyle(item.id)}
                          className="group w-[220px] shrink-0 snap-start border-b border-r border-black bg-white text-left md:w-[245px]"
                        >
                          <img src={item.image} alt={item.label} className="aspect-[5/3] w-full object-cover grayscale transition group-hover:grayscale-0" />
                          <span className={`flex min-h-[72px] items-center justify-between gap-2 px-3 py-3 text-[13px] font-bold uppercase tracking-[0.08em] ${
                            style === item.id ? "bg-black text-white" : "bg-white text-black"
                          }`}>
                            {item.title}
                            {style === item.id && <Check className="h-4 w-4 shrink-0" />}
                          </span>
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <div className="mt-8 grid gap-5 border-t border-black pt-6 md:grid-cols-2">
                    <label className="block">
                      <span className="text-[13px] font-bold uppercase tracking-[0.12em]">Email для превью</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.currentTarget.value)}
                        className="mt-2 h-[52px] w-full border border-black bg-white px-4 text-[18px] text-black outline-none transition placeholder:text-[#8a8a8a] focus:bg-[#f5f5f5]"
                        placeholder="name@example.com"
                      />
                    </label>
                    <label className="flex min-h-[52px] items-start gap-3 border border-black p-4 text-[13px] leading-5 text-[#5e6264]">
                      <input
                        type="checkbox"
                        checked={consentChecked}
                        onChange={(event) => setConsentChecked(event.currentTarget.checked)}
                        className="mt-1 h-4 w-4 accent-black"
                      />
                      <span>Я согласен на обработку персональных данных.</span>
                    </label>
                  </div>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <button
                      type="button"
                      onClick={() => setConstructorStep(1)}
                      className="inline-flex h-[52px] items-center justify-center gap-2 border border-black bg-white px-6 text-[13px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-black hover:text-white"
                    >
                      <ChevronLeft className="h-5 w-5" />
                      Назад
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitBook}
                      disabled={isSubmitting}
                      className="inline-flex h-[52px] items-center justify-center gap-2 bg-black px-6 text-[13px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#5e6264] disabled:cursor-wait disabled:bg-[#5e6264]"
                    >
                      <Sparkles className="h-5 w-5" />
                      {isSubmitting ? "Отправляем" : "Создать книгу"}
	                    </button>
	                  </div>
	                </div>
	              )}

              {submittedJobId && (
                <div ref={generationStatusRef} className="mx-auto mt-10 max-w-[780px] border border-black bg-[#fae7e1] p-6 text-center md:p-8">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center border border-black bg-white">
                    {isGenerationReady ? <Check className="h-8 w-8" /> : <Sparkles className="h-8 w-8" />}
                  </div>
                  <p className="mt-5 text-[12px] font-bold uppercase tracking-[0.14em] text-[#5e6264]">
                    {isGenerationReady ? "Превью готово" : "Создаем персональную книгу"}
                  </p>
                  <h3 className="mx-auto mt-3 max-w-[620px] text-[34px] font-black uppercase leading-[1.05] text-black md:text-[48px]">
                    {isGenerationReady ? "Книга готова." : "Генерация идет."}
                  </h3>
                  <div className="mt-7 flex items-center justify-between gap-4 text-[13px] font-bold uppercase tracking-[0.1em]">
                    <span>Статус</span>
                    <span>{statusProgress}%</span>
                  </div>
                  <div className="mt-3 h-4 border border-black bg-white">
                    <div className="h-full bg-black transition-all duration-500" style={{ width: `${statusProgress}%` }} />
                  </div>
                  <p className="mx-auto mt-5 max-w-[560px] text-[17px] leading-7 text-[#5e6264]">
                    {jobStatus?.message || "Готовим сюжет, иллюстрации, обложку и печатный макет."}
                  </p>
                  {isGenerationReady && (
                    <a
                      href={bookPdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-7 inline-flex h-[52px] items-center justify-center border border-black bg-black px-6 text-[13px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-white hover:text-black"
                    >
                      Открыть превью
                    </a>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      <section id="examples" className="scroll-mt-24 border-b border-black bg-white px-5 py-9 md:px-8 md:py-11">
        <div className="mx-auto max-w-[1480px]">
          <div className="mb-9 grid gap-5 md:grid-cols-[1fr_440px] md:items-end">
            <div>
              <h2 className={sectionTitleClass}>
                Одна и та же история может быть очень разной.
              </h2>
            </div>
            <p className="text-[18px] leading-7 text-[#5e6264]">
              Выберите мир: романтическая история, приключения, мир Хогварства, фэнтези или русский киберпанк. Одна и та же личная история получит разные оттенки, настроение и визуальный ряд.
            </p>
          </div>
        </div>

        <div
          ref={exampleStripRef}
          onPointerEnter={handleExamplePointerEnter}
          onPointerDown={startExampleDrag}
          onPointerMove={moveExampleDrag}
          onPointerUp={stopExampleDrag}
          onPointerCancel={stopExampleDrag}
          onPointerLeave={handleExamplePointerLeave}
          onScroll={normalizeExampleScroll}
          className="fairyteller-example-strip -mx-5 cursor-grab touch-pan-x overflow-x-auto overflow-y-hidden border-y border-black bg-[#f5f5f5] active:cursor-grabbing md:-mx-8"
        >
          <div className="fairyteller-marquee-track flex w-max">
            {marqueeItems.map((item, index) => (
              <article key={`${item.title}-${index}`} className="w-[260px] shrink-0 border-r border-black bg-white md:w-[340px]">
                <img
                  src={item.image}
                  alt={item.title}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-black bg-[#f5f5f5] px-5 py-9 md:px-8 md:py-11">
        <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <h2 className={sectionTitleClass}>
              Повод начинается с человека.
            </h2>
          </div>

          <div className="grid border-l border-t border-black md:grid-cols-3">
            {giftIdeas.map((item) => (
              <article key={item.title} className="min-h-[230px] border-b border-r border-black bg-white p-5">
                <h3 className="text-[28px] font-black uppercase leading-none tracking-[-0.02em]">
                  {item.title}
                </h3>
                <p className="mt-6 text-[15px] leading-7 text-[#5e6264]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="formats" className="scroll-mt-24 border-b border-black bg-white px-5 py-9 md:px-8 md:py-11">
        <div className="mx-auto max-w-[1480px]">
          <div className="mb-9 grid gap-5 md:grid-cols-[1fr_460px] md:items-end">
            <div>
              <h2 className={sectionTitleClass}>
                От превью к настоящей книге.
              </h2>
            </div>
            <p className="text-[18px] leading-7 text-[#5e6264]">
              FairyTeller — это магия персональной бумажной книги, которая возникает, когда держишь издание в руках, рассматриваешь, читаешь и делишься им с другими.
            </p>
          </div>

          <div className="grid border-l border-t border-black md:grid-cols-3">
            {formats.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="min-h-[260px] border-b border-r border-black bg-white p-5">
                  <Icon className="h-7 w-7" />
                  <h3 className="mt-10 text-[34px] font-black uppercase leading-none tracking-[-0.02em]">
                    {item.title}
                  </h3>
                  <p className="mt-5 text-[15px] leading-7 text-[#5e6264]">{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 border-b border-black bg-[#f5f5f5] px-5 py-9 md:px-8 md:py-11">
        <div className="mx-auto grid max-w-[1480px] gap-10 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <h2 className={sectionTitleClass}>
              Вопросы и ответы.
            </h2>
          </div>

          <div className="border-l border-t border-black">
            {faqs.map((item) => (
              <article key={item.question} className="grid border-b border-r border-black bg-white p-5 md:grid-cols-[0.48fr_0.52fr] md:gap-8">
                <h3 className="text-[24px] font-black uppercase leading-[0.98] tracking-[-0.02em]">
                  {item.question}
                </h3>
                <p className="mt-4 text-[16px] leading-7 text-[#5e6264] md:mt-0">
                  {item.answer}
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
    </main>
  );
};

export default DesignTest;
