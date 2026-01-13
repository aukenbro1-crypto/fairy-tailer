import React, { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

// Webhook URL
const WEBHOOK_URL = "https://hook.eu2.make.com/c9pm5jrx6t7ki3ir3qq1e7822cai2bz9";

// Illustration styles (same as Index.tsx)
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

import disneyStyleImage from '@/assets/disney-style.jpg';
import watercolorStyleImage from '@/assets/watercolor-style.jpg';
import claymotionStyleImage from '@/assets/claymotion-style.png';
import yarncraftStyleImage from '@/assets/yarncraft-style.jpg';
import naiveStyleImage from '@/assets/naive-style.jpg';
import celcinemaStyleImage from '@/assets/celcinema-style.jpg';
import toonflatStyleImage from '@/assets/toonflat-style.jpg';
import minibrickStyleImage from '@/assets/minibrick-style.jpg';

const STYLE_OPTIONS = [
  { value: 'disney', label: 'Диснеевский', image: disneyStyleImage },
  { value: 'watercolor', label: 'Акварель', image: watercolorStyleImage },
  { value: 'claymotion', label: 'Пластилин', image: claymotionStyleImage },
  { value: 'yarncraft', label: 'Вязаный мир', image: yarncraftStyleImage },
  { value: 'naive', label: 'Наивный', image: naiveStyleImage },
  { value: 'celcinema', label: 'Кинематограф', image: celcinemaStyleImage },
  { value: 'toonflat', label: 'Мультяшный', image: toonflatStyleImage },
  { value: 'minibrick', label: 'Лего', image: minibrickStyleImage },
];

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

const RomanticStoryForm: React.FC = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showHero3, setShowHero3] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    illustrationStyle: 'disney',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.consent) {
      toast({ variant: "destructive", title: "Требуется согласие", description: "Пожалуйста, подтвердите согласие на обработку персональных данных" });
      return;
    }

    if (!validateEmail(formData.email)) {
      toast({ variant: "destructive", title: "Ошибка", description: "Введите корректный email" });
      return;
    }

    if (!formData.location.trim()) {
      toast({ variant: "destructive", title: "Ошибка", description: "Укажите место действия" });
      return;
    }

    if (!formData.artifact.trim()) {
      toast({ variant: "destructive", title: "Ошибка", description: "Укажите артефакт" });
      return;
    }

    if (!formData.hero1.name.trim() || !formData.hero2.name.trim()) {
      toast({ variant: "destructive", title: "Ошибка", description: "Укажите имена главных героев" });
      return;
    }

    setIsSubmitting(true);

    const multipartData = new FormData();
    
    // Hardcoded fields
    multipartData.append('world', 'disney_light');
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
      const response = await fetch(WEBHOOK_URL, {
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
      {/* Block A: Illustration Style */}
      <div className="romantic-form-section mb-10">
        <h3 className="romantic-form-label mb-4">Стиль иллюстраций</h3>
        <div className="romantic-style-grid">
          {STYLE_OPTIONS.map(style => (
            <button
              key={style.value}
              type="button"
              className={`romantic-style-card ${formData.illustrationStyle === style.value ? 'romantic-style-card-active' : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, illustrationStyle: style.value }))}
            >
              <div className="romantic-style-image-wrapper">
                <img src={style.image} alt={style.label} className="romantic-style-image" />
              </div>
              <span className="romantic-style-label">{style.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Block B: Location & Artifact */}
      <div className="romantic-form-section mb-10">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="romantic-form-label">Место действия вашей истории</label>
            <textarea
              className="romantic-form-input romantic-form-textarea"
              value={formData.location}
              onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Париж, берег моря, уютное кафе..."
              rows={3}
              required
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
              required
            />
          </div>
        </div>
      </div>

      {/* Block C: Heroes */}
      <div className="romantic-form-section mb-10">
        <h3 className="romantic-form-label mb-4">Главные герои вашей истории</h3>
        
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
                required
              />
              <textarea
                className="romantic-form-input romantic-form-textarea"
                value={formData.hero1.desc}
                onChange={e => updateHero('hero1', 'desc', e.target.value)}
                placeholder="Опишите героя: внешность, характер..."
                rows={3}
              />
              <input
                type="text"
                className="romantic-form-input"
                value={formData.hero1.rel}
                onChange={e => updateHero('hero1', 'rel', e.target.value)}
                placeholder="Роль в истории (муж, жена, друг...)"
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
                required
              />
              <textarea
                className="romantic-form-input romantic-form-textarea"
                value={formData.hero2.desc}
                onChange={e => updateHero('hero2', 'desc', e.target.value)}
                placeholder="Опишите героя: внешность, характер..."
                rows={3}
              />
              <input
                type="text"
                className="romantic-form-input"
                value={formData.hero2.rel}
                onChange={e => updateHero('hero2', 'rel', e.target.value)}
                placeholder="Роль в истории (муж, жена, друг...)"
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
              <input
                type="text"
                className="romantic-form-input"
                value={formData.hero3.rel}
                onChange={e => updateHero('hero3', 'rel', e.target.value)}
                placeholder="Роль в истории (друг, питомец...)"
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

      {/* Block D: Email & Consent */}
      <div className="romantic-form-section mb-10">
        <div className="max-w-md mx-auto space-y-4">
          <div>
            <label className="romantic-form-label">Ваш email</label>
            <input
              type="email"
              className="romantic-form-input"
              value={formData.email}
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@example.com"
              required
            />
          </div>
          
          <label className="romantic-consent-label">
            <input
              type="checkbox"
              className="romantic-consent-checkbox"
              checked={formData.consent}
              onChange={e => setFormData(prev => ({ ...prev, consent: e.target.checked }))}
              required
            />
            <span>Согласие на обработку персональных данных</span>
          </label>
        </div>
      </div>

      {/* Submit Button */}
      <div className="text-center">
        <button
          type="submit"
          className="romantic-cta-primary text-lg md:text-xl px-10 py-5 transition-all duration-300"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Отправка...' : 'Создать нашу книгу'}
        </button>
      </div>
    </form>
  );
};

export default RomanticStoryForm;
