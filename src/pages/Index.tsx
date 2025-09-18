import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

// Constants from requirements
const WEBHOOK_URL = "https://hook.eu2.make.com/c9pm5jrx6t7ki3ir3qq1e7822cai2bz9";
const DRIVE_FOLDER_URL = "https://drive.google.com/drive/folders/10Z6kk66UxTSXPelqm4Tckmq_lfz91ZZQ";
const DRIVE_REVEAL_MS = 120_000; // 2 minutes

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
const SCREEN_PARAMETERS = [
  { id: 'location', label: 'Место действия', placeholder: 'Мехико или Заколдованный лес...' },
  { id: 'artifact', label: 'Артефакт', placeholder: 'личный предмет или знакомое событие...' },
  { id: 'hero1', label: 'Главный герой', placeholder: 'Имя, возраст, профессия...' },
  { id: 'hero2', label: 'Герой 2', placeholder: 'Имя, возраст, профессия...' },
  { id: 'hero3', label: 'Герой 3', placeholder: 'Имя, возраст, профессия...' },
  { id: 'hero4', label: 'Герой 4', placeholder: 'Имя, возраст, профессия...' }
];

const Index = () => {
  const {
    toast
  } = useToast();
  const knobRef = useRef<HTMLDivElement>(null);
  const [knobAngle, setKnobAngle] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [showDriveButton, setShowDriveButton] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [currentScreenParameter, setCurrentScreenParameter] = useState(0);
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

  // Handle knob click to cycle through screen parameters
  const handleKnobClick = () => {
    const nextIndex = (currentScreenParameter + 1) % SCREEN_PARAMETERS.length;
    setCurrentScreenParameter(nextIndex);
    setKnobAngle(nextIndex * (360 / SCREEN_PARAMETERS.length));
  };
  // Initialize knob angle based on current screen parameter
  useEffect(() => {
    setKnobAngle(currentScreenParameter * (360 / SCREEN_PARAMETERS.length));
  }, []);

  // Countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setShowDriveButton(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);
  const handleEndingChange = () => {
    const currentIndex = ENDINGS.indexOf(formData.ending);
    const nextIndex = (currentIndex + 1) % ENDINGS.length;
    setFormData(prev => ({
      ...prev,
      ending: ENDINGS[nextIndex] as any
    }));
  };
  const handleSubmit = async () => {
    // Validation
    if (!formData.genre || !formData.form || !formData.ending) {
      toast({
        variant: "destructive",
        title: "Ошибка валидации",
        description: "Пожалуйста, заполните все обязательные поля."
      });
      return;
    }
    setShowLoader(true);
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        toast({
          title: "Принято",
          description: "Идёт генерация сказки..."
        });

        // Start countdown
        setCountdown(DRIVE_REVEAL_MS / 1000);
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось отправить запрос. Попробуйте снова."
      });
    } finally {
      setShowLoader(false);
    }
  };
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

            {/* Navigation Control */}
            <div className="steampunk-card">
              <label className="block text-lg font-semibold mb-4 text-brass">
                Навигация по параметрам
              </label>
              <div className="flex items-center gap-6">
                {/* Brass Knob */}
                <div 
                  ref={knobRef} 
                  className="brass-knob hover-scale cursor-pointer" 
                  style={{transform: `rotate(${knobAngle}deg)`}} 
                  onClick={handleKnobClick}
                />
                
                {/* Current Parameter Display */}
                <div className="flex-1">
                  <div className="text-xl font-semibold text-brass mb-2">
                    {SCREEN_PARAMETERS[currentScreenParameter].label}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Параметр {currentScreenParameter + 1} из {SCREEN_PARAMETERS.length}
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Поверни крутилку для переключения параметров
              </p>
            </div>

            {/* Tone Control - Hidden but functional */}
            <div className="steampunk-card">
              <label className="block text-lg font-semibold mb-4 text-brass">
                Тон повествования
              </label>
              <input type="text" className="steampunk-input mb-4" value={formData.tone} onChange={e => setFormData(prev => ({
                ...prev,
                tone: e.target.value
              }))} placeholder="Введите тон..." />
              <div className="flex flex-wrap gap-2">
                {TONE_PRESETS.map((preset) => (
                  <button 
                    key={preset} 
                    className={`px-3 py-1 rounded-full border transition-all duration-200 text-sm ${
                      formData.tone === preset 
                        ? 'bg-brass text-cta-text border-brass shadow-lg' 
                        : 'border-brass text-brass hover:bg-brass hover:text-cta-text'
                    }`}
                    onClick={() => setFormData(prev => ({...prev, tone: preset}))}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Toggle */}
            <div className="steampunk-card">
              <label className="block text-lg font-semibold mb-4 text-brass">
                Аудитория
              </label>
              <div className="flex items-center gap-4">
                <span className={formData.form === 'adult' ? 'text-brass font-semibold' : 'text-muted-foreground'}>
                  Взрослые
                </span>
                <div className={`steampunk-toggle ${formData.form === 'kids' ? 'active' : ''}`} onClick={() => setFormData(prev => ({
                ...prev,
                form: prev.form === 'adult' ? 'kids' : 'adult'
              }))}>
                  <div className="toggle-handle" />
                </div>
                <span className={formData.form === 'kids' ? 'text-brass font-semibold' : 'text-muted-foreground'}>
                  Дети
                </span>
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

          {/* Right Column - Parameter Screen */}
          <div className="space-y-8">
            {/* Parameter Screen */}
            <div className="steampunk-card">
              <div className="border-4 border-brass rounded-lg p-8 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20 min-h-[400px]">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-brass rounded-full flex items-center justify-center">
                    <div className="text-2xl font-bold text-charcoal">{currentScreenParameter + 1}</div>
                  </div>
                  <h2 className="text-3xl font-bold text-brass mb-2">
                    {SCREEN_PARAMETERS[currentScreenParameter].label}
                  </h2>
                  <div className="w-24 h-1 bg-brass mx-auto rounded-full"></div>
                </div>

                {/* Parameter Content */}
                <div className="space-y-4">
                  {currentScreenParameter === 0 && (
                    <div>
                      <input 
                        type="text" 
                        className="steampunk-input text-center text-xl" 
                        value={formData.location} 
                        onChange={e => setFormData(prev => ({...prev, location: e.target.value}))} 
                        placeholder="Мехико или Заколдованный лес..." 
                      />
                    </div>
                  )}

                  {currentScreenParameter === 1 && (
                    <div>
                      <input 
                        type="text" 
                        className="steampunk-input text-center text-xl" 
                        value={formData.artifact} 
                        onChange={e => setFormData(prev => ({...prev, artifact: e.target.value}))} 
                        placeholder="личный предмет или знакомое событие..." 
                      />
                    </div>
                  )}

                  {currentScreenParameter >= 2 && (
                    <div className="space-y-3">
                      {(() => {
                        const heroNum = currentScreenParameter - 1;
                        const heroKey = `hero${heroNum}` as keyof typeof heroSections;
                        
                        return (
                          <div>
                            {heroNum > 1 && (
                              <div className="mb-4 flex justify-center">
                                <div className={`steampunk-toggle ${heroSections[heroKey] ? 'active' : ''}`} onClick={() => setHeroSections(prev => ({
                                  ...prev,
                                  [heroKey]: !prev[heroKey]
                                }))}>
                                  <div className="toggle-handle" />
                                </div>
                                <span className="ml-3 text-muted-foreground">
                                  {heroSections[heroKey] ? 'Активен' : 'Отключен'}
                                </span>
                              </div>
                            )}
                            
                            {(heroNum === 1 || heroSections[heroKey]) && (
                              <div className="grid grid-cols-2 gap-3">
                                <input type="text" placeholder="Имя" className="steampunk-input" 
                                  value={formData[`hero${heroNum}_name` as keyof FormData] as string} 
                                  onChange={e => setFormData(prev => ({...prev, [`hero${heroNum}_name`]: e.target.value}))} />
                                <input type="number" placeholder="Возраст" className="steampunk-input" 
                                  value={formData[`hero${heroNum}_age` as keyof FormData] as number || ''} 
                                  onChange={e => setFormData(prev => ({...prev, [`hero${heroNum}_age`]: parseInt(e.target.value) || 0}))} />
                                <input type="text" placeholder="Профессия" className="steampunk-input" 
                                  value={formData[`hero${heroNum}_job` as keyof FormData] as string} 
                                  onChange={e => setFormData(prev => ({...prev, [`hero${heroNum}_job`]: e.target.value}))} />
                                <input type="text" placeholder="Черты характера" className="steampunk-input" 
                                  value={formData[`hero${heroNum}_traits` as keyof FormData] as string} 
                                  onChange={e => setFormData(prev => ({...prev, [`hero${heroNum}_traits`]: e.target.value}))} />
                                <input type="text" placeholder="Страхи" className="steampunk-input" 
                                  value={formData[`hero${heroNum}_fear` as keyof FormData] as string} 
                                  onChange={e => setFormData(prev => ({...prev, [`hero${heroNum}_fear`]: e.target.value}))} />
                                <input type="text" placeholder="Привычки" className="steampunk-input" 
                                  value={formData[`hero${heroNum}_habits` as keyof FormData] as string} 
                                  onChange={e => setFormData(prev => ({...prev, [`hero${heroNum}_habits`]: e.target.value}))} />
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Progress dots */}
                <div className="flex justify-center mt-8 space-x-2">
                  {SCREEN_PARAMETERS.map((_, index) => (
                    <div 
                      key={index}
                      className={`w-3 h-3 rounded-full transition-all duration-200 ${
                        index === currentScreenParameter 
                          ? 'bg-brass scale-125' 
                          : 'bg-brass/30'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Hidden forms for maintaining state */}
            <div style={{ display: 'none' }}>
              {/* ... keep existing code (all hidden form inputs for maintaining state) */}
            </div>
          </div>
        </div>

        {/* Submit Section */}
        <div className="mt-12 text-center">
          <button className="button-primary text-2xl px-12 py-6 mb-4" onClick={handleSubmit} disabled={showLoader}>
            {showLoader ? 'Отправка...' : 'Создать сказку'}
          </button>
          
          <p className="text-sm text-muted-foreground mb-6">
            Время генерации 2–4 мин. Ссылка на PDF появится ниже автоматически.
          </p>

          {/* Countdown Timer */}
          {countdown > 0 && <div id="drive-timer" className="mb-6">
              <div className="text-lg text-brass font-semibold">
                Генерация сказки: {formatTime(countdown)}
              </div>
              <div className="w-full bg-panel-edge rounded-full h-2 mt-2">
                <div className="bg-brass h-2 rounded-full transition-all duration-1000" style={{
              width: `${100 - countdown / (DRIVE_REVEAL_MS / 1000) * 100}%`
            }} />
              </div>
            </div>}

          {/* Drive Download Section */}
          <div className="space-y-4">
            {showDriveButton && <button id="drive-cta" className="button-primary text-xl px-8 py-4 glow" onClick={() => window.open(DRIVE_FOLDER_URL, '_blank')}>
                Скачать PDF (Google Drive)
              </button>}
            

            {showDriveButton && <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Если файл ещё не виден в папке, обновите её через 10–20 секунд — 
                Google Drive может отображать файлы с задержкой.
              </p>}
          </div>
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
      </div>
    </div>;
};
export default Index;