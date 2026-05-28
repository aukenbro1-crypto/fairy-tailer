import React, { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

const CREATE_ENDPOINT_URL = import.meta.env.VITE_FAIRYTELLER_CREATE_URL || "/webhook/fairyteller/create";

// Illustration styles (same as Index.tsx)
const ILLUSTRATION_STYLES: Record<string, string> = {
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

import disneyStyleImage from '@/assets/disney-style.jpg';
import watercolorStyleImage from '@/assets/watercolor-style.jpg';
import claymotionStyleImage from '@/assets/claymotion-style.png';
import yarncraftStyleImage from '@/assets/yarncraft-style.jpg';
import naiveStyleImage from '@/assets/naive-style.jpg';
import celcinemaStyleImage from '@/assets/celcinema-style.jpg';
import toonflatStyleImage from '@/assets/toonflat-style.jpg';
import minibrickStyleImage from '@/assets/minibrick-style.jpg';
import photorealismStyleImage from '@/assets/photorealism-style.jpeg';

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

const STYLE_LABELS: Record<string, string> = {
  'photorealistic': 'Фотореализм',
  'disney': 'Дисней',
  'toonflat': 'Старые мультфильмы',
  'minibrick': 'Лего',
  'naive': 'Наивный',
  'watercolor': 'Акварель',
  'claymotion': 'Пластилин',
  'yarncraft': 'Вязаный мир',
  'celcinema': 'Аниме'
};

const ILLUSTRATION_STYLE_KEYS = Object.keys(ILLUSTRATION_STYLES);

// Romantic Style Picker Component (adapted from 8-bit style)
interface RomanticStylePickerProps {
  value: string;
  onChange: (value: string) => void;
}

const RomanticStylePicker: React.FC<RomanticStylePickerProps> = ({ value, onChange }) => {
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
    <section className="romantic-style-picker" onKeyDown={handleKeyDown}>
      <div className="romantic-sp-controls">
        <button type="button" className="romantic-sp-arrow" onClick={handlePrevious} aria-label="Предыдущий стиль">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="romantic-sp-screen" tabIndex={0} role="img" aria-label={`Стиль: ${STYLE_LABELS[value]}`}>
          <div className="romantic-sp-preview">
            <div 
              className="romantic-sp-sprite" 
              style={{ backgroundImage: `url("${STYLE_SPRITES[value]}")` }} 
              aria-hidden="true"
            />
          </div>
          <div className="romantic-sp-label">{STYLE_LABELS[value]}</div>
        </div>

        <button type="button" className="romantic-sp-arrow" onClick={handleNext} aria-label="Следующий стиль">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      
      {/* Dots indicator */}
      <div className="romantic-sp-dots">
        {ILLUSTRATION_STYLE_KEYS.map((key, index) => (
          <button
            key={key}
            type="button"
            className={`romantic-sp-dot ${value === key ? 'active' : ''}`}
            onClick={() => onChange(key)}
            aria-label={STYLE_LABELS[key]}
          />
        ))}
      </div>
    </section>
  );
};

interface HeroData {
  name: string;
  desc: string;
  rel: string;
  photo: File | null;
  photoUrl: string;
}

interface FormData {
  illustrationStyle: string;
  location: string;
  artifact: string;
  hero1: HeroData;
  hero2: HeroData;
  hero3: HeroData;
  email: string;
  consent: boolean;
}

const initialHero = (): HeroData => ({
  name: '',
  desc: '',
  rel: '',
  photo: null,
  photoUrl: '',
});

interface RomanticStoryFormProps {
  worldOverride?: string;
}

const RomanticStoryForm: React.FC<RomanticStoryFormProps> = ({ worldOverride }) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showHero3, setShowHero3] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    illustrationStyle: 'photorealistic',
    location: '',
    artifact: '',
    hero1: initialHero(),
    hero2: initialHero(),
    hero3: initialHero(),
    email: '',
    consent: false,
  });

  const hero1PhotoRef = useRef<HTMLInputElement>(null);
  const hero2PhotoRef = useRef<HTMLInputElement>(null);
  const hero3PhotoRef = useRef<HTMLInputElement>(null);

  const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  const validateEmail = (email: string) => EMAIL_RX.test(email);

  const updateHero = (heroKey: 'hero1' | 'hero2' | 'hero3', field: keyof HeroData, value: string | File | null) => {
    setFormData(prev => ({
      ...prev,
      [heroKey]: {
        ...prev[heroKey],
        [field]: value,
        ...(field === 'photo' && value instanceof File ? { photoUrl: URL.createObjectURL(value) } : {}),
      },
    }));
  };

  const handlePhotoChange = (heroKey: 'hero1' | 'hero2' | 'hero3', e: React.ChangeEvent<HTMLInputElement>) => {
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
    
    updateHero(heroKey, 'photo', file);
  };

  const goToStep2 = () => {
    if (!formData.location.trim()) {
      toast({ variant: "destructive", title: "Ошибка", description: "Укажите место действия" });
      return;
    }
    setCurrentStep(2);
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  const goToStep3 = () => {
    if (!formData.hero1.name.trim() || !formData.hero2.name.trim()) {
      toast({ variant: "destructive", title: "Ошибка", description: "Укажите имена главных героев" });
      return;
    }
    setCurrentStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.consent) {
      toast({ variant: "destructive", title: "Требуется согласие", description: "Пожалуйста, подтвердите согласие на обработку персональных данных" });
      return;
    }

    if (!validateEmail(formData.email)) {
      toast({ variant: "destructive", title: "Ошибка", description: "Введите корректный email" });
      return;
    }

    setIsSubmitting(true);

    const multipartData = new FormData();
    
    // Hardcoded fields
    multipartData.append('world', worldOverride || 'romantic_story');
    multipartData.append('newyear_mode', 'false');
    multipartData.append('length_target', '15000');
    multipartData.append('chapters', '5');
    multipartData.append('title_need', 'false');
    multipartData.append('language', 'ru');

    // Form fields
    multipartData.append('illustration_style', formData.illustrationStyle);
    multipartData.append('illustration_style_prompt', ILLUSTRATION_STYLES[formData.illustrationStyle]);
    multipartData.append('location', formData.location);
    multipartData.append('artifact', formData.artifact);
    multipartData.append('email', formData.email.toLowerCase());

    // Hero 1
    multipartData.append('hero1_name', formData.hero1.name);
    multipartData.append('hero1_desc', formData.hero1.desc);
    multipartData.append('hero1_rel', formData.hero1.rel);
    if (formData.hero1.photo) {
      multipartData.append('hero1_photo', formData.hero1.photo);
      multipartData.append('hero1_photo_name', formData.hero1.photo.name);
      multipartData.append('hero1_photo_mime', formData.hero1.photo.type);
    }

    // Hero 2
    multipartData.append('hero2_name', formData.hero2.name);
    multipartData.append('hero2_desc', formData.hero2.desc);
    multipartData.append('hero2_rel', formData.hero2.rel);
    if (formData.hero2.photo) {
      multipartData.append('hero2_photo', formData.hero2.photo);
      multipartData.append('hero2_photo_name', formData.hero2.photo.name);
      multipartData.append('hero2_photo_mime', formData.hero2.photo.type);
    }

    // Hero 3 (optional)
    if (showHero3 && formData.hero3.name.trim()) {
      multipartData.append('hero3_name', formData.hero3.name);
      multipartData.append('hero3_desc', formData.hero3.desc);
      multipartData.append('hero3_rel', formData.hero3.rel);
      if (formData.hero3.photo) {
        multipartData.append('hero3_photo', formData.hero3.photo);
        multipartData.append('hero3_photo_name', formData.hero3.photo.name);
        multipartData.append('hero3_photo_mime', formData.hero3.photo.type);
      }
    }

    let ok = false;
    try {
      const response = await fetch(CREATE_ENDPOINT_URL, {
        method: 'POST',
        body: multipartData,
      });
      ok = response.ok;
    } catch (error) {
      ok = false;
    }

    setIsSubmitting(false);

    if (ok) {
      setIsSuccess(true);
    } else {
      toast({ variant: "destructive", title: "Ошибка отправки", description: "Не удалось отправить данные. Попробуйте ещё раз." });
    }
  };

  if (isSuccess) {
    return (
      <div className="romantic-form-success text-center py-12">
        <div className="romantic-success-icon mb-6">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="2" />
            <path d="M20 32L28 40L44 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="romantic-h2 text-2xl md:text-3xl mb-4">Запрос принят!</h3>
        <p className="romantic-text text-lg md:text-xl">
          Книга придет на почту в течение 10-15 минут.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="romantic-story-form">
      {/* Step Indicator */}
      <div className="romantic-step-indicator mb-8">
        {[1, 2, 3].map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => goToStep(step)}
            className={`romantic-step-dot ${currentStep === step ? 'active' : ''} ${currentStep > step ? 'completed' : ''}`}
            style={{ cursor: 'pointer' }}
          >
            {step}
          </button>
        ))}
      </div>

      {/* STEP 1: Style + Location & Artifact */}
      {currentStep === 1 && (
        <div className="romantic-form-step animate-fade-in">
          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Left: Style Picker */}
            <div className="romantic-form-section">
              <h3 className="romantic-form-label mb-4 text-center">Стиль иллюстраций</h3>
              <RomanticStylePicker 
                value={formData.illustrationStyle} 
                onChange={(value) => setFormData(prev => ({ ...prev, illustrationStyle: value }))} 
              />
            </div>

            {/* Right: Location & Artifact */}
            <div className="romantic-form-section">
              <div className="space-y-6">
                <div>
                  <label className="romantic-form-label">Место действия вашей истории</label>
                  <textarea
                    className="romantic-form-input romantic-form-textarea"
                    value={formData.location}
                    onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Париж, берег моря, уютное кафе..."
                    rows={3}
                  />
                </div>
                <div>
                  <label className="romantic-form-label">Артефакт — особенный предмет</label>
                  <textarea
                    className="romantic-form-input romantic-form-textarea"
                    value={formData.artifact}
                    onChange={e => setFormData(prev => ({ ...prev, artifact: e.target.value }))}
                    placeholder="Кольцо, письмо, общая песня..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-10">
            <button
              type="button"
              className="romantic-cta-primary text-lg px-10 py-4 transition-all duration-300"
              onClick={goToStep2}
            >
              Далее →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Heroes */}
      {currentStep === 2 && (
        <div className="romantic-form-step animate-fade-in">
          <div className="romantic-form-section mb-8">
            <h3 className="romantic-form-label mb-6 text-center text-xl">Главные герои вашей истории</h3>
            
            <div className="grid md:grid-cols-2 gap-8 mb-6">
              {/* Hero 1 */}
              <div className="romantic-hero-card">
                <h4 className="romantic-hero-title">Первый герой</h4>
                <div className="space-y-4">
                  <input
                    type="text"
                    className="romantic-form-input"
                    value={formData.hero1.name}
                    onChange={e => updateHero('hero1', 'name', e.target.value)}
                    placeholder="Имя"
                  />
                  <textarea
                    className="romantic-form-input romantic-form-textarea"
                    value={formData.hero1.desc}
                    onChange={e => updateHero('hero1', 'desc', e.target.value)}
                    placeholder="Опишите героя: внешность, характер..."
                    rows={3}
                  />
                  <div>
                    <input
                      ref={hero1PhotoRef}
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      className="hidden"
                      onChange={e => handlePhotoChange('hero1', e)}
                    />
                    <button
                      type="button"
                      className="romantic-photo-upload"
                      onClick={() => hero1PhotoRef.current?.click()}
                    >
                      {formData.hero1.photoUrl ? (
                        <img src={formData.hero1.photoUrl} alt="Фото героя" className="romantic-photo-preview" />
                      ) : (
                        <span>📷 Загрузить фото</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Hero 2 */}
              <div className="romantic-hero-card">
                <h4 className="romantic-hero-title">Второй герой</h4>
                <div className="space-y-4">
                  <input
                    type="text"
                    className="romantic-form-input"
                    value={formData.hero2.name}
                    onChange={e => updateHero('hero2', 'name', e.target.value)}
                    placeholder="Имя"
                  />
                  <textarea
                    className="romantic-form-input romantic-form-textarea"
                    value={formData.hero2.desc}
                    onChange={e => updateHero('hero2', 'desc', e.target.value)}
                    placeholder="Опишите героя: внешность, характер..."
                    rows={3}
                  />
                  <div>
                    <input
                      ref={hero2PhotoRef}
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      className="hidden"
                      onChange={e => handlePhotoChange('hero2', e)}
                    />
                    <button
                      type="button"
                      className="romantic-photo-upload"
                      onClick={() => hero2PhotoRef.current?.click()}
                    >
                      {formData.hero2.photoUrl ? (
                        <img src={formData.hero2.photoUrl} alt="Фото героя" className="romantic-photo-preview" />
                      ) : (
                        <span>📷 Загрузить фото</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero 3 Toggle */}
            {!showHero3 ? (
              <button
                type="button"
                className="romantic-add-hero-btn"
                onClick={() => setShowHero3(true)}
              >
                + Добавить третьего героя
              </button>
            ) : (
              <div className="romantic-hero-card romantic-hero-card-optional">
                <h4 className="romantic-hero-title">Третий герой (опционально)</h4>
                <div className="space-y-4">
                  <input
                    type="text"
                    className="romantic-form-input"
                    value={formData.hero3.name}
                    onChange={e => updateHero('hero3', 'name', e.target.value)}
                    placeholder="Имя"
                  />
                  <textarea
                    className="romantic-form-input romantic-form-textarea"
                    value={formData.hero3.desc}
                    onChange={e => updateHero('hero3', 'desc', e.target.value)}
                    placeholder="Опишите героя: внешность, характер..."
                    rows={3}
                  />
                  <div>
                    <input
                      ref={hero3PhotoRef}
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      className="hidden"
                      onChange={e => handlePhotoChange('hero3', e)}
                    />
                    <button
                      type="button"
                      className="romantic-photo-upload"
                      onClick={() => hero3PhotoRef.current?.click()}
                    >
                      {formData.hero3.photoUrl ? (
                        <img src={formData.hero3.photoUrl} alt="Фото героя" className="romantic-photo-preview" />
                      ) : (
                        <span>📷 Загрузить фото</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center gap-4 mt-10">
            <button
              type="button"
              className="romantic-cta-secondary text-lg px-8 py-4 transition-all duration-300"
              onClick={() => setCurrentStep(1)}
            >
              ← Назад
            </button>
            <button
              type="button"
              className="romantic-cta-primary text-lg px-10 py-4 transition-all duration-300"
              onClick={goToStep3}
            >
              Почти готово →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Email & Consent */}
      {currentStep === 3 && (
        <div className="romantic-form-step animate-fade-in">
          <div className="romantic-form-section max-w-md mx-auto">
            <h3 className="romantic-form-label mb-6 text-center text-xl">Последний шаг</h3>
            
            <div className="space-y-6">
              <div>
                <label className="romantic-form-label">Ваш email</label>
                <input
                  type="email"
                  className="romantic-form-input"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                />
                <p className="romantic-form-hint mt-2">На эту почту придет готовая книга</p>
              </div>
              
              <label className="romantic-consent-label">
                <input
                  type="checkbox"
                  className="romantic-consent-checkbox"
                  checked={formData.consent}
                  onChange={e => setFormData(prev => ({ ...prev, consent: e.target.checked }))}
                />
                <span>Согласие на обработку персональных данных</span>
              </label>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-10">
            <button
              type="button"
              className="romantic-cta-secondary text-lg px-8 py-4 transition-all duration-300"
              onClick={() => setCurrentStep(2)}
            >
              ← Назад
            </button>
            <button
              type="submit"
              className="romantic-cta-primary text-lg px-10 py-4 transition-all duration-300"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Отправка...' : 'Создать нашу книгу'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
};

export default RomanticStoryForm;
