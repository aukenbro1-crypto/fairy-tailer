import { useEffect, useId, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  X,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import claymotionStyleImage from "@/assets/claymotion-style.png";
import celCinemaStyleImage from "@/assets/celcinema-style.jpg";
import disneyStyleImage from "@/assets/disney-style.jpg";
import minibrickStyleImage from "@/assets/minibrick-style.jpg";
import naiveStyleImage from "@/assets/naive-style.jpg";
import romanticStoryImage from "@/assets/romantic-story.png";
import toonflatStyleImage from "@/assets/toonflat-style.jpg";
import watercolorStyleImage from "@/assets/watercolor-style.jpg";
import yarncraftStyleImage from "@/assets/yarncraft-style.jpg";

const DEFAULT_CREATE_ENDPOINT_URL = "/webhook/fairyteller/create";
const CREATE_ENDPOINT_URL = import.meta.env.VITE_FAIRYTELLER_CREATE_URL || DEFAULT_CREATE_ENDPOINT_URL;
const STATUS_ENDPOINT_BASE_URL = import.meta.env.VITE_FAIRYTELLER_STATUS_BASE_URL || "/api/fairyteller/jobs";

const worlds = [
  {
    id: "romance",
    value: "romantic_story",
    title: "Романтическая история",
    text: "Знаковые места, общие моменты, нежность и личная память.",
  },
  {
    id: "adventure",
    value: "adventure_classic",
    title: "Приключения",
    text: "Путь героя, помощники, испытания и возвращение домой.",
  },
  {
    id: "hogwarts",
    value: "hogwarts_world",
    title: "Мир Хогварства",
    text: "Письмо, заклинания, тайная библиотека и личная история внутри волшебного мира.",
  },
  {
    id: "fantasy",
    value: "fantasy_epic",
    title: "Фэнтези",
    text: "Магия, выбор, древняя тайна и герой, который взрослеет по пути.",
  },
  {
    id: "cyber",
    value: "cyberpunk_dream",
    title: "Русский киберпанк",
    text: "Поезд, город, тайна и личная история внутри яркого будущего.",
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

const ageGroups = [
  { value: "child", label: "Ребенок" },
  { value: "teen", label: "Подросток" },
  { value: "adult", label: "Взрослый" },
];

const defaultHeroSlots = ["Главный герой", "Герой 2", "Герой 3", "Герой 4"];

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
  artifacts?: {
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

type LockedWorld = {
  value: string;
  title: string;
  text: string;
};

type FairytellerInlineConstructorProps = {
  lockedWorld?: LockedWorld;
  heading?: string;
  description?: string;
  defaultVisibleHeroIndexes?: number[];
  defaultHeroAgeGroup?: string;
  requiredHeroCount?: number;
  heroSlots?: string[];
  submitLabel?: string;
};

const createHeroDraft = (): HeroDraft => ({ name: "", desc: "", photo: null });

const buildInitialHeroes = (indexes: number[]) =>
  indexes.reduce<Record<number, HeroDraft>>((acc, index) => {
    acc[index] = createHeroDraft();
    return acc;
  }, {});

const buildInitialAgeGroups = (indexes: number[], defaultAgeGroup?: string) => {
  if (!defaultAgeGroup) {
    return {};
  }

  return indexes.reduce<Record<number, string>>((acc, index) => {
    acc[index] = defaultAgeGroup;
    return acc;
  }, {});
};

const FairytellerInlineConstructor = ({
  lockedWorld,
  heading = "Соберите свою книгу.",
  description = "Добавьте место действия, героев, фото, стиль иллюстраций и email для готового превью.",
  defaultVisibleHeroIndexes = [0],
  defaultHeroAgeGroup,
  requiredHeroCount = 1,
  heroSlots = defaultHeroSlots,
  submitLabel = "Создать книгу",
}: FairytellerInlineConstructorProps) => {
  const { toast } = useToast();
  const inputPrefix = useId();
  const initialVisibleHeroes = defaultVisibleHeroIndexes.length > 0 ? defaultVisibleHeroIndexes : [0];
  const isWorldLocked = Boolean(lockedWorld);
  const constructorTabs = isWorldLocked ? ["Детали", "Герои", "Стиль"] : ["Мир", "Герои", "Стиль"];

  const [world, setWorld] = useState(worlds[0].id);
  const [style, setStyle] = useState(styles[0].id);
  const [constructorStep, setConstructorStep] = useState(0);
  const [visibleHeroes, setVisibleHeroes] = useState(initialVisibleHeroes);
  const [location, setLocation] = useState("");
  const [artifact, setArtifact] = useState("");
  const [email, setEmail] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [heroes, setHeroes] = useState<Record<number, HeroDraft>>(() => buildInitialHeroes(initialVisibleHeroes));
  const [heroAgeGroups, setHeroAgeGroups] = useState<Record<number, string>>(() =>
    buildInitialAgeGroups(initialVisibleHeroes, defaultHeroAgeGroup),
  );
  const [isHeroMenuOpen, setIsHeroMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);
  const [submittedStatusUrl, setSubmittedStatusUrl] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);

  const worldStripRef = useRef<HTMLDivElement>(null);
  const styleStripRef = useRef<HTMLDivElement>(null);
  const generationStatusRef = useRef<HTMLDivElement>(null);

  const selectedWorld = lockedWorld ?? worlds.find((item) => item.id === world) ?? worlds[0];
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
    .filter((item) => item.index >= requiredHeroCount && !visibleHeroes.includes(item.index));

  const addHero = (index: number) => {
    setVisibleHeroes((items) => [...items, index].sort((a, b) => a - b));
    setHeroes((items) => ({
      ...items,
      [index]: items[index] ?? createHeroDraft(),
    }));
    if (defaultHeroAgeGroup) {
      setHeroAgeGroups((items) => ({
        ...items,
        [index]: items[index] || defaultHeroAgeGroup,
      }));
    }
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
        ...createHeroDraft(),
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

    const missingRequiredHero = visibleHeroes
      .filter((index) => index < requiredHeroCount)
      .find((index) => !heroes[index]?.name.trim());

    if (missingRequiredHero !== undefined) {
      toast({
        variant: "destructive",
        title: "Имя героя",
        description: `Добавьте имя в поле «${heroSlots[missingRequiredHero]}».`,
      });
      setConstructorStep(1);
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

    if (!validateEmail(email)) {
      toast({
        variant: "destructive",
        title: "Почта",
        description: "Введите корректный email для превью.",
      });
      setConstructorStep(2);
      return;
    }

    if (!consentChecked) {
      toast({
        variant: "destructive",
        title: "Нужно согласие",
        description: "Подтвердите согласие на обработку персональных данных.",
      });
      setConstructorStep(2);
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
      const hero = heroes[index] ?? createHeroDraft();
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
        description: "Запустили генерацию романтической истории, иллюстраций и печатного макета.",
      });
    } catch {
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

  useEffect(() => {
    if (!submittedJobId) {
      return undefined;
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
      } catch {
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
    if (!submittedJobId) {
      return;
    }

    window.requestAnimationFrame(() => {
      generationStatusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [submittedJobId]);

  return (
    <div className="mx-auto max-w-[1480px]">
      <div className="mb-9 grid gap-5 md:grid-cols-[1fr_440px] md:items-end">
        <div>
          <h2 className="max-w-[980px] text-[36px] font-black uppercase leading-[1.12] tracking-normal md:text-[58px] xl:text-[62px]">
            {heading}
          </h2>
        </div>
        <p className="text-[18px] leading-7 text-[#5e6264]">{description}</p>
      </div>

      <div className="border border-black bg-white">
        <form className="bg-white p-5 md:p-8">
          <div className="mb-8 grid grid-cols-3 border-l border-t border-black sm:inline-flex sm:flex-wrap">
            {constructorTabs.map((step, index) => (
              <button
                type="button"
                key={step}
                onClick={() => setConstructorStep(index)}
                className={`inline-flex h-11 min-w-0 items-center justify-center gap-1 border-b border-r border-black px-2 text-[10px] font-bold uppercase tracking-[0.06em] sm:gap-2 sm:px-4 sm:text-[12px] sm:tracking-[0.12em] ${
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
                {isWorldLocked ? (
                  <div>
                    <legend className="text-[28px] font-black uppercase leading-none tracking-normal">
                      Романтическая история
                    </legend>
                    <div className="mt-5 border border-black bg-[#f5f5f5] p-5 md:grid md:grid-cols-[260px_1fr] md:gap-8">
                      <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#5e6264]">
                        {selectedWorld.title}
                      </p>
                      <p className="mt-4 text-[17px] leading-7 text-[#5e6264] md:mt-0">{selectedWorld.text}</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between gap-4">
                      <legend className="text-[28px] font-black uppercase leading-none tracking-normal">
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
                  </div>
                )}
              </fieldset>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="text-[13px] font-bold uppercase tracking-[0.12em]">Место действия</span>
                  <input
                    value={location}
                    onChange={(event) => setLocation(event.currentTarget.value)}
                    className="mt-2 h-[52px] w-full border border-black bg-white px-4 text-[18px] text-black outline-none transition placeholder:text-[#8a8a8a] focus:bg-[#f5f5f5]"
                    placeholder="Город знакомства, дом, поездка, любимое место"
                  />
                </label>
                <label className="block">
                  <span className="text-[13px] font-bold uppercase tracking-[0.12em]">Символ пары</span>
                  <input
                    value={artifact}
                    onChange={(event) => setArtifact(event.currentTarget.value)}
                    className="mt-2 h-[52px] w-full border border-black bg-white px-4 text-[18px] text-black outline-none transition placeholder:text-[#8a8a8a] focus:bg-[#f5f5f5]"
                    placeholder="Кулон, билет, песня, питомец, фраза"
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
                <legend className="text-[28px] font-black uppercase leading-none tracking-normal">
                  Герои и фото
                </legend>
                <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
                  <p className="max-w-[520px] text-[14px] leading-6 text-[#5e6264]">
                    Добавьте двух героев пары. Фото помогут сделать иллюстрации узнаваемыми.
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
                  {visibleHeroes.map((index) => {
                    const photoInputId = `${inputPrefix}-hero-photo-${index}`;
                    const isRequiredHero = index < requiredHeroCount;

                    return (
                      <article key={heroSlots[index]} className="border border-black p-4">
                        <div className="flex items-center justify-between gap-4">
                          <h3 className="text-[20px] font-black uppercase leading-none tracking-normal">
                            {heroSlots[index]}
                          </h3>
                          {isRequiredHero ? (
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
                            placeholder="Описание: характер, привычки, важные детали."
                          />
                          <input
                            id={photoInputId}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(event) => handlePhotoChange(index, event.currentTarget.files)}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById(photoInputId)?.click()}
                            className="inline-flex h-12 items-center justify-center gap-2 border border-black bg-[#f5f5f5] px-4 text-[12px] font-bold uppercase tracking-[0.08em] transition hover:bg-black hover:text-white"
                          >
                            {heroes[index]?.photo?.name ?? "Загрузить фото"}
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
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
                  <legend className="text-[28px] font-black uppercase leading-none tracking-normal">
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
                      <img
                        src={item.image}
                        alt={item.label}
                        className="aspect-[5/3] w-full object-cover grayscale transition group-hover:grayscale-0"
                      />
                      <span
                        className={`flex min-h-[72px] items-center justify-between gap-2 px-3 py-3 text-[13px] font-bold uppercase tracking-[0.08em] ${
                          style === item.id ? "bg-black text-white" : "bg-white text-black"
                        }`}
                      >
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
                  {isSubmitting ? "Отправляем" : submitLabel}
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
              <h3 className="mx-auto mt-3 max-w-[620px] text-[34px] font-black uppercase leading-[1.05] md:text-[48px]">
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
  );
};

export default FairytellerInlineConstructor;
