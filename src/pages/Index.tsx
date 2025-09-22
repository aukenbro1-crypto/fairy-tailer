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
const GENRES = ['приключение', 'философская притча', 'романтика', 'страшная история', 'юмор', 'сюрреализм', 'фэнтези', 'научная фантастика'];
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
    tone: TONE_PRESETS[0],
    // Initialize with first tone preset
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

  // Handle knob click to cycle through presets with animation
  const handleKnobClick = () => {
    // Add changing animation class
    const displayElement = document.querySelector('.mixer-tone-display-text');
    if (displayElement) {
      displayElement.classList.add('mixer-tone-display-changing');
    }
    const currentIndex = TONE_PRESETS.indexOf(formData.tone);
    const nextIndex = (currentIndex + 1) % TONE_PRESETS.length;
    const nextTone = TONE_PRESETS[nextIndex];

    // Delay the text change for animation effect
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        tone: nextTone
      }));
      setKnobAngle(nextIndex * (360 / TONE_PRESETS.length));

      // Remove animation class after text change
      setTimeout(() => {
        if (displayElement) {
          displayElement.classList.remove('mixer-tone-display-changing');
        }
      }, 50);
    }, 150);
  };
  // Genre carousel functions
  const handleGenreNext = () => {
    const currentIndex = GENRES.findIndex(g => g === formData.genre);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % GENRES.length;
    setFormData(prev => ({ ...prev, genre: GENRES[nextIndex] }));
  };

  const handleGenrePrev = () => {
    const currentIndex = GENRES.findIndex(g => g === formData.genre);
    const prevIndex = currentIndex === -1 ? GENRES.length - 1 : (currentIndex - 1 + GENRES.length) % GENRES.length;
    setFormData(prev => ({ ...prev, genre: GENRES[prevIndex] }));
  };

  const getGenreAngle = () => {
    const currentIndex = GENRES.findIndex(g => g === formData.genre);
    return currentIndex === -1 ? 0 : (currentIndex * (360 / GENRES.length));
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
      hero4_habits: formData.hero4_habits
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
  return <div className="min-h-screen mixer-desk-bg p-4 md:p-8">
      <div className="max-w-6xl mx-auto mixer-chassis">
        {/* Header */}
        <div className="text-center mb-12 mixer-panel">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 mixer-nameplate">Конструктор сказок</h1>
          <p className="text-xl text-muted-foreground mixer-subtitle">Создай свою историю</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column - Controls */}
          <div className="space-y-8">
            {/* Genre */}
            <div className="mixer-control-section">
              <label className="mixer-control-label">
                Выбери жанр истории
              </label>
              
              {/* Hidden select for form submission */}
              <select 
                className="mixer-select-hidden" 
                value={formData.genre} 
                onChange={e => setFormData(prev => ({ ...prev, genre: e.target.value }))}
                tabIndex={-1}
                aria-hidden="true"
              >
                <option value="">Выберите жанр...</option>
                {GENRES.map(genre => <option key={genre} value={genre}>{genre}</option>)}
              </select>

              {/* Custom Genre Carousel */}
              <div className="genre-carousel-container">
                {/* Genre Display Screen */}
                <div className="genre-display">
                  <div className="genre-display-text" aria-live="polite">
                    {formData.genre || 'не выбран'}
                  </div>
                </div>
                
                {/* Carousel Control */}
                <div 
                  className="genre-carousel"
                  role="listbox" 
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      handleGenrePrev();
                    } else if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      handleGenreNext();
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      // Enter can be used for confirmation if needed
                    }
                  }}
                >
                  <button 
                    className="genre-arrow genre-arrow-left"
                    onClick={handleGenrePrev}
                    aria-label="Предыдущий жанр"
                  >
                    ◀
                  </button>
                  
                  <div className="genre-disk">
                    <div 
                      className="genre-disk-inner"
                      style={{ transform: `rotate(${getGenreAngle()}deg)` }}
                    >
                      <div className="genre-indicator"></div>
                    </div>
                  </div>
                  
                  <button 
                    className="genre-arrow genre-arrow-right"
                    onClick={handleGenreNext}
                    aria-label="Следующий жанр"
                  >
                    ▶
                  </button>
                </div>
              </div>
            </div>

            {/* Tone Control */}
            <div className="mixer-control-section">
              <label className="mixer-control-label">
                Тон повествования
              </label>
              <div className="flex items-center gap-8">
                {/* Large Rotary Knob */}
                <div className="mixer-tone-knob" style={{
                transform: `rotate(${knobAngle}deg)`
              }} onClick={handleKnobClick} />
                
                {/* Display Screen */}
                <div className="flex-1 mixer-tone-display">
                  <div className="mixer-tone-display-text">
                    {formData.tone || 'не выбран'}
                  </div>
                </div>
              </div>
              
            </div>

            {/* Form Toggle */}
            <div className="mixer-control-section">
              
              <div className="flex items-center gap-4">
                <span className={formData.form === 'adult' ? 'mixer-toggle-label active' : 'mixer-toggle-label'}>Для взрослых</span>
                <div className={`mixer-toggle ${formData.form === 'kids' ? 'active' : ''}`} onClick={() => setFormData(prev => ({
                ...prev,
                form: prev.form === 'adult' ? 'kids' : 'adult'
              }))}>
                  <div className="mixer-toggle-handle" />
                </div>
                <span className={formData.form === 'kids' ? 'mixer-toggle-label active' : 'mixer-toggle-label'}>Для детей</span>
              </div>
            </div>

            {/* Ending Dial */}
            <div className="mixer-control-section">
              <label className="mixer-control-label">
                Развязка истории
              </label>
              <div className="flex items-center gap-6">
                <div className="mixer-dial">
                  <div className="mixer-dial-face">
                    <div className="mixer-dial-pointer" style={{
                    transform: `translate(-50%, -100%) rotate(${ENDINGS.indexOf(formData.ending) * 90}deg)`
                  }} />
                    {/* Sector labels */}
                    <div className="absolute inset-0">
                      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xs mixer-dial-label">М</div>
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs mixer-dial-label">Х</div>
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs mixer-dial-label">Г</div>
                      <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs mixer-dial-label">Н</div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xl font-semibold mixer-display-value mb-2">
                    {ENDING_LABELS[formData.ending]}
                  </div>
                  <button className="mixer-mechanical-btn" onClick={handleEndingChange}>
                    Переключить
                  </button>
                </div>
              </div>
              <p className="mixer-hint">
                Нажми, чтобы сменить развязку
              </p>
            </div>
          </div>

          {/* Right Column - Story Details */}
          <div className="space-y-8">
            {/* Email Field */}
            <div className="mixer-control-section">
              <div className="space-y-4">
                <div>
                  <label className="mixer-control-label">
                    Почта (обязательно)
                  </label>
                  <input type="email" className={`mixer-input ${formData.email && !validateEmail(formData.email) ? 'mixer-input-error' : ''}`} value={formData.email} onChange={e => setFormData(prev => ({
                  ...prev,
                  email: e.target.value
                }))} placeholder="name@example.com" autoComplete="email" required />
                  <p className="mixer-hint">
                    Мы вышлем PDF на этот адрес.
                  </p>
                </div>
              </div>
            </div>

            {/* Location & Artifact */}
            <div className="mixer-control-section">
              <div className="space-y-4">
                <div>
                  <label className="mixer-control-label">
                    Место действия
                  </label>
                  <input type="text" className="mixer-input" value={formData.location} onChange={e => setFormData(prev => ({
                  ...prev,
                  location: e.target.value
                }))} placeholder="Мехико или Заколдованный лес..." />
                </div>
                <div>
                  <label className="mixer-control-label">
                    Артефакт
                  </label>
                  <input type="text" className="mixer-input" value={formData.artifact} onChange={e => setFormData(prev => ({
                  ...prev,
                  artifact: e.target.value
                }))} placeholder="личный предмет или знакомое событие..." />
                </div>
              </div>
            </div>

            {/* Heroes Section */}
            <div className="mixer-control-section">
              <h3 className="mixer-section-title">Персонажи</h3>
              
              {/* Main Hero */}
              <div className="mixer-hero-panel">
                <h4 className="mixer-hero-title">Главный герой</h4>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Имя" className="mixer-input" value={formData.hero1_name} onChange={e => setFormData(prev => ({
                  ...prev,
                  hero1_name: e.target.value
                }))} />
                  <input type="number" placeholder="Возраст" className="mixer-input" value={formData.hero1_age || ''} onChange={e => setFormData(prev => ({
                  ...prev,
                  hero1_age: parseInt(e.target.value) || 0
                }))} />
                  <input type="text" placeholder="Профессия" className="mixer-input" value={formData.hero1_job} onChange={e => setFormData(prev => ({
                  ...prev,
                  hero1_job: e.target.value
                }))} />
                  <input type="text" placeholder="Черты характера" className="mixer-input" value={formData.hero1_traits} onChange={e => setFormData(prev => ({
                  ...prev,
                  hero1_traits: e.target.value
                }))} />
                  <input type="text" placeholder="Страхи" className="mixer-input" value={formData.hero1_fear} onChange={e => setFormData(prev => ({
                  ...prev,
                  hero1_fear: e.target.value
                }))} />
                  <input type="text" placeholder="Привычки" className="mixer-input" value={formData.hero1_habits} onChange={e => setFormData(prev => ({
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
                      <h4 className="mixer-hero-title">Герой {heroNum}</h4>
                      <div className={`mixer-toggle ${isVisible ? 'active' : ''}`} onClick={() => setHeroSections(prev => ({
                    ...prev,
                    [heroKey]: !prev[heroKey]
                  }))}>
                        <div className="mixer-toggle-handle" />
                      </div>
                    </div>
                    
                    {isVisible && <div className="mixer-hero-panel">
                        <div className="grid grid-cols-2 gap-4">
                          <input type="text" placeholder="Имя" className="mixer-input" value={formData[`hero${heroNum}_name` as keyof FormData] as string} onChange={e => setFormData(prev => ({
                      ...prev,
                      [`hero${heroNum}_name`]: e.target.value
                    }))} />
                          <input type="number" placeholder="Возраст" className="mixer-input" value={formData[`hero${heroNum}_age` as keyof FormData] as number || ''} onChange={e => setFormData(prev => ({
                      ...prev,
                      [`hero${heroNum}_age`]: parseInt(e.target.value) || 0
                    }))} />
                          <input type="text" placeholder="Профессия" className="mixer-input" value={formData[`hero${heroNum}_job` as keyof FormData] as string} onChange={e => setFormData(prev => ({
                      ...prev,
                      [`hero${heroNum}_job`]: e.target.value
                    }))} />
                          <input type="text" placeholder="Черты характера" className="mixer-input" value={formData[`hero${heroNum}_traits` as keyof FormData] as string} onChange={e => setFormData(prev => ({
                      ...prev,
                      [`hero${heroNum}_traits`]: e.target.value
                    }))} />
                          <input type="text" placeholder="Страхи" className="mixer-input" value={formData[`hero${heroNum}_fear` as keyof FormData] as string} onChange={e => setFormData(prev => ({
                      ...prev,
                      [`hero${heroNum}_fear`]: e.target.value
                    }))} />
                          <input type="text" placeholder="Привычки" className="mixer-input" value={formData[`hero${heroNum}_habits` as keyof FormData] as string} onChange={e => setFormData(prev => ({
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
        <div className="mt-12 text-center mixer-panel">
          <button className="mixer-main-button text-2xl px-12 py-6 mb-4" onClick={handleSubmit} disabled={showLoader}>
            {showLoader ? 'Отправка...' : 'Создать сказку'}
          </button>
          
          <p className="mixer-subtitle mb-6">
            Время генерации 2–4 мин. PDF придёт на указанную почту.
          </p>
        </div>

        {/* Loader Modal */}
        {showLoader && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="mixer-modal-panel max-w-md text-center">
              <div className="mixer-loading-indicator" />
              <h3 className="text-xl font-semibold mixer-display-value mb-2">
                Задача отправлена
              </h3>
              <p className="mixer-subtitle">
                Обработка запроса...
              </p>
            </div>
          </div>}

        {/* Email Progress Overlay */}
        {showEmailOverlay && <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50" style={{
        display: 'block'
      }} aria-hidden="true" onClick={hideEmailOverlayHandler}>
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-lg mx-4 bg-[#111a22] text-[#eaf2f6] border border-[#1b2d3a] rounded-2xl shadow-2xl p-6" role="dialog" aria-modal="true" aria-labelledby="email-title" onClick={e => e.stopPropagation()}>
              <h3 id="email-title" className="text-2xl font-semibold mb-2 mixer-nameplate">
                Почти готово!
              </h3>
              <p className="mb-4 mixer-subtitle">
                Через несколько минут сказка окажется у вас на почте.
              </p>
              <div className="w-full h-3 border border-white/8 rounded-lg bg-white/8 overflow-hidden" aria-label="Загрузка">
                <div id="email-progress" className="h-full bg-gradient-to-r from-[#63d2ff] to-[#e6a648] transition-all duration-200 ease-linear" style={{
              width: '0%'
            }} />
              </div>
            </div>
          </div>}
      </div>
    </div>;
};
export default Index;