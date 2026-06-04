import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Printer, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import claymotionStyleImage from '@/assets/claymotion-style.png';
import naiveStyleImage from '@/assets/naive-style.jpg';
import minibrickStyleImage from '@/assets/minibrick-style.jpg';
import watercolorStyleImage from '@/assets/watercolor-style.jpg';
import disneyStyleImage from '@/assets/disney-style.jpg';
import toonflatStyleImage from '@/assets/toonflat-style.jpg';
import celcinemaStyleImage from '@/assets/celcinema-style.jpg';
import yarncraftStyleImage from '@/assets/yarncraft-style.jpg';
import dragonAdventureImage from '@/assets/dragon-adventure.png';
import hogwartsMagicImage from '@/assets/hogwarts-magic.png';
import wizardFantasyImage from '@/assets/wizard-fantasy.png';
import russianCyberpunkImage from '@/assets/russian-cyberpunk.png';
import romanticStoryImage from '@/assets/romantic-story.png';
import photorealismStyleImage from '@/assets/photorealism-style.jpeg';

const DEFAULT_CREATE_ENDPOINT_URL = "/webhook/fairyteller/create";
const CREATE_ENDPOINT_URL = import.meta.env.VITE_FAIRYTELLER_CREATE_URL || DEFAULT_CREATE_ENDPOINT_URL;
const STATUS_ENDPOINT_BASE_URL = import.meta.env.VITE_FAIRYTELLER_STATUS_BASE_URL || "/api/fairyteller/jobs";
const PRINT_PAYMENT_URL = "https://fairyteller.ru/pay";

interface CreateResponse {
  ok?: boolean;
  jobId?: string;
  statusUrl?: string;
  message?: string;
}

interface JobStatus {
  jobId: string;
  status: string;
  stage: string;
  progress: number;
  createdAt?: string;
  updatedAt?: string;
  message?: string;
  preview?: {
    chapter?: number;
    title?: string;
    summary?: string;
    text?: string;
    imageStatus?: 'pending' | 'ready' | 'failed';
    imageUrl?: string;
    imageAbsoluteUrl?: string;
  } | null;
  artifacts?: {
    fullText?: {
      status?: 'generating' | 'ready' | 'failed';
      url?: string;
      chapterCount?: number;
    };
    fullVisuals?: {
      status?: 'generating' | 'ready' | 'failed';
      completed?: number;
      total?: number;
      chapterCount?: number;
      images?: Array<{
        slot?: string;
        chapter?: number;
        status?: 'ready' | 'failed' | 'generating';
        url?: string;
        absoluteUrl?: string;
      }>;
    };
    cover?: {
      status?: 'generating' | 'ready' | 'failed';
    };
    render?: {
      status?: 'generating' | 'ready' | 'failed';
      files?: {
        book?: { url?: string; pageCount?: number };
        preview?: { url?: string; pageCount?: number };
        cover?: { url?: string; pageCount?: number };
        interior?: { url?: string; pageCount?: number };
      };
    };
    bookPdf?: { url?: string; pageCount?: number };
    previewPdf?: { url?: string; pageCount?: number };
    coverPdf?: { url?: string; pageCount?: number };
    interiorPdf?: { url?: string; pageCount?: number };
  };
  error?: string | null;
}

type HeroAgeGroup = '' | 'child' | 'teen' | 'adult';

interface FormData {
  world: string;
  newyear_mode: boolean;
  location: string;
  artifact: string;
  length_target: number;
  chapters: number;
  title_need: boolean;
  language: 'ru' | 'en';
  email: string;
  illustration_style: string;
  illustration_style_prompt: string;
  hero1_name: string;
  hero1_desc: string;
  hero1_rel: string;
  hero1_age_group: HeroAgeGroup;
  hero1_photo: File | null;
  hero1_photo_url: string;
  hero2_name: string;
  hero2_desc: string;
  hero2_rel: string;
  hero2_age_group: HeroAgeGroup;
  hero2_photo: File | null;
  hero2_photo_url: string;
  hero3_name: string;
  hero3_desc: string;
  hero3_rel: string;
  hero3_age_group: HeroAgeGroup;
  hero3_photo: File | null;
  hero3_photo_url: string;
  hero4_name: string;
  hero4_desc: string;
  hero4_rel: string;
  hero4_age_group: HeroAgeGroup;
  hero4_photo: File | null;
  hero4_photo_url: string;
}

const HERO_AGE_GROUPS: Array<{ value: Exclude<HeroAgeGroup, ''>; label: string }> = [
  { value: 'child', label: 'Ребенок' },
  { value: 'teen', label: 'Подросток' },
  { value: 'adult', label: 'Взрослый' },
];

export const WORLDS = [{
  value: 'adventure_classic',
  emoji: '🦜',
  image: dragonAdventureImage,
  title: 'Приключения',
  description: 'Дорога, загадки и неожиданные знакомства: герои отправляются в полное загадок путешествие с неожиданной развязкой в конце.',
  tagline: '— Лови момент!'
}, {
  value: 'hogwarts_world',
  emoji: '🧙‍♂️',
  image: hogwartsMagicImage,
  title: 'Мир Хогвартса',
  description: 'Герои оказываются в мире магии и волшебства, где можно раскрыть тайну и погрузиться в атмосферу любимого мира.',
  tagline: '— Алахамор-ра!'
}, {
  value: 'fantasy_epic',
  emoji: '🧙🏻‍♂️',
  image: wizardFantasyImage,
  title: 'Фэнтези',
  description: 'Мир магии и чудес ищет своих героев — именно им предстоит столкнуться с древним злом и победить его с помощью друзей.',
  tagline: '— От судьбы не уйдешь.'
}, {
  value: 'cyberpunk_dream',
  emoji: '🤖',
  image: russianCyberpunkImage,
  title: 'Русский киберпанк',
  description: 'Будущее с панельками и летающими УАЗами наступило. Героям предстоит искать ответы на сложные вопросы в техногенном мире.',
  tagline: '— Следуй за белым роботом.'
}, {
  value: 'romantic_story',
  emoji: '💖',
  image: romanticStoryImage,
  title: 'Романтическая история',
  description: 'Пара отправляется в любовное приключение: любимые места, личные шутки и маленькие знаки помогают героям лучше понять друг друга.',
  tagline: '— И жили они долго и счастливо.'
}];

export const ILLUSTRATION_STYLES: Record<string, string> = {
  'photorealistic': 'photorealistic cinematic book illustration: realistic people, natural skin texture, true-to-life faces, accurate facial proportions, natural hair and fabric, believable hands and anatomy, 50mm lens depth, warm editorial lighting, print-ready composition; use uploaded photos as strong identity references when available; no cartoon, no painterly stylization, no plastic/toy look, no distorted anatomy.',
  'disney': 'hand-drawn storybook animation aesthetic: expressive faces, clean outlines, vivid yet balanced colors, cinematic lighting, gentle gradients, painterly backgrounds; harmonious composition and emotional warmth; strictly figurative, readable silhouettes; original characters; no broken anatomy; no collage/3D.',
  'toonflat': 'vintage TV-cartoon aesthetic: bold black outlines, flat warm colors, simple geometric forms, playful exaggerated expressions, soft yellowish skin tones optional; strictly figurative, clear character poses; original characters only; no broken anatomy; no collage/3D.',
  'minibrick': 'brick-miniature diorama style: visible studs and seams, glossy plastic material, simplified blocky anatomy (cylindrical head, curved hands), modular brick-built scenery; strictly figurative, readable poses; original characters; no printed logos or text; no photoreal humans.',
  'naive': 'naive folk painting: childlike proportions, flat perspective, bold simple shapes, decorative folk motifs; in the manner of early 20th-century primitivism; strictly figurative, readable silhouettes; original characters; no broken anatomy.',
  'watercolor': 'soft watercolor illustration: gentle washes, translucent pigment layers, visible paper grain, diffused light, wet-on-wet edges, subtle gradients; strictly figurative, readable silhouettes; original characters; no broken anatomy; no collage/3D.',
  'claymotion': 'clay stop-motion aesthetic: sculpted clay characters with visible texture, soft handmade look, warm lighting, slight surface imperfections, tactile realism; carefully staged poses, readable silhouettes; strictly figurative; original characters; no photorealism or 3D-rendered surfaces.',
  'yarncraft': 'fully hand-knitted textile world: characters and environment made only of yarn/felt/thread; human figures are knitted dolls with visible stitches and soft wool fuzz; embroidered facial features (eyebrows/eyelashes/mouth), button/felt-disc eyes; hair = twisted yarn strands; knitted clothing (rib/garter/stockinette); plush volumes, braided cords/rails; knitted snow and embroidered stars; warm window glow vs cold night; cozy fairy-tale diorama, shallow depth of field. strictly figurative, readable silhouettes, clear poses, original characters only. represent glass/water/fire as yarn/felt. no photorealism/CG sheen/3D/collage/plastic.',
  'celcinema': 'cinematic cel-animation aesthetic: expressive faces, clean color blocks with soft shading, painterly backgrounds, atmospheric warm light; strictly figurative (no manga panels or speech bubbles); original characters; no broken anatomy.'
};

const ILLUSTRATION_STYLE_LABELS: Record<string, string> = {
  'photorealistic': 'Фотореализм',
  'disney': 'Дисней',
  'toonflat': 'Мультяшный',
  'minibrick': 'Лего',
  'naive': 'Наивный',
  'watercolor': 'Акварель',
  'claymotion': 'Пластилин',
  'yarncraft': 'Вязаный',
  'celcinema': 'Аниме'
};

const STYLE_SPRITES: Record<string, string> = {
  'photorealistic': photorealismStyleImage,
  'disney': disneyStyleImage,
  'toonflat': toonflatStyleImage,
  'minibrick': minibrickStyleImage,
  'naive': naiveStyleImage,
  'watercolor': watercolorStyleImage,
  'claymotion': claymotionStyleImage,
  'yarncraft': yarncraftStyleImage,
  'celcinema': celcinemaStyleImage
};

const ILLUSTRATION_STYLE_KEYS = Object.keys(ILLUSTRATION_STYLES);

interface StylePicker8BitProps {
  value: string;
  onChange: (value: string) => void;
}

const StylePicker8Bit: React.FC<StylePicker8BitProps> = ({ value, onChange }) => {
  const currentIndex = ILLUSTRATION_STYLE_KEYS.indexOf(value);
  
  const handlePrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : ILLUSTRATION_STYLE_KEYS.length - 1;
    onChange(ILLUSTRATION_STYLE_KEYS[newIndex]);
  };
  
  const handleNext = () => {
    const newIndex = currentIndex < ILLUSTRATION_STYLE_KEYS.length - 1 ? currentIndex + 1 : 0;
    onChange(ILLUSTRATION_STYLE_KEYS[newIndex]);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrevious();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    }
  };
  
  return (
    <section className="style-picker-8bit" onKeyDown={handleKeyDown}>
      <div className="sp-controls">
        <button type="button" className="sp-arrow sp-arrow-prev" onClick={handlePrevious} aria-label="Previous style">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
          </svg>
        </button>

        <div className="sp-screen" tabIndex={0} role="img" aria-label={`Current style: ${ILLUSTRATION_STYLE_LABELS[value]}`}>
          <div className="sp-scanlines" aria-hidden="true"></div>
          <div className="sp-preview">
            <div className="sp-sprite" style={{ backgroundImage: `url("${STYLE_SPRITES[value]}")` }} aria-hidden="true"></div>
            <div className="sp-label" aria-live="polite">
              {ILLUSTRATION_STYLE_LABELS[value]}
            </div>
          </div>
        </div>

        <button type="button" className="sp-arrow sp-arrow-next" onClick={handleNext} aria-label="Next style">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
          </svg>
        </button>
      </div>
      <input type="hidden" name="illustration_style" id="styleValue" value={value} />
    </section>
  );
};

interface GenerationStatusPanelProps {
  title: string;
  jobStatus: JobStatus | null;
  fullTextStatus: string | null;
  renderStatus: string | null;
  previewPdfUrl: string;
  printPdfUrl: string;
  generationStartedAt: number | null;
}

const GENERATION_ETA_SECONDS = 150;

const formatGenerationTimer = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
};

const getGenerationStepIndex = (jobStatus: JobStatus | null, fullTextStatus: string | null, renderStatus: string | null) => {
  if (!jobStatus) return 0;
  const fullVisualsStatus = jobStatus.artifacts?.fullVisuals?.status || null;
  const coverStatus = jobStatus.artifacts?.cover?.status || null;
  if (renderStatus === 'ready') return 6;
  if (renderStatus === 'generating' || coverStatus === 'ready') return 5;
  if (coverStatus === 'generating' || fullVisualsStatus === 'ready') return 4;
  if (fullVisualsStatus === 'generating' || fullTextStatus === 'ready') return 3;
  if (fullTextStatus === 'generating') return 2;
  if (jobStatus.preview || jobStatus.status === 'chapter_1_ready') return 1;
  return 0;
};

const hasGenerationFailed = (jobStatus: JobStatus | null) => {
  if (!jobStatus) return false;
  return Boolean(
    jobStatus.status === 'failed'
    || jobStatus.error
    || jobStatus.artifacts?.fullText?.status === 'failed'
    || jobStatus.artifacts?.fullVisuals?.status === 'failed'
    || jobStatus.artifacts?.cover?.status === 'failed'
    || jobStatus.artifacts?.render?.status === 'failed'
  );
};

const GeneratedPdfPreview: React.FC<{ previewPdfUrl: string; printPdfUrl: string }> = ({
  previewPdfUrl,
  printPdfUrl,
}) => {
  const [isPdfLoaded, setIsPdfLoaded] = useState(false);
  const pdfUrl = previewPdfUrl || printPdfUrl;
  const printPaymentUrl = printPdfUrl || previewPdfUrl
    ? `${PRINT_PAYMENT_URL}?pdf=${encodeURIComponent(printPdfUrl || previewPdfUrl)}`
    : PRINT_PAYMENT_URL;

  useEffect(() => {
    setIsPdfLoaded(false);
  }, [pdfUrl]);

  return (
    <section className="generated-pdf-preview" aria-label="Предпросмотр готовой книги">
      <div className="generated-pdf-stage">
        <div className={`generated-pdf-frame ${isPdfLoaded ? 'generated-pdf-frame-loaded' : ''}`}>
          {!isPdfLoaded && (
            <div className="generated-pdf-loading" aria-live="polite">
              <div className="generated-pdf-loader-book" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <p>Открываем предпросмотр</p>
            </div>
          )}
          <iframe
            src={`${pdfUrl}#page=1&view=Fit`}
            title="PDF-предпросмотр книги"
            loading="lazy"
            onLoad={() => setIsPdfLoaded(true)}
          />
        </div>
      </div>

      <div className="generated-pdf-actions">
        <a href={printPaymentUrl} target="_blank" rel="noreferrer" className="generated-book-print-link generated-pdf-print-link">
          <Printer size={17} aria-hidden="true" />
          Оплатить и отправить в печать
        </a>
      </div>
    </section>
  );
};

const GenerationStatusPanel: React.FC<GenerationStatusPanelProps> = ({
  title,
  jobStatus,
  fullTextStatus,
  renderStatus,
  previewPdfUrl,
  printPdfUrl,
  generationStartedAt,
}) => {
  const [nowMs, setNowMs] = useState(Date.now());
  const fullVisuals = jobStatus?.artifacts?.fullVisuals || null;
  const jobCompleted = jobStatus?.status === 'done' || jobStatus?.stage === 'complete';
  const isReady = Boolean(previewPdfUrl || printPdfUrl) && (renderStatus === 'ready' || jobCompleted);
  const isFailed = hasGenerationFailed(jobStatus);
  const activeStepIndex = getGenerationStepIndex(jobStatus, fullTextStatus, renderStatus);

  useEffect(() => {
    if (isReady || isFailed) return;
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [isReady, isFailed]);

  const startedAt = generationStartedAt || nowMs;
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAt) / 1000));
  const remainingSeconds = Math.max(0, GENERATION_ETA_SECONDS - elapsedSeconds);
  const progressFromStage = [8, 20, 38, 58, 74, 88, 100][activeStepIndex] || 8;
  const progress = isReady ? 100 : Math.max(Math.min(jobStatus?.progress ?? progressFromStage, 98), progressFromStage);
  const titleText = title || jobStatus?.preview?.title || 'Ваша сказка';
  const statusLabel = isReady ? 'PDF готов' : isFailed ? 'Нужна проверка' : jobStatus?.message || 'Книга создается';
  const timerText = isReady ? 'готово' : remainingSeconds > 0 ? formatGenerationTimer(remainingSeconds) : 'финальная проверка';
  const fullVisualsDetail = fullVisuals?.total
    ? `Рисуем иллюстрации: ${fullVisuals.completed || 0} из ${fullVisuals.total}`
    : 'Рисуем иллюстрации и держим единый образ героев';

  const stepDetails = [
    'Принимаем анкету и фотографии героев',
    'Создаем жанр, завязку и визуальный канон',
    'Пишем главы 2-5 цельной историей',
    fullVisualsDetail,
    'Собираем обложку в печатный макет',
    'Верстаем PDF под требования типографии',
    'Финальная книга готова',
  ];
  const steps = ['Детали', 'Жанр и герои', 'Текст', 'Картинки', 'Обложка', 'PDF', 'Готово'];

  if (isReady) {
    return <GeneratedPdfPreview previewPdfUrl={previewPdfUrl} printPdfUrl={printPdfUrl} />;
  }

  return (
    <section className="generation-status-panel" aria-live="polite">
      <div className="generation-status-header">
        <div>
          <div className={`generated-book-status ${!isReady && !isFailed ? 'generated-book-status-active' : ''}`}>
            {statusLabel}
          </div>
          <h3>{isReady ? 'Книга готова' : titleText}</h3>
          <p>{isFailed ? 'Похоже, генерация оборвалась. Мы уже видим ошибку и сможем пересобрать книгу.' : stepDetails[activeStepIndex]}</p>
        </div>
        <div className="generation-status-timer" aria-label="Примерное время до готовности">
          <span>{timerText}</span>
          {!isReady && <small>примерно осталось</small>}
        </div>
      </div>

      <div className="generation-status-progress" aria-label="Прогресс создания книги">
        <div style={{ width: `${progress}%` }} />
      </div>

      <ol className="generation-status-steps">
        {steps.map((step, index) => {
          const done = isReady || index < activeStepIndex;
          const active = !isReady && index === activeStepIndex;
          return (
            <li
              key={step}
              className={[
                done ? 'generation-status-step-done' : '',
                active ? 'generation-status-step-active' : '',
                isFailed && active ? 'generation-status-step-failed' : '',
              ].filter(Boolean).join(' ')}
            >
              <span>{done ? <Check size={14} aria-hidden="true" /> : index + 1}</span>
              <strong>{step}</strong>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

interface StoryConstructorProps {
  showHeader?: boolean;
}

const StoryConstructor: React.FC<StoryConstructorProps> = ({ showHeader = true }) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [showLoader, setShowLoader] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);
  const [submittedStatusUrl, setSubmittedStatusUrl] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [generationStartedAt, setGenerationStartedAt] = useState<number | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    world: 'romantic_story',
    newyear_mode: false,
    location: '',
    artifact: '',
    length_target: 15000,
    chapters: 5,
    title_need: false,
    language: 'ru',
    email: '',
    illustration_style: 'photorealistic',
    illustration_style_prompt: ILLUSTRATION_STYLES['photorealistic'],
    hero1_name: '',
    hero1_desc: '',
    hero1_rel: '',
    hero1_age_group: '',
    hero1_photo: null,
    hero1_photo_url: '',
    hero2_name: '',
    hero2_desc: '',
    hero2_rel: '',
    hero2_age_group: '',
    hero2_photo: null,
    hero2_photo_url: '',
    hero3_name: '',
    hero3_desc: '',
    hero3_rel: '',
    hero3_age_group: '',
    hero3_photo: null,
    hero3_photo_url: '',
    hero4_name: '',
    hero4_desc: '',
    hero4_rel: '',
    hero4_age_group: '',
    hero4_photo: null,
    hero4_photo_url: ''
  });

  useEffect(() => {
    if (!submittedJobId) {
      return;
    }

    let cancelled = false;
    const statusUrl = submittedStatusUrl || `${STATUS_ENDPOINT_BASE_URL}/${submittedJobId}`;

    const loadStatus = async () => {
      try {
        const response = await fetch(statusUrl, { cache: 'no-store' });
        if (!response.ok) {
          return;
        }
        const status = await response.json() as JobStatus;
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

  const [heroSections, setHeroSections] = useState({
    hero2: true,
    hero3: false,
    hero4: false
  });
  
  const [heroExpanded, setHeroExpanded] = useState({
    hero3: false,
    hero4: false
  });

  const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  const validateEmail = (email: string) => EMAIL_RX.test(email);
  const fullTextStatus = jobStatus?.artifacts?.fullText?.status || null;
  const renderStatus = jobStatus?.artifacts?.render?.status || null;
  const previewPdfUrl = jobStatus?.artifacts?.previewPdf?.url
    || jobStatus?.artifacts?.render?.files?.preview?.url
    || '';
  const printPdfUrl = jobStatus?.artifacts?.bookPdf?.url
    || jobStatus?.artifacts?.render?.files?.book?.url
    || '';
  const bookPdfUrl = previewPdfUrl || printPdfUrl;
  const readerTitle = jobStatus?.preview?.title
    || 'Ваша сказка';
  const jobCompleted = jobStatus?.status === 'done' || jobStatus?.stage === 'complete';
  const hasReadyPdfPreview = Boolean(bookPdfUrl) && (renderStatus === 'ready' || jobCompleted);
  const heroHasContent = (heroNum: 1 | 2 | 3 | 4) => {
    const name = formData[`hero${heroNum}_name` as keyof FormData] as string;
    const desc = formData[`hero${heroNum}_desc` as keyof FormData] as string;
    const photo = formData[`hero${heroNum}_photo` as keyof FormData] as File | null;
    return Boolean(name.trim() || desc.trim() || photo);
  };
  const renderAgeGroupControl = (heroNum: 1 | 2 | 3 | 4) => {
    const key = `hero${heroNum}_age_group` as keyof FormData;
    const value = formData[key] as HeroAgeGroup;

    return (
      <div>
        <label className="mixer-control-label block mb-2">Возрастная группа</label>
        <div className="hero-age-segmented" role="radiogroup" aria-label={`Возрастная группа героя ${heroNum}`}>
          {HERO_AGE_GROUPS.map(option => (
            <button
              key={option.value}
              type="button"
              className={`hero-age-option ${value === option.value ? 'active' : ''}`}
              role="radio"
              aria-checked={value === option.value}
              onClick={() => setFormData(prev => ({ ...prev, [key]: option.value }))}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const showSuccessScreen = () => {
    setShowSuccessOverlay(true);
  };

  const handleSubmit = async () => {
    if (!consentChecked) {
      toast({
        variant: "destructive",
        title: "Требуется согласие",
        description: "Пожалуйста, подтвердите согласие на обработку персональных данных"
      });
      return;
    }

    if (!validateEmail(formData.email)) {
      toast({
        variant: "destructive",
        title: "Ошибка валидации",
        description: "Введите корректный email"
      });
      return;
    }

    if (!formData.world || formData.length_target <= 0 || formData.chapters <= 0) {
      toast({
        variant: "destructive",
        title: "Ошибка валидации",
        description: "Пожалуйста, заполните все обязательные поля."
      });
      return;
    }

    const activeHeroNumbers: Array<1 | 2 | 3 | 4> = [
      1,
      ...(heroSections.hero2 ? [2 as const] : []),
      ...(heroSections.hero3 ? [3 as const] : []),
      ...(heroSections.hero4 ? [4 as const] : []),
    ];
    const missingAgeHero = activeHeroNumbers.find(heroNum => {
      const ageGroup = formData[`hero${heroNum}_age_group` as keyof FormData] as HeroAgeGroup;
      return heroHasContent(heroNum) && !ageGroup;
    });
    if (missingAgeHero) {
      toast({
        variant: "destructive",
        title: "Возраст героя",
        description: `Выберите возрастную группу для героя ${missingAgeHero}.`
      });
      setCurrentStep(2);
      return;
    }

    setShowLoader(true);
    setShowSuccessOverlay(true);
    setSubmittedJobId(null);
    setSubmittedStatusUrl(null);
    setJobStatus(null);
    setGenerationStartedAt(Date.now());

    const multipartData = new FormData();
    multipartData.append('world', formData.world);
    multipartData.append('newyear_mode', formData.newyear_mode.toString());
    multipartData.append('location', formData.location);
    multipartData.append('artifact', formData.artifact);
    multipartData.append('length_target', formData.length_target.toString());
    multipartData.append('chapters', formData.chapters.toString());
    multipartData.append('title_need', formData.title_need.toString());
    multipartData.append('language', formData.language);
    multipartData.append('email', formData.email.toLowerCase());
    multipartData.append('illustration_style', formData.illustration_style);
    multipartData.append('illustration_style_prompt', formData.illustration_style_prompt);

    multipartData.append('hero1_name', formData.hero1_name);
    multipartData.append('hero1_desc', formData.hero1_desc);
    multipartData.append('hero1_rel', formData.hero1_rel);
    multipartData.append('hero1_age_group', formData.hero1_age_group);
    if (formData.hero1_photo) {
      multipartData.append('hero1_photo', formData.hero1_photo);
      multipartData.append('hero1_photo_name', formData.hero1_photo.name);
      multipartData.append('hero1_photo_mime', formData.hero1_photo.type);
    }

    if (heroSections.hero2) {
      multipartData.append('hero2_name', formData.hero2_name);
      multipartData.append('hero2_desc', formData.hero2_desc);
      multipartData.append('hero2_rel', formData.hero2_rel);
      multipartData.append('hero2_age_group', formData.hero2_age_group);
      if (formData.hero2_photo) {
        multipartData.append('hero2_photo', formData.hero2_photo);
        multipartData.append('hero2_photo_name', formData.hero2_photo.name);
        multipartData.append('hero2_photo_mime', formData.hero2_photo.type);
      }
    }

    if (heroSections.hero3) {
      multipartData.append('hero3_name', formData.hero3_name);
      multipartData.append('hero3_desc', formData.hero3_desc);
      multipartData.append('hero3_rel', formData.hero3_rel);
      multipartData.append('hero3_age_group', formData.hero3_age_group);
      if (formData.hero3_photo) {
        multipartData.append('hero3_photo', formData.hero3_photo);
        multipartData.append('hero3_photo_name', formData.hero3_photo.name);
        multipartData.append('hero3_photo_mime', formData.hero3_photo.type);
      }
    }

    if (heroSections.hero4) {
      multipartData.append('hero4_name', formData.hero4_name);
      multipartData.append('hero4_desc', formData.hero4_desc);
      multipartData.append('hero4_rel', formData.hero4_rel);
      multipartData.append('hero4_age_group', formData.hero4_age_group);
      if (formData.hero4_photo) {
        multipartData.append('hero4_photo', formData.hero4_photo);
        multipartData.append('hero4_photo_name', formData.hero4_photo.name);
        multipartData.append('hero4_photo_mime', formData.hero4_photo.type);
      }
    }

    let ok = false;
    let createResult: CreateResponse | null = null;
    try {
      const response = await fetch(CREATE_ENDPOINT_URL, {
        method: 'POST',
        body: multipartData
      });
      ok = response.ok;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        createResult = await response.json() as CreateResponse;
      }
    } catch (error) {
      ok = false;
    }

    toast({
      title: ok ? "Начали создавать книгу" : "Не получилось отправить форму",
      description: ok ? "Запустили полный цикл: текст, картинки, обложка и печатный PDF." : "Проверьте данные и попробуйте ещё раз."
    });
    
    setShowLoader(false);
    if (ok) {
      setSubmittedJobId(createResult?.jobId || null);
      setSubmittedStatusUrl(createResult?.statusUrl || null);
      setJobStatus(null);
      showSuccessScreen();
    } else {
      setShowSuccessOverlay(false);
      setGenerationStartedAt(null);
    }
  };

  const resetForm = () => {
    setFormData({
      world: 'romantic_story',
      newyear_mode: false,
      location: '',
      artifact: '',
      length_target: 15000,
      chapters: 5,
      title_need: false,
      language: 'ru',
      email: '',
      illustration_style: 'photorealistic',
      illustration_style_prompt: ILLUSTRATION_STYLES['photorealistic'],
      hero1_name: '',
      hero1_desc: '',
      hero1_rel: '',
      hero1_age_group: '',
      hero1_photo: null,
      hero1_photo_url: '',
      hero2_name: '',
      hero2_desc: '',
      hero2_rel: '',
      hero2_age_group: '',
      hero2_photo: null,
      hero2_photo_url: '',
      hero3_name: '',
      hero3_desc: '',
      hero3_rel: '',
      hero3_age_group: '',
      hero3_photo: null,
      hero3_photo_url: '',
      hero4_name: '',
      hero4_desc: '',
      hero4_rel: '',
      hero4_age_group: '',
      hero4_photo: null,
      hero4_photo_url: ''
    });
    setHeroSections({ hero2: true, hero3: false, hero4: false });
    setHeroExpanded({ hero3: false, hero4: false });
    setCurrentStep(1);
    setConsentChecked(false);
    setSubmittedJobId(null);
    setSubmittedStatusUrl(null);
    setJobStatus(null);
  };

  return (
    <div className="max-w-6xl mx-auto mixer-chassis">
      {showHeader && (
        <div className="text-center mb-8 mixer-panel constellation-header cursor-pointer" onClick={resetForm}>
          <div className="hero-constellations" aria-hidden="true">
            <svg className="constellation-svg-hero" viewBox="0 0 800 200" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <mask id="textMask">
                  <rect width="100%" height="100%" fill="white" />
                  <rect x="180" y="60" width="440" height="80" rx="12" fill="black" />
                </mask>
              </defs>
              <g mask="url(#textMask)">
                <g className="constellation-group upper-left">
                  <circle cx="40" cy="25" r="4.5" className="star-hero bright" />
                  <circle cx="85" cy="35" r="3.8" className="star-hero" />
                  <circle cx="120" cy="20" r="4.2" className="star-hero bright" />
                  <circle cx="160" cy="40" r="3.5" className="star-hero" />
                  <circle cx="75" cy="55" r="3.2" className="star-hero" />
                  <circle cx="45" cy="50" r="4.0" className="star-hero" />
                  <circle cx="110" cy="45" r="3.6" className="star-hero" />
                  <path d="M40,25 L85,35 L120,20 L160,40 M85,35 L110,45 L75,55 L45,50 L40,25" className="constellation-line-hero" />
                </g>
                <g className="constellation-group upper-right">
                  <circle cx="650" cy="30" r="4.3" className="star-hero bright" />
                  <circle cx="690" cy="20" r="3.7" className="star-hero" />
                  <circle cx="720" cy="35" r="4.1" className="star-hero bright" />
                  <circle cx="750" cy="25" r="3.4" className="star-hero" />
                  <circle cx="780" cy="40" r="3.9" className="star-hero" />
                  <circle cx="670" cy="50" r="3.2" className="star-hero" />
                  <path d="M650,30 L690,20 L720,35 L750,25 L780,40 M690,20 L670,50" className="constellation-line-hero" />
                </g>
                <g className="constellation-group lower-left">
                  <circle cx="60" cy="160" r="4.4" className="star-hero bright" />
                  <circle cx="90" cy="175" r="3.6" className="star-hero" />
                  <circle cx="120" cy="165" r="4.0" className="star-hero" />
                  <circle cx="80" cy="185" r="3.3" className="star-hero" />
                  <circle cx="100" cy="195" r="3.8" className="star-hero" />
                  <circle cx="30" cy="180" r="3.5" className="star-hero" />
                  <circle cx="50" cy="190" r="4.2" className="star-hero bright" />
                  <path d="M60,160 L90,175 L120,165 M80,185 L100,195 L50,190 M30,180 L60,160 M90,175 L80,185" className="constellation-line-hero" />
                </g>
                <g className="constellation-group lower-right">
                  <circle cx="680" cy="170" r="4.1" className="star-hero bright" />
                  <circle cx="720" cy="180" r="3.7" className="star-hero" />
                  <circle cx="750" cy="165" r="3.9" className="star-hero" />
                  <circle cx="740" cy="190" r="3.4" className="star-hero" />
                  <circle cx="770" cy="185" r="4.0" className="star-hero" />
                  <circle cx="700" cy="195" r="3.6" className="star-hero" />
                  <path d="M680,170 L720,180 L750,165 M720,180 L740,190 L770,185 M720,180 L700,195" className="constellation-line-hero" />
                </g>
                <g className="scattered-stars">
                  <circle cx="200" cy="35" r="2.8" className="star-hero dim" />
                  <circle cx="280" cy="25" r="3.2" className="star-hero dim" />
                  <circle cx="350" cy="40" r="2.5" className="star-hero dim" />
                  <circle cx="420" cy="30" r="3.0" className="star-hero dim" />
                  <circle cx="520" cy="35" r="2.7" className="star-hero dim" />
                  <circle cx="580" cy="25" r="3.1" className="star-hero dim" />
                  <circle cx="150" cy="180" r="2.9" className="star-hero dim" />
                  <circle cx="220" cy="190" r="2.6" className="star-hero dim" />
                  <circle cx="300" cy="175" r="3.0" className="star-hero dim" />
                  <circle cx="380" cy="185" r="2.8" className="star-hero dim" />
                  <circle cx="450" cy="170" r="3.2" className="star-hero dim" />
                  <circle cx="520" cy="180" r="2.7" className="star-hero dim" />
                  <circle cx="590" cy="190" r="2.9" className="star-hero dim" />
                </g>
                <g className="milky-way">
                  <circle cx="380" cy="50" r="1.8" className="star-hero tiny" />
                  <circle cx="390" cy="55" r="1.5" className="star-hero tiny" />
                  <circle cx="400" cy="52" r="1.6" className="star-hero tiny" />
                  <circle cx="410" cy="48" r="1.4" className="star-hero tiny" />
                  <circle cx="420" cy="53" r="1.7" className="star-hero tiny" />
                  <circle cx="370" cy="155" r="1.6" className="star-hero tiny" />
                  <circle cx="385" cy="160" r="1.5" className="star-hero tiny" />
                  <circle cx="395" cy="158" r="1.7" className="star-hero tiny" />
                  <circle cx="405" cy="162" r="1.4" className="star-hero tiny" />
                  <circle cx="415" cy="157" r="1.6" className="star-hero tiny" />
                </g>
              </g>
            </svg>
          </div>

          <div className="hero-title-wrapper mb-4">
            <Link to="/" className="block">
              <h1 className="hero-title font-bold mixer-nameplate cursor-pointer hover:opacity-80 transition-opacity">
                <span className="hero-title__text">Конструктор сказок</span>
                <span className="hero-title__glow" aria-hidden="true">Конструктор сказок</span>
                <span className="cursor-blink">|</span>
              </h1>
            </Link>
          </div>
        </div>
      )}

      {/* Step Indicator */}
      <div className="flex justify-center gap-3 mb-8">
        {[1, 2, 3].map((step) => (
          <button
            key={step}
            onClick={() => setCurrentStep(step)}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all cursor-pointer ${
              currentStep === step
                ? 'bg-accent text-accent-foreground scale-110'
                : 'bg-accent/50 text-accent-foreground hover:bg-accent/70'
            }`}
          >
            {step}
          </button>
        ))}
      </div>

      {/* STEP 1: World, Location, Artifact */}
      {currentStep === 1 && (
        <div className="animate-fade-in">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column - World Selection */}
            <div className="space-y-8">
              <div className="mixer-control-section">
                <label className="mixer-control-label relative">
                  Выбери свой мир
                  <span className="hero-infinity-symbol" aria-hidden="true">∞</span>
                </label>
                <p className="mixer-hint mb-4">
                  Каждый мир — это своя атмосфера, законы и настроение. 
                  От выбора зависит, какой получится сказка: лёгкая, философская, приключенческая или кибер-сон.
                </p>
                
                <div className="world-carousel-wrapper">
                  <button type="button" className="world-carousel-arrow world-carousel-arrow-prev" onClick={() => {
                    const currentIndex = WORLDS.findIndex(w => w.value === formData.world);
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : WORLDS.length - 1;
                    setFormData(prev => ({ ...prev, world: WORLDS[prevIndex].value }));
                  }} aria-label="Предыдущий мир">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>

                  <button type="button" className="world-carousel-arrow world-carousel-arrow-next" onClick={() => {
                    const currentIndex = WORLDS.findIndex(w => w.value === formData.world);
                    const nextIndex = currentIndex < WORLDS.length - 1 ? currentIndex + 1 : 0;
                    setFormData(prev => ({ ...prev, world: WORLDS[nextIndex].value }));
                  }} aria-label="Следующий мир">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>

                  <div className="world-carousel-track" style={{ justifyContent: 'center' }}>
                    {WORLDS.filter(world => world.value === formData.world).map(world => (
                      <button
                        key={world.value}
                        type="button"
                        className="world-card world-card-active"
                        onClick={() => {}}
                        style={{ flex: 'none' }}
                      >
                        <div className="world-card-content">
                          <div className="world-card-header">
                            {world.image ? (
                              <img src={world.image} alt={world.title} className="world-card-emoji" style={{ width: '3rem', height: '3rem', objectFit: 'contain' }} />
                            ) : (
                              <span className="world-card-emoji">{world.emoji}</span>
                            )}
                            <h4 className="world-card-title">{world.title}</h4>
                          </div>
                          <p className="world-card-description">{world.description}</p>
                          <p className="world-card-tagline">{world.tagline}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="world-carousel-dots">
                    {WORLDS.map((world) => (
                      <button
                        key={world.value}
                        type="button"
                        className={`world-carousel-dot ${formData.world === world.value ? 'active' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, world: world.value }))}
                        aria-label={world.title}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Location & Artifact */}
            <div className="space-y-8">
              <div className="mixer-control-section">
                <div className="space-y-4">
                  <div>
                    <label className="mixer-control-label">Место действия</label>
                    <input
                      type="text"
                      className="mixer-input"
                      value={formData.location}
                      onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Мехико или Заколдованный лес..."
                    />
                  </div>
                  <div>
                    <label className="mixer-control-label">Артефакт</label>
                    <input
                      type="text"
                      className="mixer-input"
                      value={formData.artifact}
                      onChange={e => setFormData(prev => ({ ...prev, artifact: e.target.value }))}
                      placeholder="личный предмет или знакомое событие..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <div className="mt-12 text-center">
            <button
              className="mixer-main-button text-xl px-10 py-5"
              onClick={() => setCurrentStep(2)}
            >
              Продолжить →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Characters */}
      {currentStep === 2 && (
        <div className="animate-fade-in">
          <h3 className="mixer-section-title text-center mb-6">Персонажи</h3>
          
          {/* Hero 1 and Hero 2 - Left and Right columns */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column - Hero 1 (Main Hero) */}
            <div className="mixer-control-section">
              <h4 className="mixer-control-label mb-4">Главный герой</h4>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Имя"
                  className="mixer-input"
                  value={formData.hero1_name}
                  onChange={e => setFormData(prev => ({ ...prev, hero1_name: e.target.value }))}
                />

                {renderAgeGroupControl(1)}
                
                <div>
                  <label className="mixer-control-label block mb-2">Описание героя</label>
                  <textarea
                    rows={4}
                    minLength={60}
                    maxLength={600}
                    placeholder="2–4 фразы: кто это, заметная деталь/предмет, маленькая цель или особенность поведения."
                    className="mixer-input resize-none"
                    value={formData.hero1_desc}
                    onChange={e => setFormData(prev => ({ ...prev, hero1_desc: e.target.value }))}
                  />
                </div>
                
                {/* Photo Upload for Hero 1 */}
                <div>
                  <label className="mixer-control-label block mb-2">Фото героя</label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    className="hidden"
                    id="hero1-photo-input"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
                        toast({ variant: "destructive", title: "Неверный формат", description: "Допустимы JPG/PNG до 3 МБ" });
                        return;
                      }
                      if (file.size > 3 * 1024 * 1024) {
                        toast({ variant: "destructive", title: "Файл слишком большой", description: "Допустимы JPG/PNG до 3 МБ" });
                        return;
                      }
                      setFormData(prev => ({ ...prev, hero1_photo: file, hero1_photo_url: URL.createObjectURL(file) }));
                    }}
                  />
                  <button
                    type="button"
                    className="mixer-input cursor-pointer hover:bg-accent/10 transition-colors"
                    onClick={() => document.getElementById('hero1-photo-input')?.click()}
                  >
                    Загрузить фото
                  </button>
                  <p className="mixer-hint mt-1">Добавьте портретное фото, где хорошо видно лицо.</p>
                  
                  {formData.hero1_photo_url && (
                    <div className="mt-3 relative inline-block">
                      <img src={formData.hero1_photo_url} alt="Превью героя 1" className="w-32 h-32 object-cover rounded-md border-2 border-accent" />
                      <button
                        type="button"
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center hover:bg-destructive/90"
                        onClick={() => setFormData(prev => ({ ...prev, hero1_photo: null, hero1_photo_url: '' }))}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Hero 2 */}
            <div className="mixer-control-section">
              <div className="flex items-center justify-between mb-4">
                <h4 className="mixer-control-label">Герой 2</h4>
                <div
                  className={`mixer-toggle ${heroSections.hero2 ? 'active' : ''}`}
                  onClick={() => setHeroSections(prev => ({ ...prev, hero2: !prev.hero2 }))}
                >
                  <div className="mixer-toggle-handle" />
                </div>
              </div>
              
              {heroSections.hero2 ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Имя"
                    className="mixer-input"
                    value={formData.hero2_name}
                    onChange={e => setFormData(prev => ({ ...prev, hero2_name: e.target.value }))}
                  />

                  {renderAgeGroupControl(2)}
                  
                  <div>
                    <label className="mixer-control-label block mb-2">Описание героя</label>
                    <textarea
                      rows={4}
                      minLength={60}
                      maxLength={600}
                      placeholder="2–4 фразы: кто это, заметная деталь/предмет, маленькая цель или особенность поведения."
                      className="mixer-input resize-none"
                      value={formData.hero2_desc}
                      onChange={e => setFormData(prev => ({ ...prev, hero2_desc: e.target.value }))}
                    />
                  </div>
                  
                  {/* Photo Upload for Hero 2 */}
                  <div>
                    <label className="mixer-control-label block mb-2">Фото героя</label>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      className="hidden"
                      id="hero2-photo-input"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
                          toast({ variant: "destructive", title: "Неверный формат", description: "Допустимы JPG/PNG до 3 МБ" });
                          return;
                        }
                        if (file.size > 3 * 1024 * 1024) {
                          toast({ variant: "destructive", title: "Файл слишком большой", description: "Допустимы JPG/PNG до 3 МБ" });
                          return;
                        }
                        setFormData(prev => ({ ...prev, hero2_photo: file, hero2_photo_url: URL.createObjectURL(file) }));
                      }}
                    />
                    <button
                      type="button"
                      className="mixer-input cursor-pointer hover:bg-accent/10 transition-colors"
                      onClick={() => document.getElementById('hero2-photo-input')?.click()}
                    >
                      Загрузить фото
                    </button>
                    <p className="mixer-hint mt-1">Добавьте портретное фото, где хорошо видно лицо.</p>
                    
                    {formData.hero2_photo_url && (
                      <div className="mt-3 relative inline-block">
                        <img src={formData.hero2_photo_url} alt="Превью героя 2" className="w-32 h-32 object-cover rounded-md border-2 border-accent" />
                        <button
                          type="button"
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center hover:bg-destructive/90"
                          onClick={() => setFormData(prev => ({ ...prev, hero2_photo: null, hero2_photo_url: '' }))}
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mixer-hint">Включите переключатель, чтобы добавить второго героя</p>
              )}
            </div>
          </div>

          {/* Heroes 3 and 4 - Collapsible dropdowns with toggles */}
          <div className="mt-8 space-y-4">
            {[3, 4].map(heroNum => {
              const heroKey = `hero${heroNum}` as keyof typeof heroSections;
              const expandedKey = `hero${heroNum}` as keyof typeof heroExpanded;
              const isEnabled = heroSections[heroKey];
              
              return (
                <div key={heroNum} className="mixer-control-section">
                  <div className="flex items-center justify-between p-4">
                    <h4 className="mixer-control-label">Герой {heroNum}</h4>
                    <div
                      className={`mixer-toggle ${isEnabled ? 'active' : ''}`}
                      onClick={() => {
                        setHeroSections(prev => ({ ...prev, [heroKey]: !prev[heroKey] }));
                        setHeroExpanded(prev => ({ ...prev, [expandedKey]: !prev[expandedKey] }));
                      }}
                    >
                      <div className="mixer-toggle-handle" />
                    </div>
                  </div>
                  
                  {isEnabled && (
                    <div className="px-4 pb-4 space-y-4 animate-fade-in">
                      <input
                        type="text"
                        placeholder="Имя"
                        className="mixer-input"
                        value={formData[`hero${heroNum}_name` as keyof FormData] as string}
                        onChange={e => setFormData(prev => ({ ...prev, [`hero${heroNum}_name`]: e.target.value }))}
                      />

                      {renderAgeGroupControl(heroNum as 3 | 4)}
                      
                      <div>
                        <label className="mixer-control-label block mb-2">Описание героя</label>
                        <textarea
                          rows={4}
                          minLength={60}
                          maxLength={600}
                          placeholder="2–4 фразы: кто это, заметная деталь/предмет, маленькая цель или особенность поведения."
                          className="mixer-input resize-none"
                          value={formData[`hero${heroNum}_desc` as keyof FormData] as string}
                          onChange={e => setFormData(prev => ({ ...prev, [`hero${heroNum}_desc`]: e.target.value }))}
                        />
                      </div>
                      
                      {/* Photo Upload */}
                      <div>
                        <label className="mixer-control-label block mb-2">Фото героя {heroNum}</label>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png"
                          className="hidden"
                          id={`hero${heroNum}-photo-input`}
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
                              toast({ variant: "destructive", title: "Неверный формат", description: "Допустимы JPG/PNG до 3 МБ" });
                              return;
                            }
                            if (file.size > 3 * 1024 * 1024) {
                              toast({ variant: "destructive", title: "Файл слишком большой", description: "Допустимы JPG/PNG до 3 МБ" });
                              return;
                            }
                            setFormData(prev => ({
                              ...prev,
                              [`hero${heroNum}_photo`]: file,
                              [`hero${heroNum}_photo_url`]: URL.createObjectURL(file)
                            }));
                          }}
                        />
                        <button
                          type="button"
                          className="mixer-input cursor-pointer hover:bg-accent/10 transition-colors"
                          onClick={() => document.getElementById(`hero${heroNum}-photo-input`)?.click()}
                        >
                          Загрузить фото
                        </button>
                        <p className="mixer-hint mt-1">Добавьте портретное фото, где хорошо видно лицо.</p>
                        
                        {formData[`hero${heroNum}_photo_url` as keyof FormData] && (
                          <div className="mt-3 relative inline-block">
                            <img
                              src={formData[`hero${heroNum}_photo_url` as keyof FormData] as string}
                              alt={`Превью героя ${heroNum}`}
                              className="w-32 h-32 object-cover rounded-md border-2 border-accent"
                            />
                            <button
                              type="button"
                              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center hover:bg-destructive/90"
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                [`hero${heroNum}_photo`]: null,
                                [`hero${heroNum}_photo_url`]: ''
                              }))}
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Navigation Button */}
          <div className="mt-12 flex justify-center">
            <button
              className="mixer-main-button text-xl px-10 py-5"
              onClick={() => setCurrentStep(3)}
            >
              Почти готово →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Style, Email, Consent */}
      {currentStep === 3 && (
        <div className="animate-fade-in">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column - Style Picker */}
            <div className="mixer-control-section">
              <label className="mixer-control-label">Стиль иллюстрации</label>
              <StylePicker8Bit
                value={formData.illustration_style}
                onChange={value => setFormData(prev => ({
                  ...prev,
                  illustration_style: value,
                  illustration_style_prompt: ILLUSTRATION_STYLES[value]
                }))}
              />
            </div>

            {/* Right Column - Email & Consent */}
            <div className="mixer-control-section h-fit">
              <label className="mixer-control-label">Почта (обязательно)</label>
              <input
                type="email"
                className={`mixer-input ${formData.email && !validateEmail(formData.email) ? 'mixer-input-error' : ''}`}
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="name@example.com"
                autoComplete="email"
                required
              />
              <p className="mixer-hint">Печатный PDF и полная версия будут доступны здесь и по ссылке.</p>

              {/* Consent Checkbox */}
              <div className="flex items-start gap-3 mt-4">
                <input
                  type="checkbox"
                  id="consent-checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-1 w-5 h-5 accent-accent cursor-pointer"
                  required
                />
                <label htmlFor="consent-checkbox" className="text-sm text-accent cursor-pointer leading-tight">
                  Согласие на обработку персональных данных
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-12 flex justify-center">
            <button
              className="mixer-main-button text-2xl px-12 py-6"
              onClick={handleSubmit}
              disabled={showLoader}
            >
              {showLoader ? 'Отправка...' : 'Создать сказку'}
            </button>
          </div>
          
          <p className="mixer-subtitle text-center mt-6">
            Книга соберется целиком: текст, иллюстрации, обложка и печатный PDF.
          </p>
        </div>
      )}

      {/* Success Overlay */}
      {showSuccessOverlay && (
        <div className="generated-preview-backdrop">
          <div
            className={`generated-preview-dialog generated-preview-dialog-status ${hasReadyPdfPreview ? 'generated-preview-dialog-pdf' : ''}`}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="generated-preview-close"
              onClick={() => setShowSuccessOverlay(false)}
              aria-label="Закрыть окно создания книги"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <GenerationStatusPanel
              title={readerTitle}
              jobStatus={jobStatus}
              fullTextStatus={fullTextStatus}
              renderStatus={renderStatus}
              previewPdfUrl={previewPdfUrl}
              printPdfUrl={printPdfUrl}
              generationStartedAt={generationStartedAt}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryConstructor;
