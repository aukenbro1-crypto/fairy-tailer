import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Home, BookOpen, Sparkles, Mail, Scroll, Wand2, Star } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import RomanticStoryForm from "@/components/RomanticStoryForm";

import logoImage from "@/assets/logo.png";
import dragonHeaderImage from "@/assets/dragon-header.png";
import loveDragonImage from "@/assets/lovedragon-romantic.png";
import productFeaturesImage from "@/assets/product-features.png";
import bookHandsImage from "@/assets/romantic-book-cover-new.png";
import envelopeLetterImage from "@/assets/envelope-letter.png";
import bookAnimationGif from "@/assets/book-animation.gif";
import bookCoverRedImage from "@/assets/book-cover-red.png";
import hogwartsImage from "@/assets/hogwarts-magic.png";
import hogwartsHeroBg from "@/assets/hogwarts-hero-bg.jpg";

const AnimatedSection = ({
  children,
  className = "",
  delay = 0,
  id
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  id?: string;
}) => {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.15 });
  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      id={id}
      className={`${className} romantic-reveal ${isVisible ? 'romantic-reveal-visible' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </section>
  );
};

const Wizard = () => {
  const navigate = useNavigate();
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const [dragonHovered, setDragonHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);



  useEffect(() => {
    const waves = document.querySelectorAll('.wizard-wave-divider');
    const handleScroll = () => {
      waves.forEach((wave) => {
        const rect = wave.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        if (isVisible) {
          wave.classList.add('wave-animated');
          const scrollProgress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
          const offset = (scrollProgress - 0.5) * 20;
          const svg = wave.querySelector('svg') as SVGElement;
          if (svg) {
            svg.style.transform = `translateX(-10%) translateY(${offset}px)`;
          }
        }
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleCreateClick = () => {
    scrollToSection('wizard-form');
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMenuOpen(false);
    }
  };

  return (
    <div className="wizard-page min-h-screen relative">
      {/* Floating magical particles */}
      <div className="wizard-particles-container">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className={`wizard-particle wizard-particle-${(i % 8) + 1}`}>
            <svg width={4 + (i % 4) * 2} height={4 + (i % 4) * 2} viewBox="0 0 8 8">
              <circle cx="4" cy="4" r="3" fill={i % 3 === 0 ? '#FFD700' : i % 3 === 1 ? '#C4A35A' : '#FFF8DC'} opacity="0.9" />
            </svg>
          </div>
        ))}
      </div>

      {/* Floating stars */}
      <div className="wizard-stars-container">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={`wizard-star wizard-star-${(i % 6) + 1}`}>
            <svg width={8 + (i % 3) * 4} height={8 + (i % 3) * 4} viewBox="0 0 24 24" fill="none">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" 
                fill={i % 2 === 0 ? '#FFD700' : '#FFF8DC'} opacity={0.4 + (i % 3) * 0.2} />
            </svg>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="wizard-header sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Link to="/">
              <img src={logoImage} alt="FairyTeller" className="h-12 md:h-14 object-contain wizard-logo-filter" />
            </Link>
          </div>
          <div className="flex items-center relative" ref={menuRef}>
            <div className="cursor-pointer" onMouseEnter={() => setDragonHovered(true)} onMouseLeave={() => setDragonHovered(false)} onClick={() => setMenuOpen(!menuOpen)}>
              <img src={dragonHovered ? loveDragonImage : dragonHeaderImage} alt="Menu" className="h-12 md:h-14 object-contain wizard-logo-filter transition-all duration-200" />
            </div>

            {menuOpen && (
              <div className="wizard-menu absolute top-full right-0 mt-2 w-64 z-50">
                <div className="py-2">
                  <Link to="/" className="wizard-menu-item flex items-center gap-3 px-4 py-3 transition-colors" onClick={() => setMenuOpen(false)}>
                    <Home size={20} />
                    <span>Главная</span>
                  </Link>
                  <button onClick={() => scrollToSection('wizard-examples')} className="wizard-menu-item w-full flex items-center gap-3 px-4 py-3 transition-colors">
                    <Sparkles size={20} />
                    <span>Примеры</span>
                  </button>
                  <button onClick={() => scrollToSection('wizard-how-it-works')} className="wizard-menu-item w-full flex items-center gap-3 px-4 py-3 transition-colors">
                    <BookOpen size={20} />
                    <span>Как это работает</span>
                  </button>
                  <button onClick={() => scrollToSection('wizard-faq')} className="wizard-menu-item w-full flex items-center gap-3 px-4 py-3 transition-colors">
                    <Mail size={20} />
                    <span>FAQ</span>
                  </button>
                  <div className="h-px bg-[#FFD700]/30 my-2 mx-4" />
                  <button onClick={() => scrollToSection('wizard-form')} className="wizard-menu-item-accent w-full flex items-center gap-3 px-4 py-3 transition-colors font-semibold">
                    <Wand2 size={20} />
                    <span>Создать книгу</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* SCREEN 1: HERO */}
      <section className="wizard-hero-gradient wizard-hero-bg min-h-[90vh] flex flex-col items-center justify-center px-6 relative overflow-hidden py-[60px]" style={{ backgroundImage: `url(${hogwartsHeroBg})` }}>
        {/* Magic overlay */}
        <div className="wizard-magic-overlay" />

        {/* Flying broomstick riders */}
        <div className="wizard-broom wizard-broom-1">
          <svg width="60" height="40" viewBox="0 0 60 40" fill="none">
            <g opacity="0.6">
              {/* Person silhouette */}
              <circle cx="25" cy="10" r="5" fill="#1a1a2e"/>
              <path d="M20 15 Q25 13 30 15 L28 28 Q25 30 22 28 Z" fill="#1a1a2e"/>
              <path d="M20 18 L14 22" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round"/>
              <path d="M30 18 L36 14" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round"/>
              {/* Broom */}
              <line x1="10" y1="30" x2="50" y2="26" stroke="#8B6914" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M46 24 Q55 22 58 26 Q55 30 46 28 Z" fill="#8B6914" opacity="0.8"/>
              {/* Cape flutter */}
              <path d="M22 15 Q16 20 18 28" stroke="#1a1a2e" strokeWidth="1.5" fill="none"/>
            </g>
          </svg>
        </div>
        <div className="wizard-broom wizard-broom-2">
          <svg width="50" height="35" viewBox="0 0 60 40" fill="none">
            <g opacity="0.45" transform="scale(-1,1) translate(-60,0)">
              <circle cx="25" cy="10" r="5" fill="#1a1a2e"/>
              <path d="M20 15 Q25 13 30 15 L28 28 Q25 30 22 28 Z" fill="#1a1a2e"/>
              <path d="M20 18 L14 22" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round"/>
              <path d="M30 18 L36 14" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round"/>
              <line x1="10" y1="30" x2="50" y2="26" stroke="#8B6914" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M46 24 Q55 22 58 26 Q55 30 46 28 Z" fill="#8B6914" opacity="0.8"/>
            </g>
          </svg>
        </div>
        <div className="wizard-broom wizard-broom-3">
          <svg width="45" height="30" viewBox="0 0 60 40" fill="none">
            <g opacity="0.35">
              <circle cx="25" cy="10" r="5" fill="#1a1a2e"/>
              <path d="M20 15 Q25 13 30 15 L28 28 Q25 30 22 28 Z" fill="#1a1a2e"/>
              <path d="M20 18 L14 22" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round"/>
              <path d="M30 18 L36 14" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round"/>
              <line x1="10" y1="30" x2="50" y2="26" stroke="#8B6914" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M46 24 Q55 22 58 26 Q55 30 46 28 Z" fill="#8B6914" opacity="0.8"/>
            </g>
          </svg>
        </div>

        <div className="max-w-7xl mx-auto w-full flex flex-col items-end text-right wizard-hero-content wizard-hero-visible relative z-10">
          <div className="max-w-lg">
            <h1 className="wizard-h1 text-3xl md:text-4xl lg:text-5xl leading-tight mb-6 wizard-hero-title">
              Персональная книга<br/>в мире магии и волшебства
            </h1>
            <p className="wizard-subtitle text-xl md:text-2xl mb-12 leading-relaxed wizard-hero-subtitle">
              история, где герой — вы, а Хогвартс ждёт нового волшебника
            </p>
            <button onClick={handleCreateClick} className="wizard-cta-primary text-lg md:text-xl px-10 py-5 transition-all duration-300 wizard-hero-cta">
              Акцио книга!
            </button>
          </div>
        </div>
      </section>

      {/* Wave divider */}
      <div className="wizard-wave-divider wizard-wave-to-dark">
        <svg viewBox="0 0 1200 150" preserveAspectRatio="none">
          <path d="M0,75 C150,150 300,0 450,75 C600,150 750,0 900,75 C1050,150 1200,0 1200,75 L1200,150 L0,150 Z" />
        </svg>
      </div>

      {/* SCREEN 2: WHAT IS IT */}
      <AnimatedSection className="wizard-section-dark py-16 md:py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:gap-12 lg:gap-16">
            <div className="flex justify-center mb-8 md:mb-0 md:flex-shrink-0">
              <img src={hogwartsImage} alt="Мир магии" className="w-full max-w-[320px] sm:max-w-[380px] md:max-w-[420px] lg:max-w-[480px] h-auto drop-shadow-xl transition-transform duration-500 hover:scale-105 hover:rotate-1" />
            </div>
            <div className="flex-1">
              <p className="wizard-text text-lg md:text-xl leading-relaxed mb-8">
                FairyTeller создаст персональную историю в мире магии — с заклинаниями, волшебными существами и захватывающими приключениями.
              </p>
              <div className="space-y-4 wizard-text text-lg">
                <p className="wizard-stagger-1">🪄 вы вводите имя героя, детали и фото</p>
                <p className="wizard-stagger-2">⚗️ выбираете факультет и стиль иллюстраций</p>
                <p className="wizard-stagger-3">📖 получаете настоящую бумажную книгу</p>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Wave divider */}
      <div className="wizard-wave-divider wizard-wave-to-stone">
        <svg viewBox="0 0 1200 150" preserveAspectRatio="none">
          <path d="M0,50 C200,130 350,10 550,80 C750,150 950,20 1200,60 L1200,150 L0,150 Z" />
        </svg>
      </div>

      {/* SCREEN 3: PAIN → SOLUTION */}
      <AnimatedSection className="wizard-section-stone py-12 md:py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:gap-12 lg:gap-16">
            <div className="flex-1 mb-8 md:mb-0">
              <h2 className="wizard-h2 text-2xl md:text-3xl mb-4">Каждый мечтал получить письмо из Хогвартса</h2>
              <p className="wizard-text text-lg md:text-xl leading-relaxed">Подарите эту мечту — персональную книгу, где получатель станет главным героем магической истории.</p>
            </div>
            <div className="flex justify-center md:flex-shrink-0">
              <img src={envelopeLetterImage} alt="Письмо из Хогвартса" className="w-full max-w-[280px] sm:max-w-[320px] md:max-w-[360px] lg:max-w-[420px] h-auto drop-shadow-2xl transition-transform duration-500 hover:scale-105" style={{ filter: 'sepia(0.25) saturate(1.2) hue-rotate(15deg)' }} />
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Wave divider */}
      <div className="wizard-wave-divider wizard-wave-to-dark">
        <svg viewBox="0 0 1200 150" preserveAspectRatio="none">
          <path d="M0,100 C200,30 400,130 600,70 C800,10 1000,110 1200,60 L1200,150 L0,150 Z" />
        </svg>
      </div>

      {/* SCREEN 4: HOW THE BOOK LOOKS */}
      <AnimatedSection id="wizard-examples" className="wizard-section-dark py-16 md:py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 lg:gap-16">
            <div className="flex justify-center">
              <img src={bookCoverRedImage} alt="Обложка магической книги" className="h-[280px] md:h-[320px] lg:h-[380px] w-auto drop-shadow-2xl" />
            </div>
            <div className="flex justify-center">
              <img src={bookAnimationGif} alt="Анимация книги" className="h-[280px] md:h-[320px] lg:h-[380px] w-auto mix-blend-screen drop-shadow-2xl" />
            </div>
          </div>
          <p className="wizard-caption text-center mt-8 text-sm">
            настоящая книга с магическими иллюстрациями — <Link to="/book-preview" className="underline hover:opacity-80 transition-opacity">смотреть пример</Link>
          </p>
          <p className="wizard-caption text-center mt-2 text-sm">
            больше историй можно найти в нашем <a href="https://dzen.ru/fairyteller?share_to=link" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80 transition-opacity">Дзене</a>
          </p>
        </div>
      </AnimatedSection>

      {/* Wave divider */}
      <div className="wizard-wave-divider wizard-wave-to-stone">
        <svg viewBox="0 0 1200 150" preserveAspectRatio="none">
          <path d="M0,70 C150,140 350,20 550,90 C750,160 950,30 1200,80 L1200,150 L0,150 Z" />
        </svg>
      </div>

      {/* SCREEN 5: HOW IT WORKS */}
      <AnimatedSection id="wizard-how-it-works" className="wizard-section-stone py-16 md:py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-8">
            {[
              { num: "⚡", text: "Заполните форму — расскажите о герое и его характере" },
              { num: "🪄", text: "Искусственный интеллект создает магическую историю и иллюстрации" },
              { num: "🦉", text: "Получите книгу на почту, оплатите и утвердите" },
              { num: "📜", text: "Редактор проверит текст и отправит книгу в печать" },
              { num: "📖", text: "Готовая книга будет доставлена за несколько дней" },
            ].map((step, index) => (
              <div
                key={index}
                className={`text-center wizard-step-card ${index === 4 ? 'col-span-2 md:col-span-1' : ''}`}
                style={{ transitionDelay: `${index * 150}ms` }}
                onMouseEnter={() => setHoveredStep(index)}
                onMouseLeave={() => setHoveredStep(null)}
              >
                <div className={`wizard-step-number text-3xl md:text-4xl mb-3 transition-all duration-300 ${hoveredStep === index ? "scale-125" : ""}`}>
                  {step.num}
                </div>
                <p className="wizard-text text-sm md:text-base leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Wave divider */}
      <div className="wizard-wave-divider wizard-wave-to-dark">
        <svg viewBox="0 0 1200 150" preserveAspectRatio="none">
          <path d="M0,60 C200,130 400,10 600,80 C800,150 1000,20 1200,90 L1200,150 L0,150 Z" />
        </svg>
      </div>

      {/* SCREEN 6: FOR WHOM */}
      <AnimatedSection className="wizard-section-dark py-16 md:py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <p className="wizard-text text-lg md:text-xl leading-relaxed mb-6">
            Эта книга — для тех, кто:
          </p>
          <div className="space-y-3 wizard-text text-lg md:text-xl">
            <p className="wizard-stagger-1">⚡ мечтал получить письмо из Хогвартса</p>
            <p className="wizard-stagger-2">🧙 хочет стать героем магической истории</p>
            <p className="wizard-stagger-3">🎁 ищет необычный подарок для фаната волшебства</p>
          </div>
        </div>
      </AnimatedSection>

      {/* Wave divider */}
      <div className="wizard-wave-divider wizard-wave-to-stone">
        <svg viewBox="0 0 1200 150" preserveAspectRatio="none">
          <path d="M0,50 C150,120 350,0 550,70 C750,140 950,20 1200,80 L1200,150 L0,150 Z" />
        </svg>
      </div>

      {/* STORY FORM SECTION */}
      <AnimatedSection id="wizard-form" className="wizard-section-stone py-16 md:py-20 px-6 relative overflow-hidden">
        <div className="wizard-glow-pulse" />
        <div className="max-w-4xl mx-auto relative z-20">
          <div className="text-center mb-12">
            <h2 className="wizard-h2 text-2xl md:text-3xl lg:text-4xl mb-4">
              ⚡ Создайте магическую историю
            </h2>
            <p className="wizard-text text-lg md:text-xl">
              Заполните форму — и получите книгу на почту
            </p>
          </div>
          <RomanticStoryForm worldOverride="new_year" />
        </div>
      </AnimatedSection>

      {/* Wave divider */}
      <div className="wizard-wave-divider wizard-wave-to-dark">
        <svg viewBox="0 0 1200 150" preserveAspectRatio="none">
          <path d="M0,90 C200,20 400,130 600,60 C800,0 1000,110 1200,50 L1200,150 L0,150 Z" />
        </svg>
      </div>

      {/* FAQ */}
      <AnimatedSection id="wizard-faq" className="wizard-section-stone py-16 md:py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="faq-1" className="wizard-faq-item border-none">
              <AccordionTrigger className="wizard-faq-trigger text-left text-lg hover:no-underline py-4">
                Это будет настоящая история в мире магии?
              </AccordionTrigger>
              <AccordionContent className="wizard-faq-content text-base pb-4">
                Да! AI создаёт уникальную историю с заклинаниями, магическими существами, факультетами и захватывающими приключениями. Сюжет зависит от введённых вами параметров — имени, характера, предпочтений героя. Редактор исправит возможные ошибки перед печатью.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-2" className="wizard-faq-item border-none">
              <AccordionTrigger className="wizard-faq-trigger text-left text-lg hover:no-underline py-4">
                Нужно ли загружать фото?
              </AccordionTrigger>
              <AccordionContent className="wizard-faq-content text-base pb-4">
                Не обязательно, но если добавите фото — герои иллюстраций будут похожи на вас. Мы не сохраняем фотографии — они отправляются прямиком в модель генерации.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-3" className="wizard-faq-item border-none">
              <AccordionTrigger className="wizard-faq-trigger text-left text-lg hover:no-underline py-4">
                Что я получу?
              </AccordionTrigger>
              <AccordionContent className="wizard-faq-content text-base pb-4">
                PDF историю — бесплатно, в течение нескольких минут. После оплаты — настоящую печатную книгу с доставкой по всей России.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-4" className="wizard-faq-item border-none">
              <AccordionTrigger className="wizard-faq-trigger text-left text-lg hover:no-underline py-4">
                Как быстро будет готова книга?
              </AccordionTrigger>
              <AccordionContent className="wizard-faq-content text-base pb-4">
                PDF — через несколько минут. Печатная книга — за 1 день в типографии (Москва) + 2-5 рабочих дней доставка. Мы используем 5Post и Почту России.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-5" className="wizard-faq-item border-none">
              <AccordionTrigger className="wizard-faq-trigger text-left text-lg hover:no-underline py-4">
                Сколько стоит?
              </AccordionTrigger>
              <AccordionContent className="wizard-faq-content text-base pb-4">
                Стоимость готовой книги — 2 500₽ с учётом доставки. PDF можно получить бесплатно. Точнее можно уточнить в <a href="https://t.me/nikita0shch" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">чате поддержки</a>.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-6" className="wizard-faq-item border-none">
              <AccordionTrigger className="wizard-faq-trigger text-left text-lg hover:no-underline py-4">
                Есть другие миры кроме магии?
              </AccordionTrigger>
              <AccordionContent className="wizard-faq-content text-base pb-4">
                Да! FairyTeller — универсальный сервис. Можно создавать сказки для детей, приключения, фэнтези, романтические истории и киберпанк. Конструктор сказок — <a href="https://fairyteller.ru/create" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">по ссылке</a>.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </AnimatedSection>

      {/* Footer spacer */}
      <div className="wizard-section-dark h-16"></div>
    </div>
  );
};

export default Wizard;
