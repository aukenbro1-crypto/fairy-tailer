import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Home, BookOpen, Sparkles, Mail, Scroll } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

// Import logo and dragon
import logoImage from "@/assets/logo.png";
import dragonHeaderImage from "@/assets/dragon-header.png";
import dragonHeaderHoverImage from "@/assets/dragon-header-hover.png";

// Import book images
import exampleAdventureCover from "@/assets/example-adventure-cover.jpg";
import exampleAdventureSpread from "@/assets/example-adventure-spread.jpg";
import exampleFantasyCover from "@/assets/example-fantasy-cover.jpg";
import exampleFantasySpread from "@/assets/example-fantasy-spread.jpg";
import exampleNewyearCover from "@/assets/example-newyear-cover.jpg";

// Animated Section Component
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

const Romantic = () => {
  const navigate = useNavigate();
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const [dragonHovered, setDragonHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Hero animation on mount
  const [heroVisible, setHeroVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(timer);
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
    navigate("/create");
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      setMenuOpen(false);
    }
  };

  const bookImages = [
    exampleAdventureCover,
    exampleAdventureSpread,
    exampleFantasyCover,
    exampleFantasySpread,
    exampleNewyearCover,
  ];

  return (
    <div className="romantic-page min-h-screen">
      {/* Header */}
      <header className="romantic-header sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Link to="/">
              <img src={logoImage} alt="FairyTeller" className="h-12 md:h-14 object-contain romantic-logo-filter" />
            </Link>
          </div>
          <div className="flex items-center relative" ref={menuRef}>
            <div 
              className="cursor-pointer" 
              onMouseEnter={() => setDragonHovered(true)} 
              onMouseLeave={() => setDragonHovered(false)} 
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <img 
                src={dragonHovered ? dragonHeaderHoverImage : dragonHeaderImage} 
                alt="Menu" 
                className="h-12 md:h-14 object-contain romantic-logo-filter transition-all duration-200" 
              />
            </div>

            {menuOpen && (
              <div className="romantic-menu absolute top-full right-0 mt-2 w-64 z-50">
                <div className="py-2">
                  <Link 
                    to="/" 
                    className="romantic-menu-item flex items-center gap-3 px-4 py-3 transition-colors" 
                    onClick={() => setMenuOpen(false)}
                  >
                    <Home size={20} />
                    <span>Главная</span>
                  </Link>
                  
                  <button 
                    onClick={() => scrollToSection('romantic-how-it-works')} 
                    className="romantic-menu-item w-full flex items-center gap-3 px-4 py-3 transition-colors"
                  >
                    <BookOpen size={20} />
                    <span>Как это работает</span>
                  </button>

                  <button 
                    onClick={() => scrollToSection('romantic-examples')} 
                    className="romantic-menu-item w-full flex items-center gap-3 px-4 py-3 transition-colors"
                  >
                    <Sparkles size={20} />
                    <span>Примеры</span>
                  </button>

                  <button 
                    onClick={() => scrollToSection('romantic-faq')} 
                    className="romantic-menu-item w-full flex items-center gap-3 px-4 py-3 transition-colors"
                  >
                    <Mail size={20} />
                    <span>FAQ</span>
                  </button>

                  <div className="h-px bg-[#D99985]/30 my-2 mx-4" />

                  <Link 
                    to="/create" 
                    className="romantic-menu-item-accent flex items-center gap-3 px-4 py-3 transition-colors font-semibold" 
                    onClick={() => setMenuOpen(false)}
                  >
                    <Scroll size={20} />
                    <span>Создать книгу</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* SCREEN 1: HERO with gradient - animated on mount */}
      <section className="romantic-hero-gradient min-h-[90vh] flex flex-col items-center justify-center px-6 py-20">
        <div className={`max-w-2xl mx-auto text-center romantic-hero-content ${heroVisible ? 'romantic-hero-visible' : ''}`}>
          <h1 className="romantic-h1 text-4xl md:text-5xl lg:text-6xl leading-tight mb-6 romantic-hero-title">
            книга про вас двоих.
            <br />
            лучший подарок на 14 февраля.
          </h1>
          <p className="romantic-subtitle text-xl md:text-2xl mb-12 leading-relaxed romantic-hero-subtitle">
            история любви, где главные герои — вы
          </p>
          <button
            onClick={handleCreateClick}
            className="romantic-cta-primary text-lg md:text-xl px-10 py-5 transition-all duration-300 romantic-hero-cta"
          >
            Создать нашу книгу
          </button>
        </div>
      </section>

      {/* SCREEN 2: WHAT IS IT */}
      <AnimatedSection className="romantic-section-warm py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <p className="romantic-text text-lg md:text-xl leading-relaxed mb-8">
            Fairyteller — это персональная романтическая история,
            <br className="hidden md:block" />
            созданная специально под вашу пару.
          </p>
          <div className="space-y-4 romantic-text text-lg">
            <p className="romantic-stagger-1">• вы вводите имена, детали, фото</p>
            <p className="romantic-stagger-2">• выбираете мир и настроение</p>
            <p className="romantic-stagger-3">• получаете книгу — в PDF или в печати</p>
          </div>
        </div>
      </AnimatedSection>

      {/* SCREEN 3: PAIN → SOLUTION */}
      <AnimatedSection className="romantic-section-light py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="romantic-h2 text-2xl md:text-3xl mb-6">
            14 февраля — всегда стресс
          </h2>
          <p className="romantic-text text-lg md:text-xl leading-relaxed mb-10">
            Хочется подарить что-то значимое,
            <br className="hidden md:block" />
            а не очередную вещь «для галочки».
          </p>
          <div className="romantic-accent-block p-8 rounded-lg">
            <p className="text-lg md:text-xl leading-relaxed font-medium">
              Персональная книга — это жест.
              <br />
              Ее не передаривают.
              <br />
              Ее хранят.
            </p>
          </div>
        </div>
      </AnimatedSection>

      {/* SCREEN 4: HOW THE BOOK LOOKS */}
      <AnimatedSection id="romantic-examples" className="romantic-section-warm py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            {bookImages.map((img, index) => (
              <div 
                key={index} 
                className="aspect-[3/4] overflow-hidden rounded-sm romantic-book-card"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <img
                  src={img}
                  alt={`Пример книги ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
            ))}
          </div>
          <p className="romantic-caption text-center mt-8 text-sm">
            настоящая книга с иллюстрациями и историей
          </p>
        </div>
      </AnimatedSection>

      {/* SCREEN 5: HOW IT WORKS */}
      <AnimatedSection id="romantic-how-it-works" className="romantic-section-light py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {[
              { num: "1", text: "Вы отвечаете на несколько вопросов" },
              { num: "2", text: "История и иллюстрации создаются" },
              { num: "3", text: "Вы получаете книгу — сразу или в печати" },
            ].map((step, index) => (
              <div
                key={index}
                className="text-center romantic-step-card"
                style={{ transitionDelay: `${index * 150}ms` }}
                onMouseEnter={() => setHoveredStep(index)}
                onMouseLeave={() => setHoveredStep(null)}
              >
                <div
                  className={`romantic-step-number text-4xl md:text-5xl font-serif mb-4 transition-all duration-300 ${
                    hoveredStep === index ? "scale-110" : ""
                  }`}
                >
                  {step.num}
                </div>
                <p className="romantic-text text-base md:text-lg leading-relaxed">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* SCREEN 6: FOR WHOM */}
      <AnimatedSection className="romantic-section-warm py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <p className="romantic-text text-lg md:text-xl leading-relaxed mb-6">
            Для тех, кто хочет:
          </p>
          <div className="space-y-3 romantic-text text-lg md:text-xl">
            <p className="romantic-stagger-1">— удивить</p>
            <p className="romantic-stagger-2">— сделать личный подарок</p>
            <p className="romantic-stagger-3">— оставить след, а не просто отметить дату</p>
          </div>
        </div>
      </AnimatedSection>

      {/* SCREEN 7: FINAL CTA */}
      <AnimatedSection className="romantic-section-dark py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="romantic-light-text text-2xl md:text-3xl lg:text-4xl leading-relaxed mb-12">
            ваша история — одна
            <br />
            сделайте из нее книгу
          </p>
          <button
            onClick={handleCreateClick}
            className="romantic-cta-secondary text-lg md:text-xl px-10 py-5 transition-all duration-300"
          >
            Создать нашу книгу
          </button>
        </div>
      </AnimatedSection>

      {/* FAQ */}
      <AnimatedSection id="romantic-faq" className="romantic-section-light py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="faq-1" className="romantic-faq-item border-none">
              <AccordionTrigger className="romantic-faq-trigger text-left text-lg hover:no-underline py-4">
                Это не будет кринжом?
              </AccordionTrigger>
              <AccordionContent className="romantic-faq-content text-base pb-4">
                Нет. Книга получается искренней и теплой. Мы не добавляем шаблонные фразы — только то, что важно вам.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-2" className="romantic-faq-item border-none">
              <AccordionTrigger className="romantic-faq-trigger text-left text-lg hover:no-underline py-4">
                Подойдет ли как подарок мужчине / женщине?
              </AccordionTrigger>
              <AccordionContent className="romantic-faq-content text-base pb-4">
                Да. Это не «женский» или «мужской» подарок. Это история про вас двоих — она подходит каждому.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-3" className="romantic-faq-item border-none">
              <AccordionTrigger className="romantic-faq-trigger text-left text-lg hover:no-underline py-4">
                Это быстро?
              </AccordionTrigger>
              <AccordionContent className="romantic-faq-content text-base pb-4">
                PDF готов за минуты. Печатная версия — за несколько дней. Успеете к 14 февраля.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </AnimatedSection>

      {/* Footer spacer */}
      <div className="romantic-section-light h-16"></div>
    </div>
  );
};

export default Romantic;
