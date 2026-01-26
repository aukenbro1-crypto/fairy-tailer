import { Link } from "react-router-dom";
import { useState, useCallback } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Background images for sections
import heroBackground from "@/assets/indian/screen1-hero.png";
import howItWorksBackground from "@/assets/indian/screen2-how.png";
import examplesBackground from "@/assets/indian/screen3-examples.png";
import faqBackground from "@/assets/indian/screen4-faq.png";
import giftBackground from "@/assets/indian/screen5-gift.png";

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

// Example Carousel Card Component with Indian styling
const ExampleCarouselCard = ({ 
  images, 
  pdfLink, 
  index 
}: { 
  images: string[]; 
  pdfLink: string; 
  index: number;
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  
  return (
    <div className="relative group">
      {/* Ornate frame styling */}
      <div className="relative rounded-lg overflow-hidden border-4 border-amber-700/80 shadow-[inset_0_0_20px_rgba(0,0,0,0.5),0_8px_32px_rgba(0,0,0,0.4)]"
        style={{
          background: 'linear-gradient(135deg, #8B7355 0%, #6B5344 50%, #8B7355 100%)',
          padding: '3px',
        }}
      >
        <div className="bg-gradient-to-b from-amber-100/90 to-amber-50/80 rounded overflow-hidden">
          <div className="relative p-2">
            <div className="overflow-hidden rounded" ref={emblaRef}>
              <div className="flex">
                {images.map((img, idx) => (
                  <div key={idx} className="flex-[0_0_100%] min-w-0">
                    <div className="aspect-[4/5] overflow-hidden">
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
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-amber-900/70 text-amber-100 hover:bg-amber-800 transition-colors border border-amber-600/50"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={scrollNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-amber-900/70 text-amber-100 hover:bg-amber-800 transition-colors border border-amber-600/50"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
      
      {/* PDF Button - styled as Indian signboard */}
      <a 
        href={pdfLink} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block mt-4"
      >
        <div className="text-center py-3 px-4 rounded-lg border-2 border-amber-700/60 bg-gradient-to-b from-amber-200/90 to-amber-100/80 text-amber-900 font-serif font-semibold text-sm hover:from-amber-300/90 hover:to-amber-200/80 transition-all shadow-lg hover:shadow-xl hover:scale-105 duration-300"
          style={{ textShadow: '0 1px 0 rgba(255,255,255,0.5)' }}
        >
          Посмотреть пример PDF
        </div>
      </a>
    </div>
  );
};

// Volumetric Logo Component
const VolumetricLogo = () => (
  <div className="relative inline-block group">
    {/* Shadow layers for depth */}
    <div 
      className="absolute inset-0 blur-md opacity-50"
      style={{
        background: 'linear-gradient(180deg, #1a4a6b 0%, #0d2a3d 100%)',
        transform: 'translateY(8px) scaleY(0.95)',
        borderRadius: '12px',
      }}
    />
    
    {/* Main banner */}
    <div 
      className="relative px-8 md:px-16 py-3 md:py-5 rounded-xl"
      style={{
        background: 'linear-gradient(180deg, #2a5a7b 0%, #1a4a6b 30%, #0d3a55 70%, #082838 100%)',
        border: '4px solid #c9a227',
        boxShadow: `
          inset 0 2px 4px rgba(255,255,255,0.3),
          inset 0 -4px 8px rgba(0,0,0,0.4),
          0 8px 24px rgba(0,0,0,0.5),
          0 4px 8px rgba(0,0,0,0.3)
        `,
      }}
    >
      {/* Decorative corners */}
      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-8 bg-gradient-to-r from-amber-600 to-amber-500 rounded-l-full shadow-lg" 
        style={{ boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.3)' }}
      />
      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-8 bg-gradient-to-l from-amber-600 to-amber-500 rounded-r-full shadow-lg"
        style={{ boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.3)' }}
      />
      
      {/* Text with 3D effect */}
      <h1 
        className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-wider"
        style={{
          fontFamily: 'Georgia, serif',
          color: '#f4d03f',
          textShadow: `
            0 1px 0 #c9a227,
            0 2px 0 #b8922a,
            0 3px 0 #a7822d,
            0 4px 0 #967230,
            0 5px 8px rgba(0,0,0,0.5),
            0 0 20px rgba(244,208,63,0.3)
          `,
          letterSpacing: '0.05em',
        }}
      >
        FAIRYTELLER
      </h1>
    </div>
  </div>
);

// Volumetric CTA Button
const VolumetricCTAButton = () => (
  <Link to="/create" className="inline-block group">
    <div className="relative">
      {/* Shadow layer */}
      <div 
        className="absolute inset-0 rounded-lg opacity-60"
        style={{
          background: '#4a2810',
          transform: 'translateY(6px)',
          filter: 'blur(4px)',
        }}
      />
      
      {/* Main button */}
      <div 
        className="relative px-6 md:px-10 py-4 md:py-5 rounded-lg transition-all duration-300 group-hover:translate-y-[-2px] group-hover:shadow-2xl"
        style={{
          background: 'linear-gradient(180deg, #8B4513 0%, #6B3410 40%, #5a2a0d 70%, #4a200a 100%)',
          border: '3px solid #c9a227',
          boxShadow: `
            inset 0 2px 4px rgba(255,255,255,0.2),
            inset 0 -3px 6px rgba(0,0,0,0.4),
            0 6px 16px rgba(0,0,0,0.4),
            0 2px 4px rgba(0,0,0,0.2)
          `,
        }}
      >
        <div className="flex items-center gap-3">
          <span 
            className="text-lg md:text-2xl font-bold uppercase tracking-wide"
            style={{
              color: '#f4d03f',
              textShadow: `
                0 1px 0 #c9a227,
                0 2px 0 #b8922a,
                0 2px 4px rgba(0,0,0,0.5)
              `,
            }}
          >
            Создать сказку
          </span>
          <span 
            className="text-2xl md:text-3xl transition-transform duration-300 group-hover:translate-x-1"
            style={{ color: '#f4d03f' }}
          >
            →
          </span>
        </div>
      </div>
    </div>
  </Link>
);

// How It Works Card
const HowItWorksCard = ({ 
  step, 
  title, 
  subtitle 
}: { 
  step: number; 
  title: string; 
  subtitle: string;
}) => (
  <div 
    className="group cursor-default transition-all duration-500 hover:scale-105 hover:-translate-y-2"
  >
    <div 
      className="relative p-5 md:p-6 rounded-xl h-full"
      style={{
        background: 'linear-gradient(180deg, rgba(42,90,123,0.95) 0%, rgba(26,74,107,0.95) 50%, rgba(13,58,85,0.95) 100%)',
        border: '3px solid #c9a227',
        boxShadow: `
          inset 0 2px 4px rgba(255,255,255,0.15),
          inset 0 -4px 8px rgba(0,0,0,0.3),
          0 8px 24px rgba(0,0,0,0.4),
          0 4px 8px rgba(0,0,0,0.2)
        `,
      }}
    >
      {/* Corner ornaments */}
      <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-amber-500/60 rounded-tl" />
      <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-amber-500/60 rounded-tr" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-amber-500/60 rounded-bl" />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-amber-500/60 rounded-br" />
      
      {/* Content */}
      <div className="text-center space-y-3">
        <p 
          className="text-sm md:text-base font-serif leading-relaxed"
          style={{
            color: '#f5e6c8',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          }}
        >
          {title}
        </p>
        <p 
          className="text-xs md:text-sm font-serif opacity-80"
          style={{
            color: '#d4c4a8',
          }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  </div>
);

const Indian = () => {
  const exampleBooks = [
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
  ];

  const howItWorksSteps = [
    { title: "Придумай героя будущей сказки — добавь имя и фото", subtitle: "Имя Фото →" },
    { title: "Выбери мир, жанр и место действия", subtitle: "Фэнтези — Башня в лесу →" },
    { title: "Искусственный интеллект создаст материал и в течение 15 минут готовая сказка придет на email", subtitle: "Жили-были... →" },
    { title: "Оплатите заказ, мы отредактируем текст, напечатаем книгу вышлем по указанному адресу", subtitle: "Адрес ✓" },
  ];

  return (
    <div className="min-h-screen font-serif overflow-x-hidden" style={{ background: '#B8A898' }}>
      
      {/* SCREEN 1: HERO */}
      <section 
        className="relative w-full min-h-screen flex flex-col items-center justify-center py-16 md:py-24 px-4"
        style={{
          backgroundImage: `url(${heroBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-8 md:space-y-12 mt-8 md:mt-16">
          {/* Volumetric Logo */}
          <VolumetricLogo />
          
          {/* Spacer for visual breathing room */}
          <div className="h-4 md:h-8" />
          
          {/* Main tagline - invisible, content is in background */}
          <div className="h-32 md:h-48" />
          
          {/* CTA Button */}
          <div className="pt-4 md:pt-8">
            <VolumetricCTAButton />
          </div>
        </div>
      </section>

      {/* SCREEN 2: HOW IT WORKS */}
      <section 
        id="how-it-works"
        className="relative w-full py-20 md:py-32"
        style={{
          backgroundImage: `url(${howItWorksBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 pointer-events-none" />
        
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
          {/* Header spacer */}
          <div className="h-20 md:h-32" />
          
          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {howItWorksSteps.map((step, i) => (
              <HowItWorksCard 
                key={i} 
                step={i + 1} 
                title={step.title} 
                subtitle={step.subtitle} 
              />
            ))}
          </div>
          
          {/* Bottom spacer */}
          <div className="h-16 md:h-24" />
        </div>
      </section>

      {/* SCREEN 3: EXAMPLES */}
      <section 
        id="examples"
        className="relative w-full py-20 md:py-32"
        style={{
          backgroundImage: `url(${examplesBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none" />
        
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
          {/* Header spacer */}
          <div className="h-32 md:h-52" />
          
          {/* Interactive book examples */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 px-4 md:px-8">
            {exampleBooks.map((example, i) => (
              <ExampleCarouselCard 
                key={i} 
                images={example.images} 
                pdfLink={example.pdfLink} 
                index={i} 
              />
            ))}
          </div>
          
          {/* Bottom spacer */}
          <div className="h-20 md:h-32" />
        </div>
      </section>

      {/* SCREEN 4: WHO TO GIFT */}
      <section 
        id="gift"
        className="relative w-full min-h-screen flex items-center justify-center py-20 md:py-32"
        style={{
          backgroundImage: `url(${giftBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-8">
          {/* Content is in the background image */}
          <div className="min-h-[60vh]" />
          
          {/* CTA at bottom */}
          <div className="flex justify-center pb-8">
            <VolumetricCTAButton />
          </div>
        </div>
      </section>

      {/* SCREEN 5: FAQ */}
      <section 
        id="faq"
        className="relative w-full py-20 md:py-32"
        style={{
          backgroundImage: `url(${faqBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12">
          {/* Decorative header spacer */}
          <div className="h-28 md:h-44" />
          
          {/* FAQ Accordion */}
          <div className="space-y-3 md:space-y-4">
            <Accordion type="single" collapsible className="w-full">
              {[
                { value: "item-1", q: "Сколько стоит сказка?", a: "Полноценная бумажная книга стоит 2 500₽. В эту сумму входит печать, доставка до ПВЗ и финальная вычитка текста редактором." },
                { value: "item-2", q: "Как я получу сказку? Есть ли доставка?", a: "Сначала вы получаете PDF на почту в течение 10–20 минут. Если вам нравится результат, вы оплачиваете заказ. Через 5 рабочих дней книга будет доставлена в ближайший пункт выдачи 5Post (обычно это магазины «Пятерочка»)." },
                { value: "item-3", q: "Как работает конструктор?", a: "Вы заполняете параметры — герои, характеры, возраст, локацию, жанр, тон и стиль иллюстраций. Искусственный интеллект создает текст, генерирует иллюстрации и собирает все в аккуратный PDF из пяти глав. Если вы выбираете печать, перед отправкой в типографию текст вручную вычитывает редактор." },
                { value: "item-4", q: "Могу ли я добавить фотографий?", a: "Да. Фото делают героев похожими на вас и ваших близких. Мы используем только черты лица — фон не копируется. Фото не хранятся и не используются повторно." },
                { value: "item-5", q: "Насколько персональной будет история?", a: "На 100%. Даже при одинаковых параметрах истории получаются разными. Привычки, страхи, профессии и особенности героев органично вплетаются в сюжет." },
                { value: "item-6", q: "Можно указать абстрактные локации?", a: "Да. Конструктор одинаково хорошо работает с реальными адресами, районами и полностью абстрактными пространствами — «улица детства», «летний ветер», «желтый город»." },
                { value: "item-7", q: "Можно ли создавать истории для взрослых?", a: "Да. Вы сами выбираете жанр и тон — это могут быть романтические, философские, приключенческие или даже футуристические истории." },
                { value: "item-8", q: "Письмо не пришло — что делать?", a: "Проверьте папки «Спам» и «Промоакции». Если письма все же нет — напишите через форму обратной связи, и мы отправим PDF вручную." },
                { value: "item-9", q: "У меня остались вопросы, с кем связаться?", a: "Пишите в Telegram: @nikita0shch — мы поможем!" },
              ].map((item) => (
                <AccordionItem 
                  key={item.value}
                  value={item.value} 
                  className="border-0 mb-3 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(180deg, rgba(222,199,166,0.97) 0%, rgba(200,175,140,0.95) 100%)',
                    border: '3px solid rgba(139,115,85,0.6)',
                    boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.4), 0 4px 12px rgba(0,0,0,0.25)',
                  }}
                >
                  <AccordionTrigger className="text-amber-900 hover:text-amber-800 py-4 md:py-5 px-5 md:px-7 text-sm md:text-base font-serif font-semibold text-left [&[data-state=open]>svg]:text-amber-700 [&>svg]:text-amber-600 [&>svg]:w-5 [&>svg]:h-5">
                    ✦ {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-amber-900/90 text-sm md:text-base px-5 md:px-7 pb-5">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          
          {/* Bottom spacer */}
          <div className="h-20 md:h-32" />
        </div>
      </section>

      {/* Footer */}
      <footer 
        className="py-8 md:py-10 text-center"
        style={{
          background: 'linear-gradient(180deg, #9A8878 0%, #7A6858 100%)',
          borderTop: '4px solid rgba(139,115,85,0.7)',
        }}
      >
        <p className="text-amber-100/90 font-serif text-sm md:text-base">
          © 2026 FairyTeller. Все права защищены.
        </p>
      </footer>
    </div>
  );
};

export default Indian;
