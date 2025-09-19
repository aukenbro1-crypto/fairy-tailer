import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

// Constants from requirements
const WEBHOOK_URL = "https://hook.eu2.make.com/c9pm5jrx6t7ki3ir3qq1e7822cai2bz9";

interface FormData {
  genre: string;
  tone: string;
  form: 'adult' | 'kids';
  ending: 'moral' | 'happy' | 'sad' | 'twist';
  location: string;
  artifact: string;
  length_target: number;
  chapters: number;
  title_need: boolean;
  language: 'ru' | 'en';
  email: string;
  // Heroes 1-4
  hero1_name: string;
  hero1_age: number;
  hero1_job: string;
  hero1_traits: string;
  hero1_fear: string;
  hero1_habits: string;
  hero2_name: string;
  hero2_age: number;
  hero2_job: string;
  hero2_traits: string;
  hero2_fear: string;
  hero2_habits: string;
  hero3_name: string;
  hero3_age: number;
  hero3_job: string;
  hero3_traits: string;
  hero3_fear: string;
  hero3_habits: string;
  hero4_name: string;
  hero4_age: number;
  hero4_job: string;
  hero4_traits: string;
  hero4_fear: string;
  hero4_habits: string;
}
const GENRES = ['приключение', 'философская притча', 'сказка для детей', 'романтика', 'страшная история', 'юмор', 'сюрреализм', 'фэнтези', 'научная фантастика'];
const TONE_PRESETS = ['легкий', 'ироничный', 'философский', 'драматичный', 'мистический'];
const ENDINGS = ['moral', 'happy', 'sad', 'twist'];
const ENDING_LABELS = {
  moral: 'С моралью',
  happy: 'Хэппи-энд',
  sad: 'Грустный',
  twist: 'Неожиданный'
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
  const [formData, setFormData] = useState<FormData>({
    genre: '',
    tone: '',
    form: 'adult',
    ending: 'moral',
    location: '',
    artifact: '',
    length_target: 15000,
    chapters: 5,
    title_need: false,
    language: 'ru',
    email: '',
    hero1_name: '',
    hero1_age: 0,
    hero1_job: '',
    hero1_traits: '',
    hero1_fear: '',
    hero1_habits: '',
    hero2_name: '',
    hero2_age: 0,
    hero2_job: '',
    hero2_traits: '',
    hero2_fear: '',
    hero2_habits: '',
    hero3_name: '',
    hero3_age: 0,
    hero3_job: '',
    hero3_traits: '',
    hero3_fear: '',
    hero3_habits: '',
    hero4_name: '',
    hero4_age: 0,
    hero4_job: '',
    hero4_traits: '',
    hero4_fear: '',
    hero4_habits: ''
  });
  const [heroSections, setHeroSections] = useState({
    hero2: false,
    hero3: false,
    hero4: false
  });

  // Handle knob click to cycle through presets
  const handleKnobClick = () => {
    const currentIndex = TONE_PRESETS.indexOf(formData.tone);
    const nextIndex = (currentIndex + 1) % TONE_PRESETS.length;
    const nextTone = TONE_PRESETS[nextIndex];
    setFormData(prev => ({
      ...prev,
      tone: nextTone
    }));
    setKnobAngle(nextIndex * (360 / TONE_PRESETS.length));
  };
  // Initialize knob angle based on current tone
  useEffect(() => {
    const currentIndex = TONE_PRESETS.indexOf(formData.tone);
    if (currentIndex !== -1) {
      setKnobAngle(currentIndex * (360 / TONE_PRESETS.length));
    }
  }, []);

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
  const handleEndingChange = () => {
    const currentIndex = ENDINGS.indexOf(formData.ending);
    const nextIndex = (currentIndex + 1) % ENDINGS.length;
    setFormData(prev => ({
      ...prev,
      ending: ENDINGS[nextIndex] as any
    }));
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
    if (!formData.genre || !formData.form || !formData.ending || formData.length_target <= 0 || formData.chapters <= 0) {
      toast({
        variant: "destructive",
        title: "Ошибка валидации",
        description: "Пожалуйста, заполните все обязательные поля."
      });
      return;
    }

    setShowLoader(true);
    
    // Prepare payload with all fields
    const payload = {
      genre: formData.genre,
      tone: formData.tone,
      form: formData.form,
      ending: formData.ending,
      location: formData.location,
      artifact: formData.artifact,
      length_target: formData.length_target,
      chapters: formData.chapters,
      title_need: formData.title_need,
      language: formData.language,
      email: formData.email.toLowerCase(),
      hero1_name: formData.hero1_name,
      hero1_age: formData.hero1_age,
      hero1_job: formData.hero1_job,
      hero1_traits: formData.hero1_traits,
      hero1_fear: formData.hero1_fear,
      hero1_habits: formData.hero1_habits,
      hero2_name: formData.hero2_name,
      hero2_age: formData.hero2_age,
      hero2_job: formData.hero2_job,
      hero2_traits: formData.hero2_traits,
      hero2_fear: formData.hero2_fear,
      hero2_habits: formData.hero2_habits,
      hero3_name: formData.hero3_name,
      hero3_age: formData.hero3_age,
      hero3_job: formData.hero3_job,
      hero3_traits: formData.hero3_traits,
      hero3_fear: formData.hero3_fear,
      hero3_habits: formData.hero3_habits,
      hero4_name: formData.hero4_name,
      hero4_age: formData.hero4_age,
      hero4_job: formData.hero4_job,
      hero4_traits: formData.hero4_traits,
      hero4_fear: formData.hero4_fear,
      hero4_habits: formData.hero4_habits,
    };

    let ok = false;
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      ok = response.ok;
    } catch (error) {
      ok = false;
    }

    toast({
      title: ok ? "Заявка отправлена" : "Ошибка отправки",
      description: ok ? "Идёт генерация сказки..." : "Не удалось отправить запрос. Попробуйте снова."
    });

    setShowLoader(false);
    showEmailOverlayWithProgress();
  };
  return <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-brass glow">Конструктор сказок</h1>
          <p className="text-xl text-muted-foreground">Создай свою историю</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column - Controls */}
          <div className="space-y-8">
            {/* Genre */}
            <div className="steampunk-card">
              <label className="block text-lg font-semibold mb-2 text-brass">
                Выбери жанр истории
              </label>
              <select className="steampunk-select" value={formData.genre} onChange={e => setFormData(prev => ({
              ...prev,
              genre: e.target.value
            }))}>
                <option value="">Выберите жанр...</option>
                {GENRES.map(genre => <option key={genre} value={genre}>{genre}</option>)}
              </select>
            </div>

            {/* Tone Control */}
            <div className="steampunk-card">
              <label className="block text-lg font-semibold mb-4 text-brass">
                Тон повествования
              </label>
              <div className="flex items-center gap-6">
                {/* Brass Knob */}
                <div ref={knobRef} className="brass-knob hover-scale cursor-pointer" style={{
                transform: `rotate(${knobAngle}deg)`
              }} onClick={handleKnobClick} />
                
                {/* Display */}
                <div className="flex-1">
                  <input type="text" className="steampunk-input mb-4" value={formData.tone} onChange={e => setFormData(prev => ({
                  ...prev,
                  tone: e.target.value
                }))} placeholder="Введите тон..." />
              <div className="flex flex-wrap gap-2">
                {TONE_PRESETS.map((preset, index) => <button key={preset} className={`px-3 py-1 rounded-full border transition-all duration-200 text-sm ${formData.tone === preset ? 'bg-brass text-cta-text border-brass shadow-lg' : 'border-brass text-brass hover:bg-brass hover:text-cta-text'}`} onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      tone: preset
                    }));
                    setKnobAngle(index * (360 / TONE_PRESETS.length));
                  }}>
                    {preset}
                  </button>)}
              </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Поверни крутилку или напиши свой тон
              </p>
            </div>

            {/* Form Toggle */}
            <div className="steampunk-card">
              <label className="block text-lg font-semibold mb-4 text-brass">Форма</label>
              <div className="flex items-center gap-4">
                <span className={formData.form === 'adult' ? 'text-brass font-semibold' : 'text-muted-foreground'}>Для взрослых</span>
                <div className={`steampunk-toggle ${formData.form === 'kids' ? 'active' : ''}`} onClick={() => setFormData(prev => ({
                ...prev,
                form: prev.form === 'adult' ? 'kids' : 'adult'
              }))}>
                  <div className="toggle-handle" />
                </div>
                <span className={formData.form === 'kids' ? 'text-brass font-semibold' : 'text-muted-foreground'}>Для детей</span>
              </div>
            </div>

            {/* Ending Dial */}
            <div className="steampunk-card">
              <label className="block text-lg font-semibold mb-4 text-brass">
                Развязка истории
              </label>
              <div className="flex items-center gap-6">
                <div className="analog-dial">
                  <div className="dial-face">
                    <div className="dial-pointer" style={{
                    transform: `translate(-50%, -100%) rotate(${ENDINGS.indexOf(formData.ending) * 90}deg)`
                  }} />
                    {/* Sector labels */}
                    <div className="absolute inset-0 magnifying-glass">
                      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xs text-brass">М</div>
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-brass">Х</div>
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-brass">Г</div>
                      <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-brass">Н</div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-brass mb-2">
                    {ENDING_LABELS[formData.ending]}
                  </div>
                  <button className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-brass hover:text-charcoal transition-colors" onClick={handleEndingChange}>
                    Переключить
                  </button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Нажми, чтобы сменить развязку
              </p>
            </div>
          </div>

          {/* Right Column - Story Details */}
          <div className="space-y-8">
            {/* Email Field */}
            <div className="steampunk-card">
              <div className="space-y-4">
                <div>
                  <label className="block text-lg font-semibold mb-2 text-brass">
                    Почта (обязательно)
                  </label>
                  <input 
                    type="email" 
                    className={`steampunk-input ${formData.email && !validateEmail(formData.email) ? 'border-red-500 shadow-red-500/20' : ''}`}
                    value={formData.email} 
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      email: e.target.value
                    }))} 
                    placeholder="name@example.com"
                    autoComplete="email"
                    required
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Мы вышлем PDF на этот адрес.
                  </p>
                </div>
              </div>
            </div>

            {/* Location & Artifact */}
            <div className="steampunk-card">
              <div className="space-y-4">
                <div>
                  <label className="block text-lg font-semibold mb-2 text-brass">
                    Место действия
                  </label>
                  <input type="text" className="steampunk-input" value={formData.location} onChange={e => setFormData(prev => ({
                  ...prev,
                  location: e.target.value
                }))} placeholder="Мехико или Заколдованный лес..." />
                </div>
                <div>
                  <label className="block text-lg font-semibold mb-2 text-brass">
                    Артефакт
                  </label>
                  <input type="text" className="steampunk-input" value={formData.artifact} onChange={e => setFormData(prev => ({
                  ...prev,
                  artifact: e.target.value
                }))} placeholder="личный предмет или знакомое событие..." />
                </div>
              </div>
            </div>

            {/* Heroes Section */}
            <div className="steampunk-card">
              <h3 className="text-lg font-semibold mb-4 text-brass">Персонажи</h3>
              
              {/* Main Hero */}
              <div className="mb-6 p-4 rounded-lg bg-panel border border-brass">
                <h4 className="font-semibold mb-3 text-brass">Главный герой</h4>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Имя" className="steampunk-input" value={formData.hero1_name} onChange={e => setFormData(prev => ({
                  ...prev,
                  hero1_name: e.target.value
                }))} />
                  <input type="number" placeholder="Возраст" className="steampunk-input" value={formData.hero1_age || ''} onChange={e => setFormData(prev => ({
                  ...prev,
                  hero1_age: parseInt(e.target.value) || 0
                }))} />
                  <input type="text" placeholder="Профессия" className="steampunk-input" value={formData.hero1_job} onChange={e => setFormData(prev => ({
                  ...prev,
                  hero1_job: e.target.value
                }))} />
                  <input type="text" placeholder="Черты характера" className="steampunk-input" value={formData.hero1_traits} onChange={e => setFormData(prev => ({
                  ...prev,
                  hero1_traits: e.target.value
                }))} />
                  <input type="text" placeholder="Страхи" className="steampunk-input" value={formData.hero1_fear} onChange={e => setFormData(prev => ({
                  ...prev,
                  hero1_fear: e.target.value
                }))} />
                  <input type="text" placeholder="Привычки" className="steampunk-input" value={formData.hero1_habits} onChange={e => setFormData(prev => ({
                  ...prev,
                  hero1_habits: e.target.value
                }))} />
                </div>
              </div>

              {/* Additional Heroes */}
              {[2, 3, 4].map(heroNum => {
              const heroKey = `hero${heroNum}` as keyof typeof heroSections;
              const isVisible = heroSections[heroKey];
              return <div key={heroNum} className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-brass">Герой {heroNum}</h4>
                      <div className={`steampunk-toggle ${isVisible ? 'active' : ''}`} onClick={() => setHeroSections(prev => ({
                    ...prev,
                    [heroKey]: !prev[heroKey]
                  }))}>
                        <div className="toggle-handle" />
                      </div>
                    </div>
                    
                    {isVisible && <div className="p-4 rounded-lg bg-panel border border-brass">
                        <div className="grid grid-cols-2 gap-4">
                          <input type="text" placeholder="Имя" className="steampunk-input" value={formData[`hero${heroNum}_name` as keyof FormData] as string} onChange={e => setFormData(prev => ({
                      ...prev,
                      [`hero${heroNum}_name`]: e.target.value
                    }))} />
                          <input type="number" placeholder="Возраст" className="steampunk-input" value={formData[`hero${heroNum}_age` as keyof FormData] as number || ''} onChange={e => setFormData(prev => ({
                      ...prev,
                      [`hero${heroNum}_age`]: parseInt(e.target.value) || 0
                    }))} />
                          <input type="text" placeholder="Профессия" className="steampunk-input" value={formData[`hero${heroNum}_job` as keyof FormData] as string} onChange={e => setFormData(prev => ({
                      ...prev,
                      [`hero${heroNum}_job`]: e.target.value
                    }))} />
                          <input type="text" placeholder="Черты характера" className="steampunk-input" value={formData[`hero${heroNum}_traits` as keyof FormData] as string} onChange={e => setFormData(prev => ({
                      ...prev,
                      [`hero${heroNum}_traits`]: e.target.value
                    }))} />
                          <input type="text" placeholder="Страхи" className="steampunk-input" value={formData[`hero${heroNum}_fear` as keyof FormData] as string} onChange={e => setFormData(prev => ({
                      ...prev,
                      [`hero${heroNum}_fear`]: e.target.value
                    }))} />
                          <input type="text" placeholder="Привычки" className="steampunk-input" value={formData[`hero${heroNum}_habits` as keyof FormData] as string} onChange={e => setFormData(prev => ({
                      ...prev,
                      [`hero${heroNum}_habits`]: e.target.value
                    }))} />
                        </div>
                      </div>}
                  </div>;
            })}
            </div>
          </div>
        </div>

        {/* Submit Section */}
        <div className="mt-12 text-center">
          <button className="button-primary text-2xl px-12 py-6 mb-4" onClick={handleSubmit} disabled={showLoader}>
            {showLoader ? 'Отправка...' : 'Создать сказку'}
          </button>
          
          <p className="text-sm text-muted-foreground mb-6">
            Время генерации 2–4 мин. PDF придёт на указанную почту.
          </p>
        </div>

        {/* Loader Modal */}
        {showLoader && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="steampunk-card max-w-md text-center">
              <div className="animate-spin w-12 h-12 border-4 border-brass border-t-transparent rounded-full mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-brass mb-2">
                Задача отправлена
              </h3>
              <p className="text-muted-foreground">
                Обработка запроса...
              </p>
            </div>
          </div>}

        {/* Email Progress Overlay */}
        {showEmailOverlay && (
          <div 
            className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50"
            style={{ display: 'block' }}
            aria-hidden="true"
            onClick={hideEmailOverlayHandler}
          >
            <div 
              className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-lg mx-4 bg-[#111a22] text-[#eaf2f6] border border-[#1b2d3a] rounded-2xl shadow-2xl p-6"
              role="dialog" 
              aria-modal="true" 
              aria-labelledby="email-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="email-title" className="text-2xl font-semibold mb-2 text-brass">
                Почти готово!
              </h3>
              <p className="mb-4 opacity-90">
                Через несколько минут сказка окажется у вас на почте.
              </p>
              <div 
                className="w-full h-3 border border-white/8 rounded-lg bg-white/8 overflow-hidden"
                aria-label="Загрузка"
              >
                <div 
                  id="email-progress"
                  className="h-full bg-gradient-to-r from-[#63d2ff] to-[#e6a648] transition-all duration-200 ease-linear"
                  style={{ width: '0%' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>;
};
export default Index;