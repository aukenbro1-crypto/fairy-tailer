import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
import santaNewyearImage from '@/assets/santa-newyear.png';
import wizardFantasyImage from '@/assets/wizard-fantasy.png';
import cyberpunkCharacterImage from '@/assets/cyberpunk-character.png';
import romanticStoryImage from '@/assets/romantic-story.png';

// Constants from requirements
const WEBHOOK_URL = "https://hook.eu2.make.com/c9pm5jrx6t7ki3ir3qq1e7822cai2bz9";

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
  // Heroes 1-4
  hero1_name: string;
  hero1_desc: string;
  hero1_rel: string;
  hero1_photo: File | null;
  hero1_photo_url: string;
  hero2_name: string;
  hero2_desc: string;
  hero2_rel: string;
  hero2_photo: File | null;
  hero2_photo_url: string;
  hero3_name: string;
  hero3_desc: string;
  hero3_rel: string;
  hero3_photo: File | null;
  hero3_photo_url: string;
  hero4_name: string;
  hero4_desc: string;
  hero4_rel: string;
  hero4_photo: File | null;
  hero4_photo_url: string;
}

// World options
const WORLDS = [{
  value: 'adventure_classic',
  emoji: '🦜',
  image: dragonAdventureImage,
  title: 'Приключения',
  description: 'Мир открытий, где герои идут навстречу новым возможностям.',
  tagline: '— Лови момент!'
}, {
  value: 'new_year',
  emoji: '🎅🏻',
  image: santaNewyearImage,
  title: 'Новогодняя сказка',
  description: 'Увлекательное приключение, где героям предстоит спасти праздник.',
  tagline: '— Счастливого Нового года!'
}, {
  value: 'fantasy_epic',
  emoji: '🧙🏻‍♂️',
  image: wizardFantasyImage,
  title: 'Фэнтези',
  description: 'Древние миры, тайны и борьба со злом.',
  tagline: '— От судьбы не уйдешь.'
}, {
  value: 'cyberpunk_dream',
  emoji: '👩‍🎤',
  image: cyberpunkCharacterImage,
  title: 'Киберпанк',
  description: 'Неоновые вывески и одиночество в Сети.',
  tagline: '— Следуй за белым кроликом.'
}, {
  value: 'disney_light',
  emoji: '💖',
  image: romanticStoryImage,
  title: 'Романтическая история',
  description: 'Доброжелательный мир, где герои влюбляются друг в друга.',
  tagline: '— И жили они долго и счастливо.'
}];

const ILLUSTRATION_STYLES: Record<string, string> = {
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
  'disney': 'disney',
  'toonflat': 'toonflat',
  'minibrick': 'minibrick',
  'naive': 'naive',
  'watercolor': 'watercolor',
  'claymotion': 'claymotion',
  'yarncraft': 'yarncraft',
  'celcinema': 'celcinema'
};

const STYLE_SPRITES: Record<string, string> = {
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

// 8-bit Style Picker Component
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

// Hero Card Component with auto-expanding textarea
interface HeroCardProps {
  heroNum: number;
  isMain?: boolean;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  showRelations?: boolean;
  toast: ReturnType<typeof useToast>['toast'];
}

const HeroCard: React.FC<HeroCardProps> = ({ heroNum, isMain, formData, setFormData, showRelations, toast }) => {
  const nameKey = `hero${heroNum}_name` as keyof FormData;
  const descKey = `hero${heroNum}_desc` as keyof FormData;
  const relKey = `hero${heroNum}_rel` as keyof FormData;
  const photoKey = `hero${heroNum}_photo` as keyof FormData;
  const photoUrlKey = `hero${heroNum}_photo_url` as keyof FormData;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Неверный формат",
        description: "Допустимы JPG/PNG до 3 МБ"
      });
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Файл слишком большой",
        description: "Допустимы JPG/PNG до 3 МБ"
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      [photoKey]: file,
      [photoUrlKey]: URL.createObjectURL(file)
    }));
  };

  // Auto-expand textarea
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
  };

  return (
    <div className="mixer-hero-panel">
      <h4 className="mixer-hero-title">{isMain ? 'Главный герой' : `Герой ${heroNum}`}</h4>
      <div className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="Имя *"
            className="mixer-input"
            value={formData[nameKey] as string}
            onChange={e => setFormData(prev => ({ ...prev, [nameKey]: e.target.value }))}
          />
          {isMain && <p className="mixer-hint mt-1 text-xs opacity-70">Обязательное поле</p>}
        </div>
        
        <div>
          <label className="mixer-control-label block mb-2">Описание героя</label>
          <textarea
            rows={2}
            maxLength={600}
            placeholder="Пара фраз: кто это, заметная деталь..."
            className="mixer-input resize-none auto-expand-textarea"
            value={formData[descKey] as string}
            onChange={e => {
              setFormData(prev => ({ ...prev, [descKey]: e.target.value }));
              handleTextareaInput(e);
            }}
          />
          <p className="mixer-hint mt-1 text-xs opacity-70">1–2 фразы. Можно пропустить.</p>
        </div>
        
        {/* Show relations only for heroes 2+ when they are enabled */}
        {showRelations && (
          <div>
            <label className="mixer-control-label block mb-2">Отношения</label>
            <textarea
              rows={2}
              maxLength={300}
              placeholder="Например, Маша встречается с Олегом..."
              className="mixer-input resize-none auto-expand-textarea"
              value={formData[relKey] as string}
              onChange={e => {
                setFormData(prev => ({ ...prev, [relKey]: e.target.value }));
                handleTextareaInput(e);
              }}
            />
          </div>
        )}
        
        {/* Photo upload */}
        <div>
          <label className="mixer-control-label block mb-2">Фото героя</label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png"
            className="hidden"
            id={`hero${heroNum}-photo-input`}
            onChange={handlePhotoChange}
          />
          <button
            type="button"
            className="mixer-input cursor-pointer hover:bg-accent/10 transition-colors w-full text-left"
            onClick={() => document.getElementById(`hero${heroNum}-photo-input`)?.click()}
          >
            {formData[photoUrlKey] ? '✓ Фото загружено' : 'Загрузить фото'}
          </button>
          <p className="mixer-hint mt-1 text-xs opacity-70">Необязательно. Фото помогает точнее нарисовать персонажа.</p>
          
          {formData[photoUrlKey] && (
            <div className="mt-3 relative inline-block">
              <img
                src={formData[photoUrlKey] as string}
                alt={`Превью героя ${heroNum}`}
                className="w-24 h-24 object-cover rounded-md border-2 border-accent"
              />
              <button
                type="button"
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center hover:bg-destructive/90"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  [photoKey]: null,
                  [photoUrlKey]: ''
                }))}
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Index = () => {
  const { toast } = useToast();
  const [showLoader, setShowLoader] = useState(false);
  const [showEmailOverlay, setShowEmailOverlay] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  
  const emailRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLLabelElement>(null);
  
  const [formData, setFormData] = useState<FormData>({
    world: 'disney_light',
    newyear_mode: false,
    location: '',
    artifact: '',
    length_target: 15000,
    chapters: 5,
    title_need: false,
    language: 'ru',
    email: '',
    illustration_style: 'disney',
    illustration_style_prompt: ILLUSTRATION_STYLES['disney'],
    hero1_name: '',
    hero1_desc: '',
    hero1_rel: '',
    hero1_photo: null,
    hero1_photo_url: '',
    hero2_name: '',
    hero2_desc: '',
    hero2_rel: '',
    hero2_photo: null,
    hero2_photo_url: '',
    hero3_name: '',
    hero3_desc: '',
    hero3_rel: '',
    hero3_photo: null,
    hero3_photo_url: '',
    hero4_name: '',
    hero4_desc: '',
    hero4_rel: '',
    hero4_photo: null,
    hero4_photo_url: ''
  });

  const [heroSections, setHeroSections] = useState({
    hero2: false,
    hero3: false,
    hero4: false
  });

  // Email validation
  const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  const validateEmail = (email: string) => EMAIL_RX.test(email);

  // Email overlay functions
  const showEmailOverlayWithProgress = () => {
    setShowEmailOverlay(true);
    const DURATION = 90_000;
    const start = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / DURATION);
      const progressBar = document.getElementById('email-progress');
      if (progressBar) {
        progressBar.style.width = (k * 100).toFixed(2) + '%';
      }
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const hideEmailOverlayHandler = () => {
    setShowEmailOverlay(false);
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.hero1_name.trim()) {
      toast({
        variant: "destructive",
        title: "Не заполнено имя героя",
        description: "Укажите имя главного героя"
      });
      return;
    }

    if (!validateEmail(formData.email)) {
      toast({
        variant: "destructive",
        title: "Ошибка валидации",
        description: "Введите корректный email"
      });
      emailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      emailRef.current?.focus();
      return;
    }

    if (!consentChecked) {
      toast({
        variant: "destructive",
        title: "Требуется согласие",
        description: "Подтвердите согласие на обработку персональных данных"
      });
      consentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

    setShowLoader(true);

    // Prepare multipart/form-data
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

    // Hero 1
    multipartData.append('hero1_name', formData.hero1_name);
    multipartData.append('hero1_desc', formData.hero1_desc);
    multipartData.append('hero1_rel', formData.hero1_rel);
    if (formData.hero1_photo) {
      multipartData.append('hero1_photo', formData.hero1_photo);
      multipartData.append('hero1_photo_name', formData.hero1_photo.name);
      multipartData.append('hero1_photo_mime', formData.hero1_photo.type);
    }

    // Hero 2 (if enabled)
    if (heroSections.hero2) {
      multipartData.append('hero2_name', formData.hero2_name);
      multipartData.append('hero2_desc', formData.hero2_desc);
      multipartData.append('hero2_rel', formData.hero2_rel);
      if (formData.hero2_photo) {
        multipartData.append('hero2_photo', formData.hero2_photo);
        multipartData.append('hero2_photo_name', formData.hero2_photo.name);
        multipartData.append('hero2_photo_mime', formData.hero2_photo.type);
      }
    }

    // Hero 3 (if enabled)
    if (heroSections.hero3) {
      multipartData.append('hero3_name', formData.hero3_name);
      multipartData.append('hero3_desc', formData.hero3_desc);
      multipartData.append('hero3_rel', formData.hero3_rel);
      if (formData.hero3_photo) {
        multipartData.append('hero3_photo', formData.hero3_photo);
        multipartData.append('hero3_photo_name', formData.hero3_photo.name);
        multipartData.append('hero3_photo_mime', formData.hero3_photo.type);
      }
    }

    // Hero 4 (if enabled)
    if (heroSections.hero4) {
      multipartData.append('hero4_name', formData.hero4_name);
      multipartData.append('hero4_desc', formData.hero4_desc);
      multipartData.append('hero4_rel', formData.hero4_rel);
      if (formData.hero4_photo) {
        multipartData.append('hero4_photo', formData.hero4_photo);
        multipartData.append('hero4_photo_name', formData.hero4_photo.name);
        multipartData.append('hero4_photo_mime', formData.hero4_photo.type);
      }
    }

    let ok = false;
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        body: multipartData
      });
      ok = response.ok;
    } catch (error) {
      ok = false;
    }

    toast({
      title: ok ? "Файлы загружены" : "Ошибка отправки",
      description: ok ? "История генерируется" : "Не удалось отправить данные. Попробуйте ещё раз."
    });
    
    setShowLoader(false);
    if (ok) {
      showEmailOverlayWithProgress();
    }
  };

  const resetForm = () => {
    setFormData({
      world: 'disney_light',
      newyear_mode: false,
      location: '',
      artifact: '',
      length_target: 15000,
      chapters: 5,
      title_need: false,
      language: 'ru',
      email: '',
      illustration_style: 'disney',
      illustration_style_prompt: ILLUSTRATION_STYLES['disney'],
      hero1_name: '',
      hero1_desc: '',
      hero1_rel: '',
      hero1_photo: null,
      hero1_photo_url: '',
      hero2_name: '',
      hero2_desc: '',
      hero2_rel: '',
      hero2_photo: null,
      hero2_photo_url: '',
      hero3_name: '',
      hero3_desc: '',
      hero3_rel: '',
      hero3_photo: null,
      hero3_photo_url: '',
      hero4_name: '',
      hero4_desc: '',
      hero4_rel: '',
      hero4_photo: null,
      hero4_photo_url: ''
    });
    setHeroSections({ hero2: false, hero3: false, hero4: false });
    setConsentChecked(false);
  };

  return (
    <div className="min-h-screen mixer-desk-bg p-4 md:p-8">
      <div className="max-w-4xl mx-auto mixer-chassis">
        {/* Header */}
        <div className="text-center mb-6 mixer-panel constellation-header cursor-pointer" onClick={resetForm}>
          <div className="hero-title-wrapper mb-2">
            <Link to="/" className="block">
              <h1 className="hero-title font-bold mixer-nameplate cursor-pointer hover:opacity-80 transition-opacity text-2xl md:text-3xl">
                <span className="hero-title__text">Конструктор сказок</span>
                <span className="hero-title__glow" aria-hidden="true">Конструктор сказок</span>
                <span className="cursor-blink">|</span>
              </h1>
            </Link>
          </div>
        </div>

        {/* ========== FIRST SCREEN: Quick emotional choices ========== */}
        <div className="space-y-6">
          
          {/* 1. World Selection */}
          <div className="mixer-control-section">
            <label className="mixer-control-label relative text-lg">
              Выбери свой мир
              <span className="hero-infinity-symbol" aria-hidden="true">∞</span>
            </label>
            <p className="mixer-hint mb-4 text-sm">
              От выбора зависит атмосфера сказки
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

              <div className="world-carousel-track">
                {WORLDS.map(world => (
                  <button
                    key={world.value}
                    type="button"
                    className={`world-card ${formData.world === world.value ? 'world-card-active' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, world: world.value }))}
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

          {/* 2. Illustration Style */}
          <div className="mixer-control-section">
            <label className="mixer-control-label text-lg">Стиль иллюстрации</label>
            <StylePicker8Bit
              value={formData.illustration_style}
              onChange={value => setFormData(prev => ({
                ...prev,
                illustration_style: value,
                illustration_style_prompt: ILLUSTRATION_STYLES[value]
              }))}
            />
          </div>

          {/* 3. Main Hero - compact version */}
          <div className="mixer-control-section">
            <label className="mixer-control-label text-lg">Главный герой</label>
            <input
              type="text"
              placeholder="Имя героя *"
              className="mixer-input text-lg"
              value={formData.hero1_name}
              onChange={e => setFormData(prev => ({ ...prev, hero1_name: e.target.value }))}
            />
          </div>

          {/* 4. Email + Consent - near CTA */}
          <div className="mixer-control-section">
            <div className="space-y-4">
              <div>
                <label className="mixer-control-label">Email *</label>
                <input
                  ref={emailRef}
                  type="email"
                  className={`mixer-input ${formData.email && !validateEmail(formData.email) ? 'mixer-input-error' : ''}`}
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                />
                <p className="mixer-hint text-xs mt-1">Пришлём PDF на этот адрес.</p>
              </div>
              
              <label ref={consentRef} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-1 w-5 h-5 accent-[#E89C31] cursor-pointer flex-shrink-0"
                />
                <span className="text-[#DBA858]/90 text-sm leading-relaxed">
                  Даю согласие на обработку персональных данных <span className="text-red-400">*</span>
                </span>
              </label>
            </div>
          </div>

          {/* 5. CTA Button - visible without deep scroll */}
          <div className="text-center py-4">
            <button
              className="mixer-main-button text-xl px-10 py-5"
              onClick={handleSubmit}
              disabled={showLoader}
            >
              {showLoader ? 'Отправка...' : '✨ Создать сказку'}
            </button>
            <p className="mixer-subtitle mt-3 text-sm">
              PDF придёт на почту в течение 15 минут
            </p>
          </div>
        </div>

        {/* ========== SECOND SCREEN: "Улучшить сказку" - optional details ========== */}
        <div className="mt-12 pt-8 border-t border-[#E89C31]/20">
          <h2 className="text-xl text-[#DBA858] mb-6 text-center font-semibold">
            ✦ Улучшить сказку <span className="text-sm font-normal opacity-70">(необязательно)</span>
          </h2>

          <div className="space-y-6">
            {/* Hero 1 - full details (description, photo) */}
            <div className="mixer-control-section">
              <h3 className="mixer-section-title mb-4">Подробнее о главном герое</h3>
              <HeroCard
                heroNum={1}
                isMain={false}
                formData={formData}
                setFormData={setFormData}
                showRelations={false}
                toast={toast}
              />
            </div>

            {/* Add Hero 2 button */}
            {!heroSections.hero2 && (
              <button
                type="button"
                className="w-full py-3 px-4 border-2 border-dashed border-[#E89C31]/40 rounded-xl text-[#DBA858] hover:border-[#E89C31]/70 hover:bg-[#E89C31]/5 transition-all"
                onClick={() => setHeroSections(prev => ({ ...prev, hero2: true }))}
              >
                + Добавить героя 2
              </button>
            )}

            {/* Hero 2 */}
            {heroSections.hero2 && (
              <div className="mixer-control-section">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="mixer-section-title">Герой 2</h3>
                  <button
                    type="button"
                    className="text-sm text-[#DBA858]/60 hover:text-[#DBA858]"
                    onClick={() => setHeroSections(prev => ({ ...prev, hero2: false }))}
                  >
                    Убрать
                  </button>
                </div>
                <HeroCard
                  heroNum={2}
                  formData={formData}
                  setFormData={setFormData}
                  showRelations={true}
                  toast={toast}
                />
                
                {/* Add Hero 3 button */}
                {!heroSections.hero3 && (
                  <button
                    type="button"
                    className="w-full mt-4 py-2 px-4 border border-dashed border-[#E89C31]/30 rounded-lg text-[#DBA858]/70 text-sm hover:border-[#E89C31]/50 transition-all"
                    onClick={() => setHeroSections(prev => ({ ...prev, hero3: true }))}
                  >
                    + Добавить героя 3
                  </button>
                )}
              </div>
            )}

            {/* Hero 3 */}
            {heroSections.hero3 && (
              <div className="mixer-control-section">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="mixer-section-title">Герой 3</h3>
                  <button
                    type="button"
                    className="text-sm text-[#DBA858]/60 hover:text-[#DBA858]"
                    onClick={() => setHeroSections(prev => ({ ...prev, hero3: false }))}
                  >
                    Убрать
                  </button>
                </div>
                <HeroCard
                  heroNum={3}
                  formData={formData}
                  setFormData={setFormData}
                  showRelations={true}
                  toast={toast}
                />
                
                {/* Add Hero 4 button */}
                {!heroSections.hero4 && (
                  <button
                    type="button"
                    className="w-full mt-4 py-2 px-4 border border-dashed border-[#E89C31]/30 rounded-lg text-[#DBA858]/70 text-sm hover:border-[#E89C31]/50 transition-all"
                    onClick={() => setHeroSections(prev => ({ ...prev, hero4: true }))}
                  >
                    + Добавить героя 4
                  </button>
                )}
              </div>
            )}

            {/* Hero 4 */}
            {heroSections.hero4 && (
              <div className="mixer-control-section">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="mixer-section-title">Герой 4</h3>
                  <button
                    type="button"
                    className="text-sm text-[#DBA858]/60 hover:text-[#DBA858]"
                    onClick={() => setHeroSections(prev => ({ ...prev, hero4: false }))}
                  >
                    Убрать
                  </button>
                </div>
                <HeroCard
                  heroNum={4}
                  formData={formData}
                  setFormData={setFormData}
                  showRelations={true}
                  toast={toast}
                />
              </div>
            )}

            {/* Location & Artifact */}
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
                  <p className="mixer-hint text-xs mt-1">Необязательно. Если не заполнить — выберем место сами.</p>
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
                  <p className="mixer-hint text-xs mt-1">Необязательно. Это может быть предмет, символ или деталь.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loader Modal */}
        {showLoader && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="mixer-modal-panel max-w-md text-center">
              <div className="mixer-loading-indicator" />
              <h3 className="text-xl font-semibold mixer-display-value mb-2">Задача отправлена</h3>
              <p className="mixer-subtitle">Обработка запроса...</p>
            </div>
          </div>
        )}

        {/* Email Progress Overlay */}
        {showEmailOverlay && (
          <div
            className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={hideEmailOverlayHandler}
          >
            <div
              className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-lg mx-4 bg-[#031B28] text-[#DBA858] border border-[#E89C31] rounded-2xl shadow-2xl p-6"
              role="dialog"
              aria-modal="true"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-2xl font-semibold mb-2 mixer-nameplate">Почти готово!</h3>
              <p className="mb-4 mixer-subtitle">Через несколько минут сказка окажется у вас на почте.</p>
              <div className="w-full h-3 border border-white/8 rounded-lg bg-white/8 overflow-hidden">
                <div
                  id="email-progress"
                  className="h-full bg-gradient-to-r from-[#E89C31] to-[#DBA858] transition-all duration-200 ease-linear"
                  style={{ width: '0%' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
