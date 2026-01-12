import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
  const {
    ref,
    isVisible
  } = useScrollReveal({
    threshold: 0.15
  });
  return <section ref={ref as React.RefObject<HTMLElement>} id={id} className={`${className} romantic-reveal ${isVisible ? 'romantic-reveal-visible' : ''}`} style={{
    transitionDelay: `${delay}ms`
  }}>
      {children}
    </section>;
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

  // Wave animation on scroll
  useEffect(() => {
    const waves = document.querySelectorAll('.romantic-wave-divider');
    const handleScroll = () => {
      waves.forEach((wave, index) => {
        const rect = wave.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        if (isVisible) {
          wave.classList.add('wave-animated');

          // Parallax effect based on scroll position
          const scrollProgress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
          const offset = (scrollProgress - 0.5) * 20;
          const svg = wave.querySelector('svg') as SVGElement;
          if (svg) {
            svg.style.transform = `translateX(-10%) translateY(${offset}px)`;
          }
        }
      });
    };
    window.addEventListener('scroll', handleScroll, {
      passive: true
    });
    handleScroll(); // Initial check

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

  const bookImages = [exampleAdventureCover, exampleAdventureSpread, exampleFantasyCover, exampleFantasySpread, exampleNewyearCover];

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
            <div className="cursor-pointer" onMouseEnter={() => setDragonHovered(true)} onMouseLeave={() => setDragonHovered(false)} onClick={() => setMenuOpen(!menuOpen)}>
              <img src={dragonHovered ? dragonHeaderHoverImage : dragonHeaderImage} alt="Menu" className="h-12 md:h-14 object-contain romantic-logo-filter transition-all duration-200" />
            </div>

            {menuOpen && <div className="romantic-menu absolute top-full right-0 mt-2 w-64 z-50">
                <div className="py-2">
                  <Link to="/" className="romantic-menu-item flex items-center gap-3 px-4 py-3 transition-colors" onClick={() => setMenuOpen(false)}>
                    <Home size={20} />
                    <span>Главная</span>
                  </Link>
                  
                  <button onClick={() => scrollToSection('romantic-how-it-works')} className="romantic-menu-item w-full flex items-center gap-3 px-4 py-3 transition-colors">
                    <BookOpen size={20} />
                    <span>Как это работает</span>
                  </button>

                  <button onClick={() => scrollToSection('romantic-examples')} className="romantic-menu-item w-full flex items-center gap-3 px-4 py-3 transition-colors">
                    <Sparkles size={20} />
                    <span>Примеры</span>
                  </button>

                  <button onClick={() => scrollToSection('romantic-faq')} className="romantic-menu-item w-full flex items-center gap-3 px-4 py-3 transition-colors">
                    <Mail size={20} />
                    <span>FAQ</span>
                  </button>

                  <div className="h-px bg-[#D99985]/30 my-2 mx-4" />

                  <Link to="/create" className="romantic-menu-item-accent flex items-center gap-3 px-4 py-3 transition-colors font-semibold" onClick={() => setMenuOpen(false)}>
                    <Scroll size={20} />
                    <span>Создать книгу</span>
                  </Link>
                </div>
              </div>}
          </div>
        </div>
      </header>

      {/* SCREEN 1: HERO with gradient and lava lamp effect */}
      <section className="romantic-hero-gradient min-h-[90vh] flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden">
        {/* Lava lamp bubbles */}
        <div className="romantic-lava-container">
          {/* Round bubbles */}
          <div className="romantic-bubble romantic-bubble-1" />
          <div className="romantic-bubble romantic-bubble-2" />
          <div className="romantic-bubble romantic-bubble-3" />
          <div className="romantic-bubble romantic-bubble-4" />
          <div className="romantic-bubble romantic-bubble-5" />
          <div className="romantic-bubble romantic-bubble-6" />
          <div className="romantic-bubble romantic-bubble-7" />
          <div className="romantic-bubble romantic-bubble-8" />
          
          {/* Heart-shaped bubbles */}
          <div className="romantic-heart romantic-heart-1">
            <svg viewBox="0 0 32 32" fill="currentColor">
              <path d="M16 28C16 28 3 18 3 10C3 5.58 6.58 2 11 2C13.76 2 16.22 3.41 17.5 5.59L16 8L14.5 5.59C15.78 3.41 18.24 2 21 2C25.42 2 29 5.58 29 10C29 18 16 28 16 28Z" />
            </svg>
          </div>
          <div className="romantic-heart romantic-heart-2">
            <svg viewBox="0 0 32 32" fill="currentColor">
              <path d="M16 28C16 28 3 18 3 10C3 5.58 6.58 2 11 2C13.76 2 16.22 3.41 17.5 5.59L16 8L14.5 5.59C15.78 3.41 18.24 2 21 2C25.42 2 29 5.58 29 10C29 18 16 28 16 28Z" />
            </svg>
          </div>
          <div className="romantic-heart romantic-heart-3">
            <svg viewBox="0 0 32 32" fill="currentColor">
              <path d="M16 28C16 28 3 18 3 10C3 5.58 6.58 2 11 2C13.76 2 16.22 3.41 17.5 5.59L16 8L14.5 5.59C15.78 3.41 18.24 2 21 2C25.42 2 29 5.58 29 10C29 18 16 28 16 28Z" />
            </svg>
          </div>
          <div className="romantic-heart romantic-heart-4">
            <svg viewBox="0 0 32 32" fill="currentColor">
              <path d="M16 28C16 28 3 18 3 10C3 5.58 6.58 2 11 2C13.76 2 16.22 3.41 17.5 5.59L16 8L14.5 5.59C15.78 3.41 18.24 2 21 2C25.42 2 29 5.58 29 10C29 18 16 28 16 28Z" />
            </svg>
          </div>
          <div className="romantic-heart romantic-heart-5">
            <svg viewBox="0 0 32 32" fill="currentColor">
              <path d="M16 28C16 28 3 18 3 10C3 5.58 6.58 2 11 2C13.76 2 16.22 3.41 17.5 5.59L16 8L14.5 5.59C15.78 3.41 18.24 2 21 2C25.42 2 29 5.58 29 10C29 18 16 28 16 28Z" />
            </svg>
          </div>
        </div>

        <div className={`max-w-2xl mx-auto text-center romantic-hero-content ${heroVisible ? 'romantic-hero-visible' : ''} relative z-10`}>
          <h1 className="romantic-h1 text-4xl md:text-5xl lg:text-6xl leading-tight mb-6 romantic-hero-title">
            Книга про вас двоих —
            <br />
            лучший подарок на 14 февраля.
          </h1>
          <p className="romantic-subtitle text-xl md:text-2xl mb-12 leading-relaxed romantic-hero-subtitle">
            история любви, где главные герои — вы
          </p>
          <button onClick={handleCreateClick} className="romantic-cta-primary text-lg md:text-xl px-10 py-5 transition-all duration-300 romantic-hero-cta">
            Создать книгу
          </button>
        </div>
      </section>

      {/* Wave divider: Hero → Section 2 */}
      <div className="romantic-wave-divider romantic-wave-to-warm">
        <svg viewBox="0 0 1200 150" preserveAspectRatio="none">
          <path d="M0,75 C150,150 300,0 450,75 C600,150 750,0 900,75 C1050,150 1200,0 1200,75 L1200,150 L0,150 Z" />
        </svg>
      </div>

      {/* SCREEN 2: WHAT IS IT */}
      <AnimatedSection className="romantic-section-warm py-16 md:py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <p className="romantic-text text-lg md:text-xl leading-relaxed mb-8">
            Fairyteller — это персональная романтическая история,
            <br className="hidden md:block" />
            созданная специально под вашу пару.
          </p>
          <div className="space-y-4 romantic-text text-lg">
            <p className="romantic-stagger-1">• вы вводите имена, детали, фото</p>
            <p className="romantic-stagger-2">• выбираете настроение и стиль иллюстраций</p>
            <p className="romantic-stagger-3">• получаете бумажную книгу</p>
          </div>
        </div>
      </AnimatedSection>

      {/* Wave divider: Section 2 → Section 3 */}
      <div className="romantic-wave-divider romantic-wave-to-light">
        <svg viewBox="0 0 1200 150" preserveAspectRatio="none">
          <path d="M0,50 C200,130 350,10 550,80 C750,150 950,20 1200,60 L1200,150 L0,150 Z" />
        </svg>
      </div>

      {/* SCREEN 3: PAIN → SOLUTION */}
      <AnimatedSection className="romantic-section-light py-16 md:py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="romantic-h2 text-2xl md:text-3xl mb-6">14 февраля — прекрасный повод, чтобы впечатлить партнера</h2>
          <p className="romantic-text text-lg md:text-xl leading-relaxed mb-10">
            Хочется подарить что-то значимое,
            <br className="hidden md:block" />
            а не очередную вещь «для галочки».
          </p>
          <div className="romantic-accent-block p-8 rounded-lg">
            <p className="text-lg md:text-xl leading-relaxed font-medium">
              Персональная книга — это жест.
              <br />
              Она станет вашим общим воспоминанием.
              <br />
              Её будут хранить и перечитывать.
            </p>
          </div>
        </div>
      </AnimatedSection>

      {/* Wave divider: Section 3 → Section 4 */}
      <div className="romantic-wave-divider romantic-wave-to-warm">
        <svg viewBox="0 0 1200 150" preserveAspectRatio="none">
          <path d="M0,100 C200,30 400,130 600,70 C800,10 1000,110 1200,60 L1200,150 L0,150 Z" />
        </svg>
      </div>

      {/* SCREEN 4: HOW THE BOOK LOOKS */}
      <AnimatedSection id="romantic-examples" className="romantic-section-warm py-16 md:py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            {bookImages.map((img, index) => (
              <div key={index} className="aspect-[3/4] overflow-hidden rounded-sm romantic-book-card" style={{
                transitionDelay: `${index * 100}ms`
              }}>
                <img src={img} alt={`Пример книги ${index + 1}`} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
              </div>
            ))}
          </div>
          <p className="romantic-caption text-center mt-8 text-sm">
            настоящая книга с иллюстрациями и историей
          </p>
        </div>
      </AnimatedSection>

      {/* Wave divider: Section 4 → Section 5 */}
      <div className="romantic-wave-divider romantic-wave-to-light">
        <svg viewBox="0 0 1200 150" preserveAspectRatio="none">
          <path d="M0,70 C150,140 350,20 550,90 C750,160 950,30 1200,80 L1200,150 L0,150 Z" />
        </svg>
      </div>

      {/* SCREEN 5: HOW IT WORKS */}
      <AnimatedSection id="romantic-how-it-works" className="romantic-section-light py-16 md:py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {[{
              num: "1",
              text: "Вы отвечаете на несколько вопросов"
            }, {
              num: "2",
              text: "Искусственный интеллект создает историю и иллюстрации"
            }, {
              num: "3",
              text: "Вы получаете книгу на почту, утверждаете ее, а мы — редактируем и отправляем в печать"
            }].map((step, index) => (
              <div key={index} className="text-center romantic-step-card" style={{
                transitionDelay: `${index * 150}ms`
              }} onMouseEnter={() => setHoveredStep(index)} onMouseLeave={() => setHoveredStep(null)}>
                <div className={`romantic-step-number text-4xl md:text-5xl font-serif mb-4 transition-all duration-300 ${hoveredStep === index ? "scale-110" : ""}`}>
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

      {/* Wave divider: Section 5 → Section 6 */}
      <div className="romantic-wave-divider romantic-wave-to-warm">
        <svg viewBox="0 0 1200 150" preserveAspectRatio="none">
          <path d="M0,60 C200,130 400,10 600,80 C800,150 1000,20 1200,90 L1200,150 L0,150 Z" />
        </svg>
      </div>

      {/* SCREEN 6: FOR WHOM */}
      <AnimatedSection className="romantic-section-warm py-16 md:py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <p className="romantic-text text-lg md:text-xl leading-relaxed mb-6">
            Для тех, кто хочет:
          </p>
          <div className="space-y-3 romantic-text text-lg md:text-xl">
            <p className="romantic-stagger-1">— удивить</p>
            <p className="romantic-stagger-2">— сделать личный подарок</p>
            <p className="romantic-stagger-3">— создать общие воспоминания</p>
          </div>
        </div>
      </AnimatedSection>

      {/* Wave divider: Section 6 → Section 7 (dark) */}
      <div className="romantic-wave-divider romantic-wave-to-dark">
        <svg viewBox="0 0 1200 150" preserveAspectRatio="none">
          <path d="M0,50 C150,120 350,0 550,70 C750,140 950,20 1200,80 L1200,150 L0,150 Z" />
        </svg>
      </div>

      {/* SCREEN 7: FINAL CTA */}
      <AnimatedSection className="romantic-section-dark py-20 md:py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="romantic-light-text text-2xl md:text-3xl lg:text-4xl leading-relaxed mb-12">
            ваша история — одна
            <br />
            сделайте из нее книгу
          </p>
          <button onClick={handleCreateClick} className="romantic-cta-secondary text-lg md:text-xl px-10 py-5 transition-all duration-300">
            Создать нашу книгу
          </button>
        </div>
      </AnimatedSection>

      {/* Wave divider: Section 7 → FAQ */}
      <div className="romantic-wave-divider romantic-wave-to-light">
        <svg viewBox="0 0 1200 150" preserveAspectRatio="none">
          <path d="M0,90 C200,20 400,130 600,60 C800,0 1000,110 1200,50 L1200,150 L0,150 Z" />
        </svg>
      </div>

      {/* FAQ */}
      <AnimatedSection id="romantic-faq" className="romantic-section-light py-16 md:py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="faq-1" className="romantic-faq-item border-none">
              <AccordionTrigger className="romantic-faq-trigger text-left text-lg hover:no-underline py-4">
                Это не будет кринжом?
              </AccordionTrigger>
              <AccordionContent className="romantic-faq-content text-base pb-4">
                Нет. Мы дообучили AI-модель и она создает прекрасные love story про уже сложившиеся пары. Сюжет — зависит от введенных вами параметров, но он будет легким, романтичным и искренним. Там не будет шаблонных фраз, а глупые ошибки, которые иногда делает искусственный интеллект, исправит во время редактуры живой редактор.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-2" className="romantic-faq-item border-none">
              <AccordionTrigger className="romantic-faq-trigger text-left text-lg hover:no-underline py-4">
                Подойдет ли как подарок мужчине / женщине?
              </AccordionTrigger>
              <AccordionContent className="romantic-faq-content text-base pb-4">
                Да. Это подарок в первую очередь для пары — в нем рассказана история про вас двоих и она подойдет каждому из вас. Сказка будет состоять из 6 персонифицированных иллюстраций и пяти глав, прочтение которых займет до получаса.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-3" className="romantic-faq-item border-none">
              <AccordionTrigger className="romantic-faq-trigger text-left text-lg hover:no-underline py-4">
                Как быстро книга будет готова?
              </AccordionTrigger>
              <AccordionContent className="romantic-faq-content text-base pb-4">
                PDF будет готов через несколько минут. Печатная версия — за несколько дней. Точные сроки доставки зависят от вашего города. Мы используем инфраструктуру 5Post и Почты России.
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
