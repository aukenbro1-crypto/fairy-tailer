import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import claymotionStyleImage from '@/assets/claymotion-style.png';
import naiveStyleImage from '@/assets/naive-style.jpg';
import minibrickStyleImage from '@/assets/minibrick-style.jpg';
import watercolorStyleImage from '@/assets/watercolor-style.jpg';
import disneyStyleImage from '@/assets/disney-style.jpg';
import toonflatStyleImage from '@/assets/toonflat-style.jpg';
import celcinemaStyleImage from '@/assets/celcinema-style.jpg';
import yarncraftStyleImage from '@/assets/yarncraft-style.jpg';
import { WelcomeBanner } from '@/components/WelcomeBanner';

// Compass Selector Component
interface CompassSelectorProps {
  options: string[];
  labels: Record<string, string>;
  value: string;
  onChange: (value: string) => void;
  symbols: string[];
}
const CompassSelector: React.FC<CompassSelectorProps> = ({
  options,
  labels,
  value,
  onChange,
  symbols
}) => {
  const [diskRotation, setDiskRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const compassRef = useRef<HTMLDivElement>(null);

  // Update disk rotation when value changes
  useEffect(() => {
    const currentIndex = options.indexOf(value);
    const targetRotation = -(currentIndex * (360 / options.length));
    setDiskRotation(targetRotation);
  }, [value, options.length]);
  const handleSectorClick = (option: string) => {
    onChange(option);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = options.indexOf(value);
    let newIndex = currentIndex;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      newIndex = (currentIndex - 1 + options.length) % options.length;
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      newIndex = (currentIndex + 1) % options.length;
    }
    if (newIndex !== currentIndex) {
      onChange(options[newIndex]);
    }
  };
  const handleCircleClick = (e: React.MouseEvent) => {
    // Prevent event if clicking directly on a sector button
    if ((e.target as Element).classList.contains('compass-sector-disk')) {
      return;
    }
    
    // Move to next option in sequence
    const currentIndex = options.indexOf(value);
    const nextIndex = (currentIndex + 1) % options.length;
    onChange(options[nextIndex]);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!compassRef.current) return;
    setIsDragging(true);
    const rect = compassRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging) return;
      const angle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX) * (180 / Math.PI) + 90;
      const normalizedAngle = (angle % 360 + 360) % 360;
      const sectorAngle = 360 / options.length;
      const sectorIndex = Math.round(normalizedAngle / sectorAngle) % options.length;
      onChange(options[sectorIndex]);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  return <div className="compass-section">
      {/* Compass Selector with Directional Indicators */}
      <div ref={compassRef} className="compass-container" role="radiogroup" tabIndex={0} aria-label="Выбор развязки истории, стрелка указывает вверх; поворачивайте диск для выбора" onKeyDown={handleKeyDown} onMouseDown={handleMouseDown} onClick={handleCircleClick} style={{
      touchAction: 'none'
    }}>
        <div className="compass-face">
          {/* Fixed Red Arrow Pointing Up */}
          <div className="compass-arrow-fixed" />
          
          {/* Rotating Disk with Sectors */}
          <div className="compass-disk" style={{
          transform: `rotate(${diskRotation}deg)`,
          transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
            {options.map((option, index) => {
            const angle = index * (360 / options.length);
            const isActive = value === option;
            return <button key={option} className={`compass-sector-disk ${isActive ? 'active' : ''}`} role="radio" aria-checked={isActive} aria-label={labels[option]} style={{
              transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-50px) rotate(-${angle + diskRotation}deg)`
            }} onClick={() => handleSectorClick(option)}>
                  {symbols[index] || symbols[index % symbols.length]}
                </button>;
          })}
          </div>
        </div>
      </div>

      {/* Display Screen moved below compass */}
      <div className="compass-display">
        <div className="compass-display-text" aria-live="polite">
          {labels[value]}
        </div>
        <div className="compass-hint-container">
          
        </div>
      </div>
    </div>;
};

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
// World options for the new "Choose Your World" section
const WORLDS = [
  {
    value: 'disney_light',
    emoji: '💖',
    title: 'Романтическая история',
    description: 'Доброжелательный мир, где герои влюбляются друг в друга.',
    tagline: '— И жили они долго и счастливо.'
  },
  {
    value: 'adventure_classic',
    emoji: '🦜',
    title: 'Приключения',
    description: 'Мир открытий, где герои идут навстречу новым возможностям.',
    tagline: '— Лови момент!'
  },
  {
    value: 'fantasy_epic',
    emoji: '🧙🏻‍♂️',
    title: 'Фэнтези',
    description: 'Древние миры, тайны и борьба со злом.',
    tagline: '— От судьбы не уйдешь.'
  },
  {
    value: 'cyberpunk_dream',
    emoji: '👩‍🎤',
    title: 'Киберпанк',
    description: 'Неоновые вывески и одиночество в Сети.',
    tagline: '— Следуй за белым кроликом.'
  }
];

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

// Pixel art sprites as inline SVG data URIs
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
        {/* Previous Arrow */}
        <button
          type="button"
          className="sp-arrow sp-arrow-prev"
          onClick={handlePrevious}
          aria-label="Previous style"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
          </svg>
        </button>

        {/* Preview Screen */}
        <div className="sp-screen" tabIndex={0} role="img" aria-label={`Current style: ${ILLUSTRATION_STYLE_LABELS[value]}`}>
          <div className="sp-scanlines" aria-hidden="true"></div>
          <div className="sp-preview">
            <div 
              className="sp-sprite" 
              style={{ backgroundImage: `url("${STYLE_SPRITES[value]}")` }}
              aria-hidden="true"
            ></div>
            {value !== 'claymotion' && value !== 'naive' && value !== 'minibrick' && value !== 'watercolor' && value !== 'disney' && value !== 'toonflat' && value !== 'celcinema' && value !== 'yarncraft' && (
              <div className="sp-label" aria-live="polite">
                {ILLUSTRATION_STYLE_LABELS[value]}
              </div>
            )}
          </div>
        </div>

        {/* Next Arrow */}
        <button
          type="button"
          className="sp-arrow sp-arrow-next"
          onClick={handleNext}
          aria-label="Next style"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
          </svg>
        </button>
      </div>

      <input 
        type="hidden" 
        name="illustration_style" 
        id="styleValue" 
        value={value}
      />
    </section>
  );
};

const Index = () => {
  const {
    toast
  } = useToast();
  const knobRef = useRef<HTMLDivElement>(null);
  const [knobAngle, setKnobAngle] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [showEmailOverlay, setShowEmailOverlay] = useState(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true);
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
  const validateEmail = (email: string) => {
    return EMAIL_RX.test(email);
  };

  // Email overlay functions
  const showEmailOverlayWithProgress = () => {
    setShowEmailOverlay(true);
    const DURATION = 90_000; // 90 seconds
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
    // Email validation
    if (!validateEmail(formData.email)) {
      toast({
        variant: "destructive",
        title: "Ошибка валидации",
        description: "Введите корректный email"
      });
      return;
    }

    // Other validation
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
    
    // Add all text fields
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
    
    // Hero 1 (always included, photo optional)
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
        // Don't set Content-Type header - browser will set it with boundary
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
  return <div className="min-h-screen mixer-desk-bg p-4 md:p-8">
      <WelcomeBanner open={showWelcomeBanner} onClose={() => setShowWelcomeBanner(false)} />
      <div className="max-w-6xl mx-auto mixer-chassis">
      {/* Header */}
        <div className="text-center mb-8 mixer-panel constellation-header cursor-pointer" onClick={() => {
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
        }}>
          {/* Constellation Background Layer with Text Mask */}
          <div className="hero-constellations" aria-hidden="true">
            <svg className="constellation-svg-hero" viewBox="0 0 800 200" xmlns="http://www.w3.org/2000/svg">
              <defs>
                {/* Text mask to avoid overlapping letters */}
                <mask id="textMask">
                  <rect width="100%" height="100%" fill="white"/>
                  <rect x="180" y="60" width="440" height="80" rx="12" fill="black"/>
                </mask>
              </defs>
              
              <g mask="url(#textMask)">
                {/* Upper Left Constellation - "Большая Медведица" style */}
                <g className="constellation-group upper-left">
                  <circle cx="40" cy="25" r="4.5" className="star-hero bright" />
                  <circle cx="85" cy="35" r="3.8" className="star-hero" />
                  <circle cx="120" cy="20" r="4.2" className="star-hero bright" />
                  <circle cx="160" cy="40" r="3.5" className="star-hero" />
                  <circle cx="75" cy="55" r="3.2" className="star-hero" />
                  <circle cx="45" cy="50" r="4.0" className="star-hero" />
                  <circle cx="110" cy="45" r="3.6" className="star-hero" />
                  <path d="M40,25 L85,35 L120,20 L160,40 M85,35 L110,45 L75,55 L45,50 L40,25" 
                        className="constellation-line-hero" />
                </g>

                {/* Upper Right Constellation - "Кассиопея" style */}
                <g className="constellation-group upper-right">
                  <circle cx="650" cy="30" r="4.3" className="star-hero bright" />
                  <circle cx="690" cy="20" r="3.7" className="star-hero" />
                  <circle cx="720" cy="35" r="4.1" className="star-hero bright" />
                  <circle cx="750" cy="25" r="3.4" className="star-hero" />
                  <circle cx="780" cy="40" r="3.9" className="star-hero" />
                  <circle cx="670" cy="50" r="3.2" className="star-hero" />
                  <path d="M650,30 L690,20 L720,35 L750,25 L780,40 M690,20 L670,50" 
                        className="constellation-line-hero" />
                </g>

                {/* Lower Left Constellation - "Орион" style */}
                <g className="constellation-group lower-left">
                  <circle cx="60" cy="160" r="4.4" className="star-hero bright" />
                  <circle cx="90" cy="175" r="3.6" className="star-hero" />
                  <circle cx="120" cy="165" r="4.0" className="star-hero" />
                  <circle cx="80" cy="185" r="3.3" className="star-hero" />
                  <circle cx="100" cy="195" r="3.8" className="star-hero" />
                  <circle cx="30" cy="180" r="3.5" className="star-hero" />
                  <circle cx="50" cy="190" r="4.2" className="star-hero bright" />
                  <path d="M60,160 L90,175 L120,165 M80,185 L100,195 L50,190 M30,180 L60,160 M90,175 L80,185" 
                        className="constellation-line-hero" />
                </g>

                {/* Lower Right Constellation - "Лебедь" style */}
                <g className="constellation-group lower-right">
                  <circle cx="680" cy="170" r="4.1" className="star-hero bright" />
                  <circle cx="720" cy="180" r="3.7" className="star-hero" />
                  <circle cx="750" cy="165" r="3.9" className="star-hero" />
                  <circle cx="740" cy="190" r="3.4" className="star-hero" />
                  <circle cx="770" cy="185" r="4.0" className="star-hero" />
                  <circle cx="700" cy="195" r="3.6" className="star-hero" />
                  <path d="M680,170 L720,180 L750,165 M720,180 L740,190 L770,185 M720,180 L700,195" 
                        className="constellation-line-hero" />
                </g>

                {/* Scattered Individual Stars */}
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

                {/* Subtle Milky Way effect */}
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
            <h1 className="hero-title font-bold mixer-nameplate">
              <span className="hero-title__text">Конструктор сказок</span>
              <span className="hero-title__glow" aria-hidden="true">Конструктор сказок</span>
              <span className="cursor-blink">|</span>
            </h1>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column - Controls */}
          <div className="space-y-8">
            {/* World Selection */}
            <div className="mixer-control-section mobile-order-1">
              <label className="mixer-control-label relative">
                Выбери свой мир
                <span className="hero-infinity-symbol" aria-hidden="true">∞</span>
              </label>
              <p className="mixer-hint mb-4">
                Каждый мир — это своя атмосфера, законы и настроение. 
                От выбора зависит, какой получится сказка: лёгкая, философская, приключенческая или кибер-сон.
              </p>
              
              {/* Carousel Container */}
              <div className="world-carousel-wrapper">
                {/* Mobile Navigation Arrows */}
                <button
                  type="button"
                  className="world-carousel-arrow world-carousel-arrow-prev"
                  onClick={() => {
                    const track = document.querySelector('.world-carousel-track') as HTMLElement;
                    const currentIndex = WORLDS.findIndex(w => w.value === formData.world);
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : WORLDS.length - 1;
                    const cards = document.querySelectorAll('.world-card') as NodeListOf<HTMLElement>;
                    if (!track || !cards[prevIndex]) return;
                    
                    const card = cards[prevIndex];
                    const scrollLeft = card.offsetLeft - (track.offsetWidth - card.offsetWidth) / 2;
                    
                    track.scrollTo({
                      left: scrollLeft,
                      behavior: 'smooth'
                    });
                    
                    setFormData(prev => ({ ...prev, world: WORLDS[prevIndex].value }));
                  }}
                  aria-label="Предыдущий мир"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                </button>

                <button
                  type="button"
                  className="world-carousel-arrow world-carousel-arrow-next"
                  onClick={() => {
                    const track = document.querySelector('.world-carousel-track') as HTMLElement;
                    const currentIndex = WORLDS.findIndex(w => w.value === formData.world);
                    const nextIndex = currentIndex < WORLDS.length - 1 ? currentIndex + 1 : 0;
                    const cards = document.querySelectorAll('.world-card') as NodeListOf<HTMLElement>;
                    if (!track || !cards[nextIndex]) return;
                    
                    const card = cards[nextIndex];
                    const scrollLeft = card.offsetLeft - (track.offsetWidth - card.offsetWidth) / 2;
                    
                    track.scrollTo({
                      left: scrollLeft,
                      behavior: 'smooth'
                    });
                    
                    setFormData(prev => ({ ...prev, world: WORLDS[nextIndex].value }));
                  }}
                  aria-label="Следующий мир"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>

                <div 
                  className="world-carousel-track"
                  onScroll={(e) => {
                    const track = e.currentTarget;
                    const cards = track.querySelectorAll('.world-card') as NodeListOf<HTMLElement>;
                    if (cards.length === 0) return;
                    
                    const trackCenter = track.scrollLeft + track.offsetWidth / 2;
                    let closestIndex = 0;
                    let closestDistance = Infinity;
                    
                    cards.forEach((card, index) => {
                      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
                      const distance = Math.abs(trackCenter - cardCenter);
                      if (distance < closestDistance) {
                        closestDistance = distance;
                        closestIndex = index;
                      }
                    });
                    
                    // Auto-select the centered card
                    const selectedWorld = WORLDS[closestIndex];
                    if (selectedWorld && formData.world !== selectedWorld.value) {
                      setFormData(prev => ({ ...prev, world: selectedWorld.value }));
                    }
                  }}
                >
                  {WORLDS.map((world) => (
                    <button
                      key={world.value}
                      type="button"
                      className={`world-card ${formData.world === world.value ? 'world-card-active' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, world: world.value }))}
                    >
                      <div className="world-card-content">
                        <div className="world-card-header">
                          <span className="world-card-emoji">{world.emoji}</span>
                          <h4 className="world-card-title">{world.title}</h4>
                        </div>
                        <p className="world-card-description">{world.description}</p>
                        <p className="world-card-tagline">{world.tagline}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Dots Navigation with Arrow Buttons */}
                <div className="world-carousel-dots">
                  {/* Left Arrow */}
                  <button
                    type="button"
                    className="world-carousel-nav-arrow world-carousel-nav-arrow-left"
                    onClick={() => {
                      const currentIndex = WORLDS.findIndex(w => w.value === formData.world);
                      const prevIndex = currentIndex === 0 ? WORLDS.length - 1 : currentIndex - 1;
                      const prevWorld = WORLDS[prevIndex];
                      
                      const track = document.querySelector('.world-carousel-track') as HTMLElement;
                      const cards = document.querySelectorAll('.world-card') as NodeListOf<HTMLElement>;
                      if (!track || !cards[prevIndex]) return;
                      
                      const card = cards[prevIndex];
                      const scrollLeft = card.offsetLeft - (track.offsetWidth - card.offsetWidth) / 2;
                      
                      track.scrollTo({
                        left: scrollLeft,
                        behavior: 'smooth'
                      });
                      
                      setFormData(prev => ({ ...prev, world: prevWorld.value }));
                    }}
                    aria-label="Previous world"
                  >
                    <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
                      <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  {/* Dots */}
                  {WORLDS.map((world, index) => (
                    <button
                      key={world.value}
                      type="button"
                      className={`world-carousel-dot ${formData.world === world.value ? 'active' : ''}`}
                      onClick={() => {
                        const track = document.querySelector('.world-carousel-track') as HTMLElement;
                        const cards = document.querySelectorAll('.world-card') as NodeListOf<HTMLElement>;
                        if (!track || !cards[index]) return;
                        
                        const card = cards[index];
                        const scrollLeft = card.offsetLeft - (track.offsetWidth - card.offsetWidth) / 2;
                        
                        track.scrollTo({
                          left: scrollLeft,
                          behavior: 'smooth'
                        });
                        
                        setFormData(prev => ({ ...prev, world: world.value }));
                      }}
                      aria-label={world.title}
                    />
                  ))}

                  {/* Right Arrow */}
                  <button
                    type="button"
                    className="world-carousel-nav-arrow world-carousel-nav-arrow-right"
                    onClick={() => {
                      const currentIndex = WORLDS.findIndex(w => w.value === formData.world);
                      const nextIndex = currentIndex === WORLDS.length - 1 ? 0 : currentIndex + 1;
                      const nextWorld = WORLDS[nextIndex];
                      
                      const track = document.querySelector('.world-carousel-track') as HTMLElement;
                      const cards = document.querySelectorAll('.world-card') as NodeListOf<HTMLElement>;
                      if (!track || !cards[nextIndex]) return;
                      
                      const card = cards[nextIndex];
                      const scrollLeft = card.offsetLeft - (track.offsetWidth - card.offsetWidth) / 2;
                      
                      track.scrollTo({
                        left: scrollLeft,
                        behavior: 'smooth'
                      });
                      
                      setFormData(prev => ({ ...prev, world: nextWorld.value }));
                    }}
                    aria-label="Next world"
                  >
                    <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
                      <path d="M2 1L7 6L2 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* New Year Toggle */}
            <div className="mixer-control-section mobile-order-3">
              <div className="flex items-start gap-4">
                <div 
                  className={`mixer-toggle ${formData.newyear_mode ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, newyear_mode: !prev.newyear_mode }))}
                >
                  <div className="mixer-toggle-handle" />
                </div>
                <div className="flex-1">
                  <label className="mixer-control-label cursor-pointer" onClick={() => setFormData(prev => ({ ...prev, newyear_mode: !prev.newyear_mode }))}>
                    🎄 Новый год
                  </label>
                  <p className="mixer-hint mt-1">
                    Добавит зимнюю атмосферу, огни и ощущение начала нового — без клише и Санта-нарратива.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Тёплый свет гирлянд, свечи, мандарины или тропическая новогодняя ночь — в зависимости от локации.
                  </p>
                </div>
              </div>
            </div>

            {/* Email Field */}
            <div className="mixer-control-section mobile-order-4">
              <div className="space-y-4">
                <div>
                  <label className="mixer-control-label">
                    Почта (обязательно)
                  </label>
                  <input type="email" className={`mixer-input ${formData.email && !validateEmail(formData.email) ? 'mixer-input-error' : ''}`} value={formData.email} onChange={e => setFormData(prev => ({
                  ...prev,
                  email: e.target.value
                }))} placeholder="name@example.com" autoComplete="email" required />
                  <p className="mixer-hint">
                    Мы вышлем PDF на этот адрес.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Story Details */}
          <div className="space-y-8">
            {/* 8-bit Style Picker */}
            <div className="mixer-control-section mobile-order-2">
              <label className="mixer-control-label">
                Стиль иллюстрации
              </label>
              <StylePicker8Bit
                value={formData.illustration_style}
                onChange={(value) => setFormData(prev => ({
                  ...prev,
                  illustration_style: value,
                  illustration_style_prompt: ILLUSTRATION_STYLES[value]
                }))}
              />
            </div>

            {/* Location & Artifact */}
            <div className="mixer-control-section mobile-order-5">
              <div className="space-y-4">
                <div>
                  <label className="mixer-control-label">
                    Место действия
                  </label>
                  <input type="text" className="mixer-input" value={formData.location} onChange={e => setFormData(prev => ({
                  ...prev,
                  location: e.target.value
                }))} placeholder="Мехико или Заколдованный лес..." />
                </div>
                <div>
                  <label className="mixer-control-label">
                    Артефакт
                  </label>
                  <input type="text" className="mixer-input" value={formData.artifact} onChange={e => setFormData(prev => ({
                  ...prev,
                  artifact: e.target.value
                }))} placeholder="личный предмет или знакомое событие..." />
                </div>
              </div>
            </div>

            {/* Heroes Section */}
            <div className="mixer-control-section mobile-order-6">
              <h3 className="mixer-section-title">Персонажи</h3>
              
              {/* Main Hero */}
              <div className="mixer-hero-panel">
                <h4 className="mixer-hero-title">Главный герой</h4>
                <div className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Имя" 
                    className="mixer-input" 
                    value={formData.hero1_name} 
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      hero1_name: e.target.value
                    }))} 
                  />
                  
                  <div>
                    <label className="mixer-control-label block mb-2">
                      Описание героя
                    </label>
                    <textarea 
                      name="hero1_desc"
                      id="hero1_desc"
                      rows={4}
                      minLength={60}
                      maxLength={600}
                      placeholder="2–4 фразы: кто это, заметная деталь/предмет, маленькая цель или особенность поведения."
                      className="mixer-input resize-none"
                      value={formData.hero1_desc}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        hero1_desc: e.target.value
                      }))}
                    />
                  </div>
                  
                  <div>
                    <label className="mixer-control-label block mb-2">
                      Отношения
                    </label>
                    <textarea 
                      name="hero1_rel"
                      id="hero1_rel"
                      rows={3}
                      maxLength={300}
                      placeholder="Уточните отношения с другими героями. Например, Маша встречается с Олегом и дружит с Ирой."
                      className="mixer-input resize-none"
                      value={formData.hero1_rel}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        hero1_rel: e.target.value
                      }))}
                    />
                  </div>
                </div>
                
                {/* Photo Upload for Hero 1 */}
                <div className="mt-4">
                  <label className="mixer-control-label block mb-2">
                    Фото героя 1
                  </label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    className="hidden"
                    id="hero1-photo-input"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      // Validate file type
                      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
                        toast({
                          variant: "destructive",
                          title: "Неверный формат",
                          description: "Допустимы JPG/PNG до 3 МБ"
                        });
                        return;
                      }
                      
                      // Validate file size (3MB)
                      if (file.size > 3 * 1024 * 1024) {
                        toast({
                          variant: "destructive",
                          title: "Файл слишком большой",
                          description: "Допустимы JPG/PNG до 3 МБ"
                        });
                        return;
                      }
                      
                      // Store file and create preview URL
                      setFormData(prev => ({
                        ...prev,
                        hero1_photo: file,
                        hero1_photo_url: URL.createObjectURL(file)
                      }));
                    }}
                  />
                  <button
                    type="button"
                    className="mixer-input cursor-pointer hover:bg-accent/10 transition-colors"
                    onClick={() => document.getElementById('hero1-photo-input')?.click()}
                  >
                    Загрузить фото
                  </button>
                  <p className="mixer-hint mt-1">
                    Лучше всего — лицевая фотография, без фона/фильтров. Используется только для сохранения идентичности персонажа в иллюстрациях.
                  </p>
                  
                  {/* Preview */}
                  {formData.hero1_photo_url && (
                    <div className="mt-3 relative inline-block">
                      <img 
                        src={formData.hero1_photo_url} 
                        alt="Превью героя 1" 
                        className="w-32 h-32 object-cover rounded-md border-2 border-accent"
                      />
                      <button
                        type="button"
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center hover:bg-destructive/90"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          hero1_photo: null,
                          hero1_photo_url: ''
                        }))}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Heroes */}
              {[2, 3, 4].map(heroNum => {
              const heroKey = `hero${heroNum}` as keyof typeof heroSections;
              const isVisible = heroSections[heroKey];
              return <div key={heroNum} className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="mixer-hero-title">Герой {heroNum}</h4>
                      <div className={`mixer-toggle ${isVisible ? 'active' : ''}`} onClick={() => setHeroSections(prev => ({
                    ...prev,
                    [heroKey]: !prev[heroKey]
                  }))}>
                        <div className="mixer-toggle-handle" />
                      </div>
                    </div>
                    
                    {isVisible && <div className="mixer-hero-panel">
                        <div className="space-y-4">
                          <input 
                            type="text" 
                            placeholder="Имя" 
                            className="mixer-input" 
                            value={formData[`hero${heroNum}_name` as keyof FormData] as string} 
                            onChange={e => setFormData(prev => ({
                              ...prev,
                              [`hero${heroNum}_name`]: e.target.value
                            }))} 
                          />
                          
                          <div>
                            <label className="mixer-control-label block mb-2">
                              Описание героя
                            </label>
                            <textarea 
                              name={`hero${heroNum}_desc`}
                              id={`hero${heroNum}_desc`}
                              rows={4}
                              minLength={60}
                              maxLength={600}
                              placeholder="2–4 фразы: кто это, заметная деталь/предмет, маленькая цель или особенность поведения."
                              className="mixer-input resize-none"
                              value={formData[`hero${heroNum}_desc` as keyof FormData] as string}
                              onChange={e => setFormData(prev => ({
                                ...prev,
                                [`hero${heroNum}_desc`]: e.target.value
                              }))}
                            />
                          </div>
                          
                          <div>
                            <label className="mixer-control-label block mb-2">
                              Отношения
                            </label>
                            <textarea 
                              name={`hero${heroNum}_rel`}
                              id={`hero${heroNum}_rel`}
                              rows={3}
                              maxLength={300}
                              placeholder="Уточните отношения с другими героями. Например, Маша встречается с Олегом и дружит с Ирой."
                              className="mixer-input resize-none"
                              value={formData[`hero${heroNum}_rel` as keyof FormData] as string}
                              onChange={e => setFormData(prev => ({
                                ...prev,
                                [`hero${heroNum}_rel`]: e.target.value
                              }))}
                            />
                          </div>
                        </div>
                        
                        {/* Photo Upload */}
                        <div className="mt-4">
                          <label className="mixer-control-label block mb-2">
                            Фото героя {heroNum}
                          </label>
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png"
                            className="hidden"
                            id={`hero${heroNum}-photo-input`}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              
                              // Validate file type
                              if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
                                toast({
                                  variant: "destructive",
                                  title: "Неверный формат",
                                  description: "Допустимы JPG/PNG до 3 МБ"
                                });
                                return;
                              }
                              
                              // Validate file size (3MB)
                              if (file.size > 3 * 1024 * 1024) {
                                toast({
                                  variant: "destructive",
                                  title: "Файл слишком большой",
                                  description: "Допустимы JPG/PNG до 3 МБ"
                                });
                                return;
                              }
                              
                              // Store file and create preview URL
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
                          <p className="mixer-hint mt-1">
                            Лучше всего — лицевая фотография, без фона/фильтров. Используется только для сохранения идентичности персонажа в иллюстрациях.
                          </p>
                          
                          {/* Preview */}
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
                      </div>}
                  </div>;
            })}
            </div>
          </div>
        </div>

        {/* Submit Section */}
        <div className="mt-12 text-center mixer-panel">
          <button className="mixer-main-button text-2xl px-12 py-6 mb-4" onClick={handleSubmit} disabled={showLoader}>
            {showLoader ? 'Отправка...' : 'Создать сказку'}
          </button>
          
          <p className="mixer-subtitle mb-6">
            Время генерации 2–4 мин. PDF придёт на указанную почту.
          </p>
        </div>

        {/* Loader Modal */}
        {showLoader && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="mixer-modal-panel max-w-md text-center">
              <div className="mixer-loading-indicator" />
              <h3 className="text-xl font-semibold mixer-display-value mb-2">
                Задача отправлена
              </h3>
              <p className="mixer-subtitle">
                Обработка запроса...
              </p>
            </div>
          </div>}

        {/* Email Progress Overlay */}
        {showEmailOverlay && <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50" style={{
        display: 'block'
      }} aria-hidden="true" onClick={hideEmailOverlayHandler}>
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-lg mx-4 bg-[#111a22] text-[#eaf2f6] border border-[#1b2d3a] rounded-2xl shadow-2xl p-6" role="dialog" aria-modal="true" aria-labelledby="email-title" onClick={e => e.stopPropagation()}>
              <h3 id="email-title" className="text-2xl font-semibold mb-2 mixer-nameplate">
                Почти готово!
              </h3>
              <p className="mb-4 mixer-subtitle">
                Через несколько минут сказка окажется у вас на почте.
              </p>
              <div className="w-full h-3 border border-white/8 rounded-lg bg-white/8 overflow-hidden" aria-label="Загрузка">
                <div id="email-progress" className="h-full bg-gradient-to-r from-[#63d2ff] to-[#e6a648] transition-all duration-200 ease-linear" style={{
              width: '0%'
            }} />
              </div>
            </div>
          </div>}
      </div>
    </div>;
};
export default Index;