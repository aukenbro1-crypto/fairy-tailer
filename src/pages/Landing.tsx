import { Link } from "react-router-dom";
import { useState, useEffect, useRef, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, BookOpen, Mail, Gift, Heart, Cake, Snowflake, User, Users, Home, Scroll, ChevronLeft, ChevronRight, ChevronDown, Newspaper } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import StoryConstructor from "@/components/StoryConstructor";

// Critical above-the-fold images - load immediately
import mascotImage from "@/assets/mascot-new.png";
import logoImage from "@/assets/logo.png";
import createButtonImage from "@/assets/create-button-new.png";
import dragonHeaderImage from "@/assets/dragon-header.png";
import dragonHeaderHoverImage from "@/assets/dragon-header-hover.png";
import romanticPromoImage from "@/assets/romantic-promo.jpg";

// Below-the-fold images - will be lazy loaded via native loading="lazy"
import heroSelectionImage from "@/assets/hero-selection.png";
import worldAtmosphereImage from "@/assets/world-atmosphere.png";
import aiWritingImage from "@/assets/ai-writing.png";
import readyStoryImage from "@/assets/ready-story.png";

// Example book images
import exampleAdventureCover from "@/assets/example-adventure-cover.jpg";
import exampleAdventureSpread from "@/assets/example-adventure-spread.jpg";
import exampleAdventureBack from "@/assets/example-adventure-back.jpg";
import exampleNewyearCover from "@/assets/example-newyear-cover.jpg";
import exampleNewyearSpread from "@/assets/example-newyear-spread.jpg";
import exampleNewyearBack from "@/assets/example-newyear-back.jpg";
import exampleFantasyCover from "@/assets/example-fantasy-cover.jpg";
import exampleFantasySpread from "@/assets/example-fantasy-spread.jpg";
import exampleFantasyBack from "@/assets/example-fantasy-back.jpeg";

// Example Carousel Card Component
const ExampleCarouselCard = ({ images, pdfLink, index }: { images: string[], pdfLink: string, index: number }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  
  return (
    <Card className="overflow-hidden bg-[#083248]/80 border border-[#E89C31]/20 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/20 transition-all duration-500 rounded-2xl">
      <div className="relative p-3">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-4">
            {images.map((img, idx) => (
              <div key={idx} className="flex-[0_0_100%] min-w-0 px-2">
                <div className="aspect-[3/4] rounded-lg overflow-hidden">
                  <img 
                    src={img} 
                    alt={`Пример книги ${index + 1} - фото ${idx + 1}`} 
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <button 
          onClick={scrollPrev}
          className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-[#031B28]/70 text-[#E89C31] hover:bg-[#031B28] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <button 
          onClick={scrollNext}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-[#031B28]/70 text-[#E89C31] hover:bg-[#031B28] transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <CardContent className="pt-4 pb-6 px-6">
        <a href={pdfLink} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="w-full border border-[#E89C31]/30 bg-[#E89C31]/10 text-[#E89C31] hover:bg-[#E89C31] hover:text-[#031B28] hover:scale-105 transition-all duration-500 py-7 rounded-xl font-medium">
            Посмотреть пример PDF
          </Button>
        </a>
      </CardContent>
    </Card>
  );
};

const FAQ_ITEMS = [
  { q: "Сколько стоит сказка?", a: "Полноценная бумажная книга стоит 2 500₽. В эту сумму входит печать, доставка до ПВЗ и финальная вычитка текста редактором." },
  { q: "Как я получу сказку? Есть ли доставка?", a: "Сначала вы получаете PDF на почту в течение 10–20 минут. Если вам нравится результат, вы оплачиваете заказ. Через 5 рабочих дней книга будет доставлена в ближайший пункт выдачи 5Post (обычно это магазины «Пятерочка»)." },
  { q: "Как работает конструктор?", a: "Вы заполняете параметры — герои, характеры, возраст, локацию, жанр, тон и стиль иллюстраций. Искусственный интеллект создает текст, генерирует иллюстрации и собирает все в аккуратный PDF из пяти глав. Если вы выбираете печать, перед отправкой в типографию текст вручную вычитывает редактор и исправляет досадные ошибки, допущенные искусственным интеллектом." },
  { q: "Могу ли я добавить фотографии?", a: "Да. Фото делают героев похожими на вас и ваших близких. Мы используем только черты лица — фон не копируется. Фото не хранятся и не используются повторно." },
  { q: "Насколько персональной будет история?", a: "На 100%. Даже при одинаковых параметрах истории получаются разными. Привычки, страхи, профессии и особенности героев органично вплетаются в сюжет." },
  { q: "Можно указать абстрактные локации — «улица детства», «летний ветер», «желтый город»?", a: "Да. Конструктор одинаково хорошо работает с реальными адресами, районами и полностью абстрактными пространствами." },
  { q: "Можно ли создавать истории для взрослых?", a: "Да. Вы сами выбираете жанр и тон — это могут быть романтические, философские, приключенческие или даже футуристические истории." },
  { q: "Письмо не пришло — что делать?", a: "Проверьте папки «Спам» и «Промоакции». Если письма все же нет — напишите через форму обратной связи, и мы отправим PDF вручную." },
  { q: "У меня оставались вопросы, с кем я могу связаться?", a: "Пишите в Telegram: @nikita0shch" },
];

const FaqAccordion = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => {
    setOpenIndex(prev => prev === i ? null : i);
  };

  return (
    <div className="max-w-3xl mx-auto bg-[#083248]/80 border border-[#E89C31]/20 rounded-2xl p-6 shadow-lg shadow-[#E89C31]/10" role="list">
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = openIndex === i;
        const panelId = `faq-panel-${i}`;
        const triggerId = `faq-trigger-${i}`;
        return (
          <div key={i} className={`${i < FAQ_ITEMS.length - 1 ? 'border-b border-[#E89C31]/20' : ''}`} role="listitem">
            <button
              id={triggerId}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(i)}
              className="flex w-full items-center justify-between py-5 text-lg text-left text-[#DBA858] hover:text-[#E89C31] transition-colors duration-500 font-medium"
            >
              <span>{item.q}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              className="overflow-hidden transition-all duration-300"
              style={{
                maxHeight: isOpen ? '500px' : '0px',
                opacity: isOpen ? 1 : 0,
              }}
            >
              <div className="pb-4 text-[#DBA858]/80 text-base text-left">
                {item.a}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Landing = () => {
  const [scrollY, setScrollY] = useState(0);
  const [dragonHovered, setDragonHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, {
      passive: true
    });
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
  const mascotTransform = `translateY(${scrollY * 0.15}px) rotate(${Math.sin(scrollY * 0.005) * 5}deg)`;
  return <div className="min-h-screen bg-gradient-to-br from-[#031B28] via-[#083248] to-[#0B2838] font-serif">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#031B28]/90 backdrop-blur-sm border-b border-[#E89C31]/20 shadow-lg shadow-[#E89C31]/10">
        <div className="container mx-auto px-4 py-5 flex justify-between items-center">
          <div className="flex items-center">
            <img src={logoImage} alt="FairyTeller" className="h-16 object-contain" />
          </div>
          
          {/* Romantic Valentine Promo - Center */}
          <Link to="/romantic" className="absolute left-1/2 -translate-x-1/2 hover:scale-105 transition-transform duration-300">
            <img src={romanticPromoImage} alt="Романтические сказки" className="h-28 md:h-32 object-contain drop-shadow-lg hover:drop-shadow-2xl" />
          </Link>
          
          <div className="flex items-center relative" ref={menuRef}>
            <div className="cursor-pointer" onMouseEnter={() => setDragonHovered(true)} onMouseLeave={() => setDragonHovered(false)} onClick={() => setMenuOpen(!menuOpen)}>
              <img src={dragonHovered ? dragonHeaderHoverImage : dragonHeaderImage} alt="Dragon Menu" className="h-16 object-contain transition-all duration-200" />
            </div>

            {menuOpen && <div className="absolute top-full right-0 mt-2 w-64 bg-[#031B28] border border-[#E89C31]/30 rounded-lg shadow-xl shadow-[#E89C31]/20 z-50 animate-fade-in">
                <div className="py-2">
                  <Link to="/" className="flex items-center gap-3 px-4 py-3 hover:bg-[#083248] transition-colors text-[#DBA858] hover:text-[#E89C31]" onClick={() => setMenuOpen(false)}>
                    <Home size={20} />
                    <span>Главная</span>
                  </Link>
                  
                  <button onClick={() => scrollToSection('how-it-works')} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#083248] transition-colors text-[#DBA858] hover:text-[#E89C31]">
                    <BookOpen size={20} />
                    <span>Как это работает</span>
                  </button>

                  <button onClick={() => scrollToSection('examples')} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#083248] transition-colors text-[#DBA858] hover:text-[#E89C31]">
                    <Sparkles size={20} />
                    <span>Примеры сказок</span>
                  </button>

                  <button onClick={() => scrollToSection('faq')} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#083248] transition-colors text-[#DBA858] hover:text-[#E89C31]">
                    <Mail size={20} />
                    <span>FAQ</span>
                  </button>

                  <Link to="/blog" className="flex items-center gap-3 px-4 py-3 hover:bg-[#083248] transition-colors text-[#DBA858] hover:text-[#E89C31]" onClick={() => setMenuOpen(false)}>
                    <Newspaper size={20} />
                    <span>Журнал</span>
                  </Link>

                  <div className="h-px bg-[#E89C31]/20 my-2 mx-4" />

                  <button onClick={() => scrollToSection('constructor')} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#083248] transition-colors text-[#E89C31] font-semibold">
                    <Scroll size={20} />
                    <span>Создать сказку</span>
                  </button>
                </div>
              </div>}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-8 md:py-20 relative overflow-visible min-h-[85vh] flex items-center">
        {/* Decorative Elements - Crescent Moon with Stars */}
        <div className="absolute top-16 right-[8%] md:right-[12%] w-28 h-28 md:w-36 md:h-36 animate-fade-in z-20 pointer-events-none" style={{
        animation: 'fade-in 1s ease-out',
        transform: 'scaleX(-1)'
      }}>
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_50px_rgba(245,232,209,0.6)]">
            <path d="M50,10 A40,40 0 1,0 50,90 A30,30 0 1,1 50,10" fill="#F5E8D1" opacity="0.95" stroke="#E8D9C3" strokeWidth="0.5" />
          </svg>
        </div>
        
        <div className="absolute top-12 right-[5%] md:right-[10%] text-yellow-200 text-xl animate-pulse" style={{
        animationDuration: '2s'
      }}>✦</div>
        <div className="absolute top-20 right-[15%] md:right-[18%] text-yellow-100 text-sm animate-pulse" style={{
        animationDuration: '3s',
        animationDelay: '0.5s'
      }}>✦</div>
        <div className="absolute top-8 right-[12%] md:right-[15%] text-yellow-200 text-base animate-pulse" style={{
        animationDuration: '2.5s',
        animationDelay: '1s'
      }}>✦</div>
        <div className="absolute top-28 right-[7%] md:right-[11%] text-yellow-100 text-xs animate-pulse" style={{
        animationDuration: '3.5s',
        animationDelay: '0.8s'
      }}>✦</div>
        <div className="absolute top-24 right-[17%] md:right-[20%] text-yellow-200 text-sm animate-pulse" style={{
        animationDuration: '2.8s',
        animationDelay: '1.5s'
      }}>✦</div>
        <div className="absolute top-14 right-[3%] md:right-[8%] text-yellow-100 text-base animate-pulse" style={{
        animationDuration: '3.2s',
        animationDelay: '0.3s'
      }}>✦</div>
        
        <div className="absolute bottom-0 left-0 w-full h-56 opacity-40 z-0">
          <svg viewBox="0 0 1200 200" className="w-full h-full" preserveAspectRatio="none">
            <path d="M0,100 Q200,20 400,80 T800,100 T1200,80 L1200,200 L0,200 Z" fill="#7EB3C9" opacity="0.25" />
            <path d="M0,120 Q300,40 500,100 T900,110 T1200,90 L1200,200 L0,200 Z" fill="#A8CFD9" opacity="0.35" />
          </svg>
        </div>
        
        <div className="grid md:grid-cols-[42%_58%] gap-12 items-center relative z-10 w-full">
          <div className="space-y-8 md:order-1 order-2 pt-8 pr-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-[#E89C31] text-center drop-shadow-[0_0_15px_rgba(232,156,49,0.3)]">
              Сказки, где ты — главный герой 
            </h1>
            <p className="text-xl text-[#DBA858] leading-relaxed">Создавай бумажные книги про себя и своих близких</p>
            <div className="pt-12 flex justify-end mr-20">
              <a href="#constructor" onClick={(e) => { e.preventDefault(); scrollToSection('constructor'); }}>
                <img src={createButtonImage} alt="Создать сказку" className="h-60 w-auto hover:scale-105 transition-all duration-300 cursor-pointer drop-shadow-lg hover:drop-shadow-2xl" />
              </a>
            </div>
          </div>
          <div className="flex justify-center md:justify-center md:order-2 order-1">
            <Link to="/" className="cursor-pointer">
              <img src={mascotImage} alt="FairyTeller - живая книжка с крыльями" className="h-64 w-64 md:h-72 md:w-72 lg:h-80 lg:w-80 object-contain transition-transform duration-300 ease-out hover:scale-105" style={{
              transform: `translate(1.5rem, 1.5rem) translateY(${Math.sin(scrollY * 0.005) * 40}px)`
            }} />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-[#0B2838]/60 py-16 border-y border-[#E89C31]/10">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-[#E89C31] drop-shadow-[0_0_15px_rgba(232,156,49,0.3)]">
            Как это работает
          </h2>
          <div className="overflow-x-auto pb-4 -mx-4 px-4">
            <div className="flex gap-6 min-w-max justify-center">
              <Card className="text-center bg-[#083248]/95 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/15 transition-all duration-300 border border-[#E89C31]/20 rounded-2xl overflow-hidden flex flex-col w-64">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-[#E89C31] text-lg font-bold mb-2 min-h-[56px] flex items-center justify-center">Придумай героя будущей сказки — добавь имя и фото</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-4 flex-1 flex flex-col">
                  <div className="mb-2 rounded-xl overflow-hidden flex justify-center items-end flex-1">
                    <img src={heroSelectionImage} alt="Выбор героя" className="w-40 h-40 object-contain" loading="lazy" decoding="async" />
                  </div>
                </CardContent>
              </Card>

              <Card className="text-center bg-[#083248]/95 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/15 transition-all duration-300 border border-[#E89C31]/20 rounded-2xl overflow-hidden flex flex-col w-64">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-[#E89C31] text-lg font-bold mb-2 min-h-[56px] flex items-center justify-center">Выбери мир, жанр и место действия</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-4 flex-1 flex flex-col">
                  <div className="mb-2 rounded-xl overflow-hidden flex justify-center items-end flex-1">
                    <img src={worldAtmosphereImage} alt="Мир и атмосфера" className="w-40 h-40 object-contain" loading="lazy" decoding="async" />
                  </div>
                </CardContent>
              </Card>

              <Card className="text-center bg-[#083248]/95 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/15 transition-all duration-300 border border-[#E89C31]/20 rounded-2xl overflow-hidden flex flex-col w-64">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-[#E89C31] text-lg font-bold mb-2 min-h-[56px] flex items-center justify-center">Искусственный интеллект создаст материал и в течение 15 минут готовая сказка придет на email</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-4 flex-1 flex flex-col">
                  <div className="mb-2 rounded-xl overflow-hidden flex justify-center items-end flex-1">
                    <img src={aiWritingImage} alt="ИИ пишет историю" className="w-40 h-40 object-contain" loading="lazy" decoding="async" />
                  </div>
                </CardContent>
              </Card>

              <Card className="text-center bg-[#083248]/95 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/15 transition-all duration-300 border border-[#E89C31]/20 rounded-2xl overflow-hidden flex flex-col w-64">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-[#E89C31] text-lg font-bold mb-2 min-h-[56px] flex items-center justify-center">Оплатите заказ, мы отредактируем текст, напечатаем книгу и вышлем по указанному адресу</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-4 flex-1 flex flex-col">
                  <div className="mb-2 rounded-xl overflow-hidden flex justify-center items-end flex-1">
                    <img src={readyStoryImage} alt="Готовая сказка" className="w-40 h-40 object-contain" loading="lazy" decoding="async" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Story Constructor - embedded */}
      <section id="constructor" className="py-16 mixer-desk-bg">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-[#E89C31] drop-shadow-[0_0_15px_rgba(232,156,49,0.3)]">
            Создай свою сказку прямо сейчас
          </h2>
          <StoryConstructor showHeader={false} />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-[#E89C31] drop-shadow-[0_0_15px_rgba(232,156,49,0.3)]">
          Частые вопросы
        </h2>
        <FaqAccordion />
      </section>

      {/* Examples Section */}
      <section id="examples" className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#E89C31] drop-shadow-[0_0_15px_rgba(232,156,49,0.3)]">
            Как выглядят готовые сказки
          </h2>
          <p className="text-xl text-[#DBA858]">
            Вот как выглядят страницы с иллюстрациями и фрагментами текста.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              images: [exampleAdventureSpread, exampleAdventureCover, exampleAdventureBack],
              pdfLink: "https://docs.google.com/presentation/d/1DkayCET9ZvFRzOiHPAGPNrapY0TKgGKzhJx47539SKY/edit?slide=id.g3a78a44d4fe_2_0#slide=id.g3a78a44d4fe_2_0"
            },
            {
              images: [exampleNewyearCover, exampleNewyearSpread, exampleNewyearBack],
              pdfLink: "https://docs.google.com/presentation/d/1A2sQEaDfgFYUu1HDs60KynaAwVnPePFl54smyMJq704/edit?slide=id.g39dc5d58b83_0_251#slide=id.g39dc5d58b83_0_251"
            },
            {
              images: [exampleFantasyBack, exampleFantasyCover, exampleFantasySpread],
              pdfLink: "https://docs.google.com/presentation/d/1-F0OKE2hrSIAvms7DOsXRDkNfJWyxky7NJlImG0QgFc/edit?slide=id.g3b0f300bfe7_0_0#slide=id.g3b0f300bfe7_0_0"
            }
          ].map((example, i) => (
            <ExampleCarouselCard key={i} images={example.images} pdfLink={example.pdfLink} index={i} />
          ))}
        </div>
      </section>

      {/* Use Cases - Кому подарить */}
      <section className="bg-[#0B2838]/60 py-16 border-y border-[#E89C31]/10">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-[#E89C31] drop-shadow-[0_0_15px_rgba(232,156,49,0.3)]">Кому подарить?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="bg-[#083248]/80 border border-[#E89C31]/20 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/20 transition-all duration-500 rounded-2xl">
              <CardHeader className="p-6">
                <div className="flex items-center gap-4 mb-2">
                  <Heart className="h-9 w-9 text-[#8C0E0F]" />
                  <CardTitle className="text-lg text-[#DBA858]">Подарок любимому человеку</CardTitle>
                </div>
                <CardDescription className="text-[#DBA858]/70">История, в которой ваши общие воспоминания или события превращаются в магию.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-[#083248]/80 border border-[#E89C31]/20 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/20 transition-all duration-500 rounded-2xl">
              <CardHeader className="p-6">
                <div className="flex items-center gap-4 mb-2">
                  <Cake className="h-9 w-9 text-[#E89C31]" />
                  <CardTitle className="text-lg text-[#DBA858]">Детский День Рождения</CardTitle>
                </div>
                <CardDescription className="text-[#DBA858]/70">Персональная сказка, где ребенок — главный герой.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-[#083248]/80 border border-[#E89C31]/20 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/20 transition-all duration-500 rounded-2xl">
              <CardHeader className="p-6">
                <div className="flex items-center gap-4 mb-2">
                  <Snowflake className="h-9 w-9 text-[#DBA858]" />
                  <CardTitle className="text-lg text-[#DBA858]">Новогодняя семейная сказка</CardTitle>
                </div>
                <CardDescription className="text-[#DBA858]/70">Тёплая история, которую приятно читать зимой всей семьей.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-[#083248]/80 border border-[#E89C31]/20 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/20 transition-all duration-500 rounded-2xl">
              <CardHeader className="p-6">
                <div className="flex items-center gap-4 mb-2">
                  <User className="h-9 w-9 text-[#E89C31]" />
                  <CardTitle className="text-lg text-[#DBA858]">История «про себя» в важный или непростой период</CardTitle>
                </div>
                <CardDescription className="text-[#DBA858]/70">Сильная, поддерживающая история, написанная специально под ваш контекст.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-[#083248]/80 border border-[#E89C31]/20 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/20 transition-all duration-500 rounded-2xl">
              <CardHeader className="p-6">
                <div className="flex items-center gap-4 mb-2">
                  <Users className="h-9 w-9 text-[#DBA858]" />
                  <CardTitle className="text-lg text-[#DBA858]">Семейная история про вас и близких</CardTitle>
                </div>
                <CardDescription className="text-[#DBA858]/70">Сюжет, который объединяет поколения и сохраняет память.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-[#083248]/80 border border-[#E89C31]/20 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/20 transition-all duration-500 rounded-2xl">
              <CardHeader className="p-6">
                <div className="flex items-center gap-4 mb-2">
                  <Gift className="h-9 w-9 text-[#8C0E0F]" />
                  <CardTitle className="text-lg text-[#DBA858]">Особенный подарок другу или коллеге</CardTitle>
                </div>
                <CardDescription className="text-[#DBA858]/70">Когда хочется по-настоящему личного и значимого.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-[#083248] via-[#0B2838] to-[#031B28] py-20 border-t border-[#E89C31]/20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-[#E89C31] drop-shadow-[0_0_15px_rgba(232,156,49,0.3)]">
            Попробуйте создать свою сказку прямо сейчас
          </h2>
          <p className="text-xl text-[#DBA858] mb-10 max-w-2xl mx-auto leading-relaxed">
            Заполните несколько полей — и получите историю, где герои и события будут связаны с вашей жизнью.
          </p>
          <a href="#constructor" onClick={(e) => { e.preventDefault(); scrollToSection('constructor'); }}>
            <img src={createButtonImage} alt="Создать сказку" className="h-24 w-auto hover:scale-105 transition-all duration-300 cursor-pointer drop-shadow-2xl hover:drop-shadow-[0_0_40px_rgba(232,156,49,0.6)] mx-auto" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#031B28] border-t border-[#E89C31]/20 py-10">
        <div className="container mx-auto px-4 text-center text-[#DBA858]">
          <p className="text-lg">© 2026 FairyTeller. Создаем персональные истории с любовью.</p>
        </div>
      </footer>
    </div>;
};
export default Landing;