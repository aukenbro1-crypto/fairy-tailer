import { Link } from "react-router-dom";
import { useState, useRef, useEffect, useCallback } from "react";
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

// Indian-style section wrapper
const IndianSection = ({ 
  children, 
  backgroundImage, 
  className = "",
  id
}: { 
  children: React.ReactNode; 
  backgroundImage: string;
  className?: string;
  id?: string;
}) => (
  <section 
    id={id}
    className={`relative w-full min-h-screen flex items-center justify-center py-8 md:py-16 ${className}`}
    style={{
      backgroundImage: `url(${backgroundImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }}
  >
    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 pointer-events-none" />
    <div className="relative z-10 w-full max-w-6xl mx-auto px-4">
      {children}
    </div>
  </section>
);

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
        className="block mt-3"
      >
        <div className="text-center py-2 px-4 rounded border-2 border-amber-700/60 bg-gradient-to-b from-amber-200/90 to-amber-100/80 text-amber-900 font-serif font-semibold text-sm hover:from-amber-300/90 hover:to-amber-200/80 transition-all shadow-md hover:shadow-lg"
          style={{ textShadow: '0 1px 0 rgba(255,255,255,0.5)' }}
        >
          Посмотреть пример PDF
        </div>
      </a>
    </div>
  );
};

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

  return (
    <div className="min-h-screen font-serif overflow-x-hidden" style={{ background: '#B8A898' }}>
      
      {/* SCREEN 1: HERO */}
      <IndianSection backgroundImage={heroBackground}>
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
          {/* Invisible clickable CTA area over the "Создать сказку" button position */}
          <Link 
            to="/create"
            className="absolute bottom-[15%] right-[10%] md:bottom-[18%] md:right-[15%] w-48 h-20 md:w-64 md:h-24 cursor-pointer z-20 hover:scale-105 transition-transform"
            aria-label="Создать сказку"
          />
        </div>
      </IndianSection>

      {/* SCREEN 2: HOW IT WORKS */}
      <IndianSection backgroundImage={howItWorksBackground} id="how-it-works">
        <div className="min-h-[80vh]">
          {/* Content is in the background image */}
        </div>
      </IndianSection>

      {/* SCREEN 3: EXAMPLES - with real interactive content */}
      <section 
        id="examples"
        className="relative w-full py-12 md:py-20"
        style={{
          backgroundImage: `url(${examplesBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none" />
        
        <div className="relative z-10 max-w-6xl mx-auto px-4">
          {/* Spacer for the header in background image */}
          <div className="h-32 md:h-48" />
          
          {/* Interactive book examples */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 px-4 md:px-12">
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
          <div className="h-16 md:h-24" />
        </div>
      </section>

      {/* SCREEN 4: WHO TO GIFT */}
      <IndianSection backgroundImage={giftBackground} id="gift">
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          {/* CTA button area */}
          <Link 
            to="/create"
            className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-72 h-16 md:w-96 md:h-20 cursor-pointer z-20 hover:scale-105 transition-transform"
            aria-label="Создать свою сказку"
          />
        </div>
      </IndianSection>

      {/* SCREEN 5: FAQ - with real accordion */}
      <section 
        id="faq"
        className="relative w-full py-12 md:py-20"
        style={{
          backgroundImage: `url(${faqBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-16">
          {/* Spacer for the decorative header */}
          <div className="h-24 md:h-36" />
          
          {/* FAQ Accordion - styled to match Indian aesthetic */}
          <div className="space-y-2 md:space-y-3">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem 
                value="item-1" 
                className="border-0 mb-2 rounded-lg overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(222,199,166,0.95) 0%, rgba(200,175,140,0.9) 100%)',
                  border: '2px solid rgba(139,115,85,0.5)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.2)',
                }}
              >
                <AccordionTrigger className="text-amber-900 hover:text-amber-800 py-3 md:py-4 px-4 md:px-6 text-sm md:text-base font-serif font-semibold text-left [&[data-state=open]>svg]:text-amber-700 [&>svg]:text-amber-600 [&>svg]:w-5 [&>svg]:h-5">
                  ✦ Сколько стоит сказка?
                </AccordionTrigger>
                <AccordionContent className="text-amber-900/90 text-sm md:text-base px-4 md:px-6 pb-4">
                  Полноценная бумажная книга стоит 2 500₽. В эту сумму входит печать, доставка до ПВЗ и финальная вычитка текста редактором.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem 
                value="item-2" 
                className="border-0 mb-2 rounded-lg overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(222,199,166,0.95) 0%, rgba(200,175,140,0.9) 100%)',
                  border: '2px solid rgba(139,115,85,0.5)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.2)',
                }}
              >
                <AccordionTrigger className="text-amber-900 hover:text-amber-800 py-3 md:py-4 px-4 md:px-6 text-sm md:text-base font-serif font-semibold text-left [&[data-state=open]>svg]:text-amber-700 [&>svg]:text-amber-600 [&>svg]:w-5 [&>svg]:h-5">
                  ✦ Как я получу сказку? Есть ли доставка?
                </AccordionTrigger>
                <AccordionContent className="text-amber-900/90 text-sm md:text-base px-4 md:px-6 pb-4">
                  Сначала вы получаете PDF на почту в течение 10–20 минут. Если вам нравится результат, вы оплачиваете заказ. Срок изготовления книги — 1 день, наша типография располагается в Москве. В течение 2-5 рабочих дней, в зависимости от региона, книга будет доставлена в ближайший пункт выдачи 5Post (обычно это магазины «Пятерочка»).
                </AccordionContent>
              </AccordionItem>

              <AccordionItem 
                value="item-3" 
                className="border-0 mb-2 rounded-lg overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(222,199,166,0.95) 0%, rgba(200,175,140,0.9) 100%)',
                  border: '2px solid rgba(139,115,85,0.5)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.2)',
                }}
              >
                <AccordionTrigger className="text-amber-900 hover:text-amber-800 py-3 md:py-4 px-4 md:px-6 text-sm md:text-base font-serif font-semibold text-left [&[data-state=open]>svg]:text-amber-700 [&>svg]:text-amber-600 [&>svg]:w-5 [&>svg]:h-5">
                  ✦ Как работает конструктор?
                </AccordionTrigger>
                <AccordionContent className="text-amber-900/90 text-sm md:text-base px-4 md:px-6 pb-4">
                  Вы заполняете параметры — герои, характеры, возраст, локацию, жанр, тон и стиль иллюстраций. Искусственный интеллект создает текст, генерирует иллюстрации и собирает все в аккуратный PDF из пяти глав. Если вы выбираете печать, перед отправкой в типографию текст вручную вычитывает редактор и исправляет досадные ошибки, допущенные искусственным интеллектом.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem 
                value="item-4" 
                className="border-0 mb-2 rounded-lg overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(222,199,166,0.95) 0%, rgba(200,175,140,0.9) 100%)',
                  border: '2px solid rgba(139,115,85,0.5)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.2)',
                }}
              >
                <AccordionTrigger className="text-amber-900 hover:text-amber-800 py-3 md:py-4 px-4 md:px-6 text-sm md:text-base font-serif font-semibold text-left [&[data-state=open]>svg]:text-amber-700 [&>svg]:text-amber-600 [&>svg]:w-5 [&>svg]:h-5">
                  ✦ Могу ли я добавить фотографий?
                </AccordionTrigger>
                <AccordionContent className="text-amber-900/90 text-sm md:text-base px-4 md:px-6 pb-4">
                  Да. Фото делают героев похожими на вас и ваших близких. Мы используем только черты лица — фон не копируется. Фото не хранятся и не используются повторно.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem 
                value="item-5" 
                className="border-0 mb-2 rounded-lg overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(222,199,166,0.95) 0%, rgba(200,175,140,0.9) 100%)',
                  border: '2px solid rgba(139,115,85,0.5)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.2)',
                }}
              >
                <AccordionTrigger className="text-amber-900 hover:text-amber-800 py-3 md:py-4 px-4 md:px-6 text-sm md:text-base font-serif font-semibold text-left [&[data-state=open]>svg]:text-amber-700 [&>svg]:text-amber-600 [&>svg]:w-5 [&>svg]:h-5">
                  ✦ Насколько персональной будет история?
                </AccordionTrigger>
                <AccordionContent className="text-amber-900/90 text-sm md:text-base px-4 md:px-6 pb-4">
                  На 100%. Даже при одинаковых параметрах истории получаются разными. Привычки, страхи, профессии и особенности героев органично вплетаются в сюжет.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem 
                value="item-6" 
                className="border-0 mb-2 rounded-lg overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(222,199,166,0.95) 0%, rgba(200,175,140,0.9) 100%)',
                  border: '2px solid rgba(139,115,85,0.5)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.2)',
                }}
              >
                <AccordionTrigger className="text-amber-900 hover:text-amber-800 py-3 md:py-4 px-4 md:px-6 text-sm md:text-base font-serif font-semibold text-left [&[data-state=open]>svg]:text-amber-700 [&>svg]:text-amber-600 [&>svg]:w-5 [&>svg]:h-5">
                  ✦ Можно указать абстрактные локации — «улица детства», «летний ветер», «желтый город»?
                </AccordionTrigger>
                <AccordionContent className="text-amber-900/90 text-sm md:text-base px-4 md:px-6 pb-4">
                  Да. Конструктор одинаково хорошо работает с реальными адресами, районами и полностью абстрактными пространствами.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem 
                value="item-7" 
                className="border-0 mb-2 rounded-lg overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(222,199,166,0.95) 0%, rgba(200,175,140,0.9) 100%)',
                  border: '2px solid rgba(139,115,85,0.5)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.2)',
                }}
              >
                <AccordionTrigger className="text-amber-900 hover:text-amber-800 py-3 md:py-4 px-4 md:px-6 text-sm md:text-base font-serif font-semibold text-left [&[data-state=open]>svg]:text-amber-700 [&>svg]:text-amber-600 [&>svg]:w-5 [&>svg]:h-5">
                  ✦ Можно ли создавать истории для взрослых?
                </AccordionTrigger>
                <AccordionContent className="text-amber-900/90 text-sm md:text-base px-4 md:px-6 pb-4">
                  Да. Вы сами выбираете жанр и тон — это могут быть романтические, философские, приключенческие или даже футуристические истории.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem 
                value="item-8" 
                className="border-0 mb-2 rounded-lg overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(222,199,166,0.95) 0%, rgba(200,175,140,0.9) 100%)',
                  border: '2px solid rgba(139,115,85,0.5)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.2)',
                }}
              >
                <AccordionTrigger className="text-amber-900 hover:text-amber-800 py-3 md:py-4 px-4 md:px-6 text-sm md:text-base font-serif font-semibold text-left [&[data-state=open]>svg]:text-amber-700 [&>svg]:text-amber-600 [&>svg]:w-5 [&>svg]:h-5">
                  ✦ Письмо не пришло — что делать?
                </AccordionTrigger>
                <AccordionContent className="text-amber-900/90 text-sm md:text-base px-4 md:px-6 pb-4">
                  Проверьте папки «Спам» и «Промоакции». Если письма все же нет — напишите через форму обратной связи, и мы отправим PDF вручную.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem 
                value="item-9" 
                className="border-0 mb-2 rounded-lg overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(222,199,166,0.95) 0%, rgba(200,175,140,0.9) 100%)',
                  border: '2px solid rgba(139,115,85,0.5)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.2)',
                }}
              >
                <AccordionTrigger className="text-amber-900 hover:text-amber-800 py-3 md:py-4 px-4 md:px-6 text-sm md:text-base font-serif font-semibold text-left [&[data-state=open]>svg]:text-amber-700 [&>svg]:text-amber-600 [&>svg]:w-5 [&>svg]:h-5">
                  ✦ У меня остались вопросы, с кем я могу связаться?
                </AccordionTrigger>
                <AccordionContent className="text-amber-900/90 text-sm md:text-base px-4 md:px-6 pb-4">
                  Пишите в Telegram: <a href="https://t.me/nikita0shch" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-600 underline">@nikita0shch</a> — мы поможем!
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          
          {/* Bottom spacer */}
          <div className="h-16 md:h-24" />
        </div>
      </section>

      {/* Footer */}
      <footer 
        className="py-6 text-center"
        style={{
          background: 'linear-gradient(180deg, #9A8878 0%, #7A6858 100%)',
          borderTop: '3px solid rgba(139,115,85,0.6)',
        }}
      >
        <p className="text-amber-100/80 font-serif text-sm">
          © 2026 FairyTeller. Все права защищены.
        </p>
      </footer>
    </div>
  );
};

export default Indian;
