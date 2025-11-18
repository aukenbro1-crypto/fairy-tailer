import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface WelcomeBannerProps {
  open: boolean;
  onClose: () => void;
}

export const WelcomeBanner = ({ open, onClose }: WelcomeBannerProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl border-0 bg-gradient-to-br from-amber-50/95 via-orange-50/95 to-rose-50/95 backdrop-blur-sm shadow-2xl p-8 sm:p-12">
        <div className="space-y-6 text-center">
          <div className="space-y-4">
            <p className="text-lg sm:text-xl leading-relaxed text-foreground/90">
              Привет! Это конструктор иллюстрированных сказок, созданных вместе с искусственным интеллектом.
            </p>
            <p className="text-base sm:text-lg leading-relaxed text-foreground/80">
              Укажите несколько параметров — и через пару минут на вашу почту придет готовая история, где героями станете вы, ваши дети, друзья или кто угодно ещё.
            </p>
          </div>

          <div className="pt-4 space-y-3">
            <h3 className="text-lg sm:text-xl font-semibold text-foreground/90">
              Экспериментируйте.
            </h3>
            <p className="text-sm sm:text-base leading-relaxed text-foreground/75">
              Правила ввода здесь гибкие: можно выбрать целый город, конкретный район, любимое место или даже чистую абстракцию. Иногда самые смелые идеи рождают самые живые сказки.
            </p>
          </div>

          <div className="pt-6">
            <Button
              onClick={onClose}
              size="lg"
              className="px-12 py-6 text-base font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              OK
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
