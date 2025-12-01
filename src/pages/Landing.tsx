import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sparkles, BookOpen, Wand2, Mail, Gift, Heart, Cake, Snowflake, User, Users } from "lucide-react";
import mascotImage from "@/assets/mascot.png";

const Landing = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate mascot movement based on scroll
  const mascotTransform = `translateY(${scrollY * 0.15}px) rotate(${Math.sin(scrollY * 0.005) * 5}deg)`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#A85844] via-[#C9968A] to-[#E8D9C3] font-serif">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#B8664F]/90 backdrop-blur-sm border-b border-[#7D4434]">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={mascotImage} alt="FairyTeller mascot" className="h-10 w-10 object-contain" />
            <h1 className="text-2xl font-bold text-[#2D1810]">FairyTeller</h1>
          </div>
          <Link to="/create">
            <Button className="gap-2 bg-[#E85D4A] hover:bg-[#D14836] text-white border-none shadow-lg">
              <Sparkles className="h-4 w-4" />
              Создать сказку
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-10 right-10 w-24 h-24 rounded-full bg-[#F5E8D1] opacity-80 animate-fade-in" 
             style={{ boxShadow: '0 0 60px 30px rgba(245, 232, 209, 0.3)' }}></div>
        <div className="absolute bottom-0 left-0 w-full h-48 opacity-50">
          <svg viewBox="0 0 1200 200" className="w-full h-full">
            <path d="M0,100 Q200,20 400,80 T800,100 T1200,80 L1200,200 L0,200 Z" 
                  fill="#7EB3C9" opacity="0.3"/>
            <path d="M0,120 Q300,40 500,100 T900,110 T1200,90 L1200,200 L0,200 Z" 
                  fill="#A8CFD9" opacity="0.4"/>
          </svg>
        </div>
        
        <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-[#2D1810]">
              Персональные иллюстрированные сказки, где ты — главный герой
            </h1>
            <p className="text-xl text-[#3D2617]">
              Задай пару параметров и получи настоящую печатную книгу с иллюстрациями
            </p>
            <Link to="/create">
              <Button size="lg" className="gap-2 text-lg px-8 py-6 bg-[#E85D4A] hover:bg-[#D14836] text-white border-none shadow-xl">
                <Sparkles className="h-5 w-5" />
                Создать сказку
              </Button>
            </Link>
          </div>
          <div className="flex justify-center">
            <img 
              src={mascotImage} 
              alt="FairyTeller - живая книжка с крыльями" 
              className="h-80 w-80 object-contain animate-fade-in transition-all duration-300 ease-out hover:scale-105 cursor-pointer"
              style={{ transform: mascotTransform, animation: 'none' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.animation = 'wing-flap 0.6s ease-in-out infinite';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.animation = 'none';
              }}
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-[#F0E6D2]/40 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-[#2D1810]">
            Как это работает
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center bg-white/90 border-[#D4A89A]">
              <CardHeader>
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[#7EB3C9]/20 flex items-center justify-center">
                  <User className="h-6 w-6 text-[#7EB3C9]" />
                </div>
                <CardTitle className="text-[#2D1810]">Вы выбираете героя</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-[#4A2F1F]">
                  Впишите имя, особенности и отношения между героями.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center bg-white/90 border-[#D4A89A]">
              <CardHeader>
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[#8CB369]/20 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-[#8CB369]" />
                </div>
                <CardTitle className="text-[#2D1810]">Задаете мир и атмосферу</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-[#4A2F1F]">
                  Можно указать город, район, любимое место или даже абстрактный мир.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center bg-white/90 border-[#D4A89A]">
              <CardHeader>
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[#A8CFD9]/20 flex items-center justify-center">
                  <Wand2 className="h-6 w-6 text-[#A8CFD9]" />
                </div>
                <CardTitle className="text-[#2D1810]">Искусственный интеллект пишет и иллюстрирует</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-[#4A2F1F]">
                  Мы собираем ваши вводные и создаем историю с картинками.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center bg-white/90 border-[#D4A89A]">
              <CardHeader>
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[#7EB3C9]/20 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-[#7EB3C9]" />
                </div>
                <CardTitle className="text-[#2D1810]">Получаете готовую сказку</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-[#4A2F1F]">
                  Мы присылаем историю на почту, а вы можете читать ее сами или подарить.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Examples Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#2D1810]">
            Как выглядят готовые сказки
          </h2>
          <p className="text-xl text-[#3D2617]">
            Вот как выглядят страницы с иллюстрациями и фрагментами текста.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden bg-white/90 border-[#D4A89A]">
              <div className="aspect-[3/4] bg-gradient-to-br from-[#A8CFD9]/40 to-[#8CB369]/40 flex items-center justify-center">
                <BookOpen className="h-24 w-24 text-[#7EB3C9]/60" strokeWidth={1} />
              </div>
              <CardContent className="pt-4">
                <Button variant="outline" className="w-full border-[#7EB3C9] text-[#7EB3C9] hover:bg-[#7EB3C9] hover:text-white">
                  Посмотреть пример PDF
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-[#F0E6D2]/40 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-[#2D1810]">
            Когда такая сказка особенно заходит
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="bg-white/90 border-[#D4A89A]">
              <CardHeader className="flex flex-row items-center gap-4">
                <Heart className="h-8 w-8 text-[#A85844]" />
                <CardTitle className="text-lg text-[#2D1810]">Подарок партнеру или партнерше</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-white/90 border-[#D4A89A]">
              <CardHeader className="flex flex-row items-center gap-4">
                <Cake className="h-8 w-8 text-[#7EB3C9]" />
                <CardTitle className="text-lg text-[#2D1810]">Детский День Рождения</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-white/90 border-[#D4A89A]">
              <CardHeader className="flex flex-row items-center gap-4">
                <Snowflake className="h-8 w-8 text-[#A8CFD9]" />
                <CardTitle className="text-lg text-[#2D1810]">Новогодняя сказка для семьи</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-white/90 border-[#D4A89A]">
              <CardHeader className="flex flex-row items-center gap-4">
                <User className="h-8 w-8 text-[#8CB369]" />
                <CardTitle className="text-lg text-[#2D1810]">История «про себя» в сложный или важный период</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-white/90 border-[#D4A89A]">
              <CardHeader className="flex flex-row items-center gap-4">
                <Users className="h-8 w-8 text-[#7EB3C9]" />
                <CardTitle className="text-lg text-[#2D1810]">Семейная история про вас и близких</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-white/90 border-[#D4A89A]">
              <CardHeader className="flex flex-row items-center gap-4">
                <Gift className="h-8 w-8 text-[#A85844]" />
                <CardTitle className="text-lg text-[#2D1810]">Особенный подарок для близкого человека</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-[#2D1810]">
          Почему это не просто текст из нейросети
        </h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="bg-white/90 border-[#D4A89A]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#2D1810]">
                <Sparkles className="h-5 w-5 text-[#8CB369]" />
                Персонализация под вас
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#3D2617]">
                Герои, мир и детали строятся вокруг вашей жизни и ваших запросов.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 border-[#D4A89A]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#2D1810]">
                <Wand2 className="h-5 w-5 text-[#A8CFD9]" />
                Иллюстрации в едином стиле
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#3D2617]">
                К каждой истории подбираются изображения, чтобы создать цельную атмосферу.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 border-[#D4A89A]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#2D1810]">
                <BookOpen className="h-5 w-5 text-[#7EB3C9]" />
                Готовый формат для чтения и подарка
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#3D2617]">
                История приходит в удобном формате: можно читать с телефона или распечатать как книгу.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 border-[#D4A89A]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#2D1810]">
                <Mail className="h-5 w-5 text-[#A85844]" />
                Быстрый результат
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#3D2617]">
                Сказка создается в течение примерно 15 минут после заполнения формы.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[#F0E6D2]/40 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-[#2D1810]">
            Что говорят читатели
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="bg-white/90 border-[#D4A89A]">
              <CardContent className="pt-6">
                <p className="text-[#3D2617] italic mb-4">
                  "Не ожидали, что получится настолько личная история. Прочитали вслух и все немного расчувствовались."
                </p>
                <p className="font-semibold text-[#2D1810]">— Анна</p>
              </CardContent>
            </Card>

            <Card className="bg-white/90 border-[#D4A89A]">
              <CardContent className="pt-6">
                <p className="text-[#3D2617] italic mb-4">
                  "Ребенок три дня подряд просил читать одну и ту же сказку. Сказал, что это лучшая книга про него."
                </p>
                <p className="font-semibold text-[#2D1810]">— Михаил</p>
              </CardContent>
            </Card>

            <Card className="bg-white/90 border-[#D4A89A]">
              <CardContent className="pt-6">
                <p className="text-[#3D2617] italic mb-4">
                  "Очень бережный и деликатный текст, как разговор с близким человеком."
                </p>
                <p className="font-semibold text-[#2D1810]">— Елена</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-[#2D1810]">
          Частые вопросы
        </h2>
        <Accordion type="single" collapsible className="max-w-3xl mx-auto bg-white/70 rounded-lg p-4">
          <AccordionItem value="item-1" className="border-[#D4A89A]">
            <AccordionTrigger className="text-[#2D1810] hover:text-[#7EB3C9]">Сколько времени создается сказка?</AccordionTrigger>
            <AccordionContent className="text-[#3D2617]">
              Обычно до 15 минут после того, как вы заполнили форму. Мы пришлем письмо, как только история будет готова.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="border-[#D4A89A]">
            <AccordionTrigger className="text-[#2D1810] hover:text-[#7EB3C9]">Для кого подходит формат?</AccordionTrigger>
            <AccordionContent className="text-[#3D2617]">
              Для взрослых и детей. Можно сделать романтическую, семейную, детскую или медитативную историю.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="border-[#D4A89A]">
            <AccordionTrigger className="text-[#2D1810] hover:text-[#7EB3C9]">Я могу выбрать стиль иллюстраций?</AccordionTrigger>
            <AccordionContent className="text-[#3D2617]">
              Сейчас стиль задается автоматически, но вы можете описать желаемую атмосферу, и мы постараемся к ней приблизиться.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4" className="border-[#D4A89A]">
            <AccordionTrigger className="text-[#2D1810] hover:text-[#7EB3C9]">В каком виде я получу сказку?</AccordionTrigger>
            <AccordionContent className="text-[#3D2617]">
              История приходит на электронную почту в виде файла, удобного для чтения и печати.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5" className="border-[#D4A89A]">
            <AccordionTrigger className="text-[#2D1810] hover:text-[#7EB3C9]">Можно ли подарить сказку другому человеку?</AccordionTrigger>
            <AccordionContent className="text-[#3D2617]">
              Да, вы можете указать его в качестве героя, а файл отправить или распечатать и подарить как книгу.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-[#A8CFD9] via-[#7EB3C9] to-[#8CB369] py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#2D1810]">
            Попробуйте создать свою сказку прямо сейчас
          </h2>
          <p className="text-xl text-[#3D2617] mb-8 max-w-2xl mx-auto">
            Заполните несколько полей — и получите историю, где герои и события будут связаны с вашей жизнью.
          </p>
          <Link to="/create">
            <Button size="lg" className="gap-2 text-lg px-8 py-6 bg-[#E85D4A] hover:bg-[#D14836] text-white border-none shadow-xl">
              <Sparkles className="h-5 w-5" />
              Создать сказку
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#B8664F] border-t border-[#A85844] py-8">
        <div className="container mx-auto px-4 text-center text-[#F0E6D2]">
          <p>© 2024 FairyTeller. Создаем персональные истории с любовью.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;