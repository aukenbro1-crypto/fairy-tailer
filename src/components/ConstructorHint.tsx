import { useId, useState } from "react";
import { Lightbulb } from "lucide-react";

const constructorHintLead =
  "Чем больше личных и конкретных деталей вы добавите, тем интереснее получится история.";

const ConstructorHint = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const hintId = useId();

  return (
    <span
      className="relative inline-flex shrink-0"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => {
        if (!isPinned) {
          setIsOpen(false);
        }
      }}
    >
      <style>
        {`
          @keyframes fairyteller-bulb-breathe {
            0%, 100% {
              box-shadow: 0 0 0 0 rgba(232, 156, 49, 0.26);
            }
            50% {
              box-shadow: 0 0 0 7px rgba(232, 156, 49, 0), 0 0 18px 2px rgba(232, 156, 49, 0.3);
            }
          }

          .fairyteller-constructor-hint-trigger {
            animation: fairyteller-bulb-breathe 2.7s ease-in-out infinite;
          }

          @media (prefers-reduced-motion: reduce) {
            .fairyteller-constructor-hint-trigger {
              animation: none;
            }
          }
        `}
      </style>
      <button
        type="button"
        className="fairyteller-constructor-hint-trigger inline-flex h-10 w-10 items-center justify-center border border-black bg-[#f7c948] text-black transition hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        aria-label="Подсказка по конструктору"
        aria-expanded={isOpen}
        aria-pressed={isPinned}
        aria-controls={hintId}
        onClick={(event) => {
          event.preventDefault();
          const nextPinned = !isPinned;
          setIsPinned(nextPinned);
          setIsOpen(nextPinned);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          setIsOpen(false);
          setIsPinned(false);
        }}
      >
        <Lightbulb className="h-5 w-5" strokeWidth={2.4} />
      </button>
      {isOpen && (
        <span
          id={hintId}
          role="note"
          className="pointer-events-none absolute left-1/2 top-[calc(100%+12px)] z-40 block w-[min(720px,calc(100vw-40px))] -translate-x-1/2 space-y-3 border border-black bg-[#fff4c7] p-4 text-left text-[14px] font-medium normal-case leading-6 tracking-normal text-black shadow-[6px_6px_0_#000] sm:left-0 sm:translate-x-0"
        >
          <strong className="block font-black">{constructorHintLead}</strong>
          <span className="block">
            Укажите место и время действия, погоду или атмосферу. Добавьте важную деталь, которая повлияет на
            сюжет: случайную вещь, семейную реликвию, внутреннюю шутку или событие.
          </span>
          <span className="block">
            Опишите характеры, привычки и отношения героев. Не понравился результат — измените несколько деталей и
            создайте новую версию.
          </span>
        </span>
      )}
    </span>
  );
};

export default ConstructorHint;
