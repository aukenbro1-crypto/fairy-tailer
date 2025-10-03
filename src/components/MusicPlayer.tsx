import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

export const MusicPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fade = (
    target: HTMLAudioElement,
    from: number,
    to: number,
    ms: number,
    callback?: () => void
  ) => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    const steps = 20;
    const step = (to - from) / steps;
    const gap = ms / steps;
    let v = from;
    let n = 0;

    fadeIntervalRef.current = setInterval(() => {
      v += step;
      n++;
      target.volume = Math.min(1, Math.max(0, v));
      if (n >= steps) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
        }
        callback?.();
      }
    }, gap);
  };

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!isPlaying) {
      try {
        audio.volume = 0.0;
        await audio.play();
        fade(audio, 0.0, 0.6, 1000);
        setIsPlaying(true);
      } catch (e) {
        console.warn('Autoplay blocked:', e);
      }
    } else {
      fade(audio, audio.volume, 0.0, 600, () => {
        audio.pause();
        setIsPlaying(false);
      });
    }
  };

  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!isPlaying) {
        toggleMusic();
      }
      document.removeEventListener('pointerdown', handleFirstInteraction);
    };

    document.addEventListener('pointerdown', handleFirstInteraction, { once: true });

    return () => {
      document.removeEventListener('pointerdown', handleFirstInteraction);
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <div className="fixed right-4 bottom-4 z-50">
      <audio ref={audioRef} src="/FairyTaler_song.mp3" preload="auto" loop />
      <Button
        onClick={toggleMusic}
        aria-pressed={isPlaying}
        variant="outline"
        className="backdrop-blur-sm bg-background/80 border-border/50"
      >
        {isPlaying ? '⏸ Pause ambience' : '▶ Play ambience'}
      </Button>
    </div>
  );
};
