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
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-pink-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={mascotImage} alt="FairyTeller mascot" className="h-10 w-10 object-contain" />
            <h1 className="text-2xl font-bold text-primary">FairyTeller</h1>
          </div>
          <Link to="/create">
            <Button className="gap-2">
              <Sparkles className="h-4 w-4" />
              Создать сказку
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Персональные иллюстрированные сказки, где ты — главный герой
            </h1>
            <p className="text-xl text-muted-foreground">
              Задай пару параметров и получи настоящую печатную книгу с иллюстрациями
            </p>
            <Link to="/create">
              <Button size="lg" className="gap-2 text-lg px-8 py-6">
                <Sparkles className="h-5 w-5" />
                Создать сказку
              </Button>
            </Link>
          </div>
          <div className="flex justify-center">
            <img 
              src={mascotImage} 
              alt="FairyTeller - живая книжка с крыльями" 
              className="h-80 w-80 object-contain animate-fade-in transition-transform duration-100 ease-out"
              style={{ transform: mascotTransform }}
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-background/50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Как это работает
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Вы выбираете героя</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Впишите имя, особенности и отношения между героями.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Задаете мир и атмосферу</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Можно указать город, район, любимое место или даже абстрактный мир.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wand2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Искусственный интеллект пишет и иллюстрирует</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Мы собираем ваши вводные и создаем историю с картинками.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Получаете готовую сказку</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Как выглядят готовые сказки
          </h2>
          <p className="text-xl text-muted-foreground">
            Вот как выглядят страницы с иллюстрациями и фрагментами текста.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-[3/4] bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <BookOpen className="h-24 w-24 text-primary/40" strokeWidth={1} />
              </div>
              <CardContent className="pt-4">
                <Button variant="outline" className="w-full">
                  Посмотреть пример PDF
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-background/50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Когда такая сказка особенно заходит
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <Heart className="h-8 w-8 text-primary" />
                <CardTitle className="text-lg">Подарок партнеру или партнерше</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <Cake className="h-8 w-8 text-primary" />
                <CardTitle className="text-lg">Детский День Рождения</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <Snowflake className="h-8 w-8 text-primary" />
                <CardTitle className="text-lg">Новогодняя сказка для семьи</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <User className="h-8 w-8 text-primary" />
                <CardTitle className="text-lg">История «про себя» в сложный или важный период</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <Users className="h-8 w-8 text-primary" />
                <CardTitle className="text-lg">Семейная история про вас и близких</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <Gift className="h-8 w-8 text-primary" />
                <CardTitle className="text-lg">Особенный подарок для близкого человека</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Почему это не просто текст из нейросети
        </h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Персонализация под вас
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Герои, мир и детали строятся вокруг вашей жизни и ваших запросов.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-primary" />
                Иллюстрации в едином стиле
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                К каждой истории подбираются изображения, чтобы создать цельную атмосферу.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Готовый формат для чтения и подарка
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                История приходит в удобном формате: можно читать с телефона или распечатать как книгу.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Быстрый результат
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Сказка создается в течение примерно 15 минут после заполнения формы.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-background/50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Что говорят читатели
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground italic mb-4">
                  "Не ожидали, что получится настолько личная история. Прочитали вслух и все немного расчувствовались."
                </p>
                <p className="font-semibold">— Анна</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground italic mb-4">
                  "Ребенок три дня подряд просил читать одну и ту же сказку. Сказал, что это лучшая книга про него."
                </p>
                <p className="font-semibold">— Михаил</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground italic mb-4">
                  "Очень бережный и деликатный текст, как разговор с близким человеком."
                </p>
                <p className="font-semibold">— Елена</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Частые вопросы
        </h2>
        <Accordion type="single" collapsible className="max-w-3xl mx-auto">
          <AccordionItem value="item-1">
            <AccordionTrigger>Сколько времени создается сказка?</AccordionTrigger>
            <AccordionContent>
              Обычно до 15 минут после того, как вы заполнили форму. Мы пришлем письмо, как только история будет готова.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2">
            <AccordionTrigger>Для кого подходит формат?</AccordionTrigger>
            <AccordionContent>
              Для взрослых и детей. Можно сделать романтическую, семейную, детскую или медитативную историю.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3">
            <AccordionTrigger>Я могу выбрать стиль иллюстраций?</AccordionTrigger>
            <AccordionContent>
              Сейчас стиль задается автоматически, но вы можете описать желаемую атмосферу, и мы постараемся к ней приблизиться.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4">
            <AccordionTrigger>В каком виде я получу сказку?</AccordionTrigger>
            <AccordionContent>
              История приходит на электронную почту в виде файла, удобного для чтения и печати.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5">
            <AccordionTrigger>Можно ли подарить сказку другому человеку?</AccordionTrigger>
            <AccordionContent>
              Да, вы можете указать его в качестве героя, а файл отправить или распечатать и подарить как книгу.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Попробуйте создать свою сказку прямо сейчас
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Заполните несколько полей — и получите историю, где герои и события будут связаны с вашей жизнью.
          </p>
          <Link to="/create">
            <Button size="lg" className="gap-2 text-lg px-8 py-6">
              <Sparkles className="h-5 w-5" />
              Создать сказку
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 FairyTeller. Создаем персональные истории с любовью.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;