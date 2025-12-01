import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sparkles, BookOpen, Wand2, Mail, Gift, Heart, Cake, Snowflake, User, Users } from "lucide-react";
import mascotImage from "@/assets/mascot.png";
import logoImage from "@/assets/logo.png";
import heroSelectionImage from "@/assets/hero-selection.png";
import worldAtmosphereImage from "@/assets/world-atmosphere.png";
import aiWritingImage from "@/assets/ai-writing.png";
import readyStoryImage from "@/assets/ready-story.png";
import createButtonImage from "@/assets/create-button.png";
import claymotionStyleImage from '@/assets/claymotion-style.png';
import naiveStyleImage from '@/assets/naive-style.jpg';
import minibrickStyleImage from '@/assets/minibrick-style.jpg';
import watercolorStyleImage from '@/assets/watercolor-style.jpg';
import disneyStyleImage from '@/assets/disney-style.jpg';
import toonflatStyleImage from '@/assets/toonflat-style.jpg';
import celcinemaStyleImage from '@/assets/celcinema-style.jpg';
import yarncraftStyleImage from '@/assets/yarncraft-style.jpg';
const Landing = () => {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, {
      passive: true
    });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate mascot movement based on scroll
  const mascotTransform = `translateY(${scrollY * 0.15}px) rotate(${Math.sin(scrollY * 0.005) * 5}deg)`;
  return <div className="min-h-screen bg-gradient-to-br from-[#031B28] via-[#083248] to-[#0B2838] font-serif">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#031B28]/90 backdrop-blur-sm border-b border-[#E89C31]/20 shadow-lg shadow-[#E89C31]/10">
        <div className="container mx-auto px-4 py-5 flex justify-between items-center">
          <div className="flex items-center">
            <img src={logoImage} alt="FairyTeller" className="h-16 object-contain" />
          </div>
          <Link to="/create">
            <img 
              src={createButtonImage} 
              alt="Создать сказку" 
              className="h-20 w-auto hover:scale-105 transition-all duration-300 cursor-pointer drop-shadow-lg hover:drop-shadow-2xl"
            />
          </Link>
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
        
        {/* Twinkling Stars around Moon */}
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
          <div className="space-y-8 md:order-1 order-2">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-[#E89C31] text-center drop-shadow-[0_0_15px_rgba(232,156,49,0.3)]">Персональные сказки, где главный герой — это ты</h1>
            <p className="text-xl text-[#DBA858] leading-relaxed">Задай пару параметров, добавь свое фото и получи настоящую печатную книгу с иллюстрациями</p>
            <div className="pt-0 -mt-4 flex justify-end mr-8">
              <Link to="/create">
                <img 
                  src={createButtonImage} 
                  alt="Создать сказку" 
                  className="h-60 w-auto hover:scale-105 transition-all duration-300 cursor-pointer drop-shadow-lg hover:drop-shadow-2xl"
                />
              </Link>
            </div>
          </div>
          <div className="flex justify-center md:justify-center md:order-2 order-1">
            <img src={mascotImage} alt="FairyTeller - живая книжка с крыльями" className="h-64 w-64 md:h-72 md:w-72 lg:h-80 lg:w-80 object-contain transition-transform duration-300 ease-out" style={{
            transform: `translate(1.5rem, 1.5rem) translateY(${Math.sin(scrollY * 0.005) * 40}px)`
          }} />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-[#0B2838]/60 py-16 border-y border-[#E89C31]/10">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-[#E89C31] drop-shadow-[0_0_15px_rgba(232,156,49,0.3)]">
            Как это работает
          </h2>
          <div className="overflow-x-auto pb-4 -mx-4 px-4">
            <div className="flex gap-6 min-w-max justify-center">
              <Card className="text-center bg-[#083248]/95 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/15 transition-all duration-300 border border-[#E89C31]/20 rounded-2xl overflow-hidden flex flex-col w-64">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-[#E89C31] text-lg font-bold mb-2 min-h-[56px] flex items-center justify-center">Вы выбираете героя</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-4 flex-1 flex flex-col">
                  <div className="mb-2 rounded-xl overflow-hidden flex justify-center flex-1">
                    <img src={heroSelectionImage} alt="Выбор героя" className="w-3/5 h-auto object-contain" />
                  </div>
                  <CardDescription className="text-[#DBA858] text-xs leading-relaxed min-h-[48px]">
                    Впишите имя, особенности и отношения между героями.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center bg-[#083248]/95 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/15 transition-all duration-300 border border-[#E89C31]/20 rounded-2xl overflow-hidden flex flex-col w-64">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-[#E89C31] text-lg font-bold mb-2 min-h-[56px] flex items-center justify-center">Задаете мир и атмосферу</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-4 flex-1 flex flex-col">
                  <div className="mb-2 rounded-xl overflow-hidden flex justify-center flex-1">
                    <img src={worldAtmosphereImage} alt="Мир и атмосфера" className="w-3/5 h-auto object-contain" />
                  </div>
                  <CardDescription className="text-[#DBA858] text-xs leading-relaxed min-h-[48px]">
                    Можно указать город, район, любимое место или даже абстрактный мир.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center bg-[#083248]/95 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/15 transition-all duration-300 border border-[#E89C31]/20 rounded-2xl overflow-hidden flex flex-col w-64">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-[#E89C31] text-lg font-bold mb-2 min-h-[56px] flex items-center justify-center">Искусственный интеллект пишет и иллюстрирует</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-4 flex-1 flex flex-col">
                  <div className="mb-2 rounded-xl overflow-hidden flex justify-center flex-1">
                    <img src={aiWritingImage} alt="ИИ пишет и иллюстрирует" className="w-3/5 h-auto object-contain" />
                  </div>
                  <CardDescription className="text-[#DBA858] text-xs leading-relaxed min-h-[48px]">
                    Мы собираем ваши вводные и создаем историю с картинками.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center bg-[#083248]/95 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/15 transition-all duration-300 border border-[#E89C31]/20 rounded-2xl overflow-hidden flex flex-col w-64">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-[#E89C31] text-lg font-bold mb-2 min-h-[56px] flex items-center justify-center">Получаете готовую сказку</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-4 flex-1 flex flex-col">
                  <div className="mb-2 rounded-xl overflow-hidden flex justify-center flex-1">
                    <img src={readyStoryImage} alt="Готовая сказка" className="w-3/5 h-auto object-contain" />
                  </div>
                  <CardDescription className="text-[#DBA858] text-xs leading-relaxed min-h-[48px]">
                    Мы присылаем историю на почту, а вы можете читать ее сами или подарить.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Preview: Two Columns */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-[1fr_auto_1fr] gap-8 items-center">
          {/* Column 1: Choose Your World */}
          <div className="border-2 border-[#E89C31]/30 rounded-3xl p-6 bg-[#083248]/30 hover:border-[#E89C31]/50 transition-all duration-300">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-3 text-[#E89C31] drop-shadow-[0_0_15px_rgba(232,156,49,0.3)]">
                Выбери свой мир
              </h2>
              <p className="text-base text-[#DBA858]">
                Каждый мир — это своя атмосфера
              </p>
            </div>
            
            <div 
              className="cursor-pointer hover:scale-[1.02] transition-transform duration-300"
              onClick={() => window.open('/create', '_blank')}
            >
              <div className="overflow-x-auto pb-4 -mx-4 px-4">
                <div className="flex gap-4 min-w-max justify-center">
                  {[
                    {
                      emoji: '🦜',
                      title: 'Приключения',
                      tagline: '— Лови момент!'
                    },
                    {
                      emoji: '🎅🏻',
                      title: 'Новогодняя сказка',
                      tagline: '— С Новым годом!'
                    },
                    {
                      emoji: '🧙🏻‍♂️',
                      title: 'Фэнтези',
                      tagline: '— От судьбы не уйдешь.'
                    }
                  ].map((world) => (
                    <Card 
                      key={world.title}
                      className="text-center bg-[#083248]/95 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/15 transition-all duration-300 border border-[#E89C31]/20 rounded-2xl overflow-hidden flex flex-col w-32 pointer-events-none"
                    >
                      <CardHeader className="pb-2 pt-3">
                        <div className="text-3xl mb-1">{world.emoji}</div>
                        <CardTitle className="text-[#E89C31] text-xs font-bold mb-1">{world.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="px-2 pb-3">
                        <p className="text-[#E89C31]/80 text-[10px] italic">{world.tagline}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              <div className="text-center mt-4">
                <p className="text-[#DBA858] text-sm">
                  👆 Открыть конструктор
                </p>
              </div>
            </div>
          </div>

          {/* Middle Divider with Text */}
          <div className="hidden md:flex flex-col items-center justify-center px-4">
            <div className="text-[#E89C31] font-bold text-xl writing-mode-vertical transform rotate-180" style={{ writingMode: 'vertical-rl' }}>
              Конструктор
            </div>
          </div>

          {/* Column 2: Illustration Style */}
          <div className="border-2 border-[#E89C31]/30 rounded-3xl p-6 bg-[#083248]/30 hover:border-[#E89C31]/50 transition-all duration-300">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-3 text-[#E89C31] drop-shadow-[0_0_15px_rgba(232,156,49,0.3)]">
                Стиль иллюстрации
              </h2>
              <p className="text-base text-[#DBA858]">
                Выбери визуальный стиль
              </p>
            </div>
            
            <div 
              className="cursor-pointer hover:scale-[1.02] transition-transform duration-300"
              onClick={() => window.open('/create', '_blank')}
            >
              <div className="overflow-x-auto pb-4 -mx-4 px-4">
                <div className="flex gap-4 min-w-max justify-center">
                  {[
                    { name: 'Disney', image: disneyStyleImage },
                    { name: 'Toonflat', image: toonflatStyleImage },
                    { name: 'Claymotion', image: claymotionStyleImage }
                  ].map((style) => (
                    <Card 
                      key={style.name}
                      className="bg-[#083248]/95 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/15 transition-all duration-300 border border-[#E89C31]/20 rounded-2xl overflow-hidden w-32 pointer-events-none"
                    >
                      <div className="aspect-square bg-gradient-to-br from-[#0B2838] to-[#031B28] flex items-center justify-center p-2">
                        <img 
                          src={style.image} 
                          alt={style.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                      <CardContent className="pt-2 pb-2">
                        <p className="text-[#E89C31] text-center font-bold text-xs">
                          {style.name}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              <div className="text-center mt-4">
                <p className="text-[#DBA858] text-sm">
                  👆 Открыть конструктор
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Examples Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#E89C31] drop-shadow-[0_0_15px_rgba(232,156,49,0.3)]">
            Как выглядят готовые сказки
          </h2>
          <p className="text-xl text-[#DBA858]">
            Вот как выглядят страницы с иллюстрациями и фрагментами текста.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => <Card key={i} className="overflow-hidden bg-[#083248]/80 border border-[#E89C31]/20 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/20 transition-all duration-500 rounded-2xl">
              <div className="aspect-[3/4] bg-gradient-to-br from-[#0B2838] to-[#031B28] flex items-center justify-center">
                <BookOpen className="h-24 w-24 text-[#E89C31]/60" strokeWidth={1} />
              </div>
              <CardContent className="pt-6 pb-6 px-6">
                <Button variant="outline" className="w-full border border-[#E89C31]/30 bg-[#E89C31]/10 text-[#E89C31] hover:bg-[#E89C31] hover:text-[#031B28] hover:scale-105 transition-all duration-500 py-7 rounded-xl font-medium">
                  Посмотреть пример PDF
                </Button>
              </CardContent>
            </Card>)}
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-[#0B2838]/60 py-16 border-y border-[#E89C31]/10">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-[#E89C31] drop-shadow-[0_0_15px_rgba(232,156,49,0.3)]">
            Когда такая сказка особенно заходит
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="bg-[#083248]/80 border border-[#E89C31]/20 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/20 transition-all duration-500 rounded-2xl">
              <CardHeader className="flex flex-row items-center gap-4 p-6">
                <Heart className="h-9 w-9 text-[#8C0E0F]" />
                <CardTitle className="text-lg text-[#DBA858]">Подарок партнеру или партнерше</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-[#083248]/80 border border-[#E89C31]/20 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/20 transition-all duration-500 rounded-2xl">
              <CardHeader className="flex flex-row items-center gap-4 p-6">
                <Cake className="h-9 w-9 text-[#E89C31]" />
                <CardTitle className="text-lg text-[#DBA858]">Детский День Рождения</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-[#083248]/80 border border-[#E89C31]/20 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/20 transition-all duration-500 rounded-2xl">
              <CardHeader className="flex flex-row items-center gap-4 p-6">
                <Snowflake className="h-9 w-9 text-[#DBA858]" />
                <CardTitle className="text-lg text-[#DBA858]">Новогодняя сказка для семьи</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-[#083248]/80 border border-[#E89C31]/20 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/20 transition-all duration-500 rounded-2xl">
              <CardHeader className="flex flex-row items-center gap-4 p-6">
                <User className="h-9 w-9 text-[#E89C31]" />
                <CardTitle className="text-lg text-[#DBA858]">История «про себя» в сложный или важный период</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-[#083248]/80 border border-[#E89C31]/20 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/20 transition-all duration-500 rounded-2xl">
              <CardHeader className="flex flex-row items-center gap-4 p-6">
                <Users className="h-9 w-9 text-[#DBA858]" />
                <CardTitle className="text-lg text-[#DBA858]">Семейная история про вас и близких</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-[#083248]/80 border border-[#E89C31]/20 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/20 transition-all duration-500 rounded-2xl">
              <CardHeader className="flex flex-row items-center gap-4 p-6">
                <Gift className="h-9 w-9 text-[#8C0E0F]" />
                <CardTitle className="text-lg text-[#DBA858]">Особенный подарок для близкого человека</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-[#E89C31] drop-shadow-[0_0_15px_rgba(232,156,49,0.3)]">
          Почему это не просто текст из нейросети
        </h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="bg-[#083248]/80 border border-[#E89C31]/20 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/20 transition-all duration-500 rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-[#E89C31]">
                <Sparkles className="h-6 w-6 text-[#E89C31]" />
                Персонализация под вас
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <p className="text-[#DBA858] leading-relaxed">
                Герои, мир и детали строятся вокруг вашей жизни и ваших запросов.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#083248]/80 border border-[#E89C31]/20 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/20 transition-all duration-500 rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-[#E89C31]">
                <Wand2 className="h-6 w-6 text-[#E89C31]" />
                Иллюстрации в едином стиле
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <p className="text-[#DBA858] leading-relaxed">
                К каждой истории подбираются изображения, чтобы создать цельную атмосферу.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#083248]/80 border border-[#E89C31]/20 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/20 transition-all duration-500 rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-[#E89C31]">
                <BookOpen className="h-6 w-6 text-[#E89C31]" />
                Готовый формат для чтения и подарка
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <p className="text-[#DBA858] leading-relaxed">
                История приходит в удобном формате: можно читать с телефона или распечатать как книгу.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#083248]/80 border border-[#E89C31]/20 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/20 transition-all duration-500 rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-[#E89C31]">
                <Mail className="h-6 w-6 text-[#E89C31]" />
                Быстрый результат
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <p className="text-[#DBA858] leading-relaxed">
                Сказка создается в течение примерно 15 минут после заполнения формы.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[#0B2838]/60 py-16 border-y border-[#E89C31]/10">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-[#E89C31] drop-shadow-[0_0_15px_rgba(232,156,49,0.3)]">
            Что говорят читатели
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="bg-[#083248]/80 border border-[#E89C31]/20 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/20 transition-all duration-500 rounded-2xl">
              <CardContent className="pt-8 pb-8 px-7">
                <p className="text-[#DBA858] italic mb-6 leading-relaxed">
                  "Не ожидали, что получится настолько личная история. Прочитали вслух и все немного расчувствовались."
                </p>
                <p className="font-semibold text-[#E89C31]">— Анна</p>
              </CardContent>
            </Card>

            <Card className="bg-[#083248]/80 border border-[#E89C31]/20 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/20 transition-all duration-500 rounded-2xl">
              <CardContent className="pt-8 pb-8 px-7">
                <p className="text-[#DBA858] italic mb-6 leading-relaxed">
                  "Ребенок три дня подряд просил читать одну и ту же сказку. Сказал, что это лучшая книга про него."
                </p>
                <p className="font-semibold text-[#E89C31]">— Михаил</p>
              </CardContent>
            </Card>

            <Card className="bg-[#083248]/80 border border-[#E89C31]/20 shadow-lg shadow-[#E89C31]/10 hover:shadow-xl hover:shadow-[#E89C31]/20 transition-all duration-500 rounded-2xl">
              <CardContent className="pt-8 pb-8 px-7">
                <p className="text-[#DBA858] italic mb-6 leading-relaxed">
                  "Очень бережный и деликатный текст, как разговор с близким человеком."
                </p>
                <p className="font-semibold text-[#E89C31]">— Елена</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-[#E89C31] drop-shadow-[0_0_15px_rgba(232,156,49,0.3)]">
          Частые вопросы
        </h2>
        <Accordion type="single" collapsible className="max-w-3xl mx-auto bg-[#083248]/80 border border-[#E89C31]/20 rounded-2xl p-6 shadow-lg shadow-[#E89C31]/10">
          <AccordionItem value="item-1" className="border-0 border-b border-[#E89C31]/20 last:border-0">
            <AccordionTrigger className="text-[#DBA858] hover:text-[#E89C31] py-5 transition-colors duration-500">Сколько времени создается сказка?</AccordionTrigger>
            <AccordionContent className="text-[#DBA858]/80">
              Обычно до 15 минут после того, как вы заполнили форму. Мы пришлем письмо, как только история будет готова.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="border-0 border-b border-[#E89C31]/20 last:border-0">
            <AccordionTrigger className="text-[#DBA858] hover:text-[#E89C31] py-5 transition-colors duration-500">Для кого подходит формат?</AccordionTrigger>
            <AccordionContent className="text-[#DBA858]/80">
              Для взрослых и детей. Можно сделать романтическую, семейную, детскую или медитативную историю.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="border-0 border-b border-[#E89C31]/20 last:border-0">
            <AccordionTrigger className="text-[#DBA858] hover:text-[#E89C31] py-5 transition-colors duration-500">Я могу выбрать стиль иллюстраций?</AccordionTrigger>
            <AccordionContent className="text-[#DBA858]/80">
              Сейчас стиль задается автоматически, но вы можете описать желаемую атмосферу, и мы постараемся к ней приблизиться.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4" className="border-0 border-b border-[#E89C31]/20 last:border-0">
            <AccordionTrigger className="text-[#DBA858] hover:text-[#E89C31] py-5 transition-colors duration-500">В каком виде я получу сказку?</AccordionTrigger>
            <AccordionContent className="text-[#DBA858]/80">
              История приходит на электронную почту в виде файла, удобного для чтения и печати.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5" className="border-0 border-b border-[#E89C31]/20 last:border-0">
            <AccordionTrigger className="text-[#DBA858] hover:text-[#E89C31] py-5 transition-colors duration-500">Можно ли подарить сказку другому человеку?</AccordionTrigger>
            <AccordionContent className="text-[#DBA858]/80">
              Да, вы можете указать его в качестве героя, а файл отправить или распечатать и подарить как книгу.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
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
          <Link to="/create">
            <img 
              src={createButtonImage} 
              alt="Создать сказку" 
              className="h-24 w-auto hover:scale-105 transition-all duration-300 cursor-pointer drop-shadow-2xl hover:drop-shadow-[0_0_40px_rgba(232,156,49,0.6)] mx-auto"
            />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#031B28] border-t border-[#E89C31]/20 py-10">
        <div className="container mx-auto px-4 text-center text-[#DBA858]">
          <p className="text-lg">© 2024 FairyTeller. Создаем персональные истории с любовью.</p>
        </div>
      </footer>
    </div>;
};
export default Landing;