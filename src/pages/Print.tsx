import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const Print = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailModal, setShowFailModal] = useState(false);

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      setShowSuccessModal(true);
    } else if (status === "fail") {
      setShowFailModal(true);
    }
  }, [searchParams]);

  const clearStatusParam = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("status");
    setSearchParams(newParams, { replace: true });
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    clearStatusParam();
  };

  const handleCloseFail = () => {
    setShowFailModal(false);
    clearStatusParam();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#031B28] via-[#083248] to-[#0B2838] py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* A. Заголовок */}
        <div className="text-center mb-10">
          <h1 className="font-playfair text-3xl md:text-4xl text-[#E89C31] mb-3">
            Страница оплаты
          </h1>
          <p className="text-[#DBA858]/80 text-lg">
            Мы напечатаем вашу персональную сказку в мягкой обложке и доставим вам.
          </p>
        </div>

        {/* B. Что входит */}
        <div className="bg-[#0B2838]/60 rounded-2xl p-6 mb-8 border border-[#E89C31]/20">
          <h2 className="font-playfair text-xl text-[#E89C31] mb-4">Что входит</h2>
          <ul className="space-y-3 text-[#DBA858]/90">
            <li className="flex items-start gap-3">
              <span className="text-xl">📖</span>
              <span>Та же сказка из 5 глав, что пришла в PDF</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-xl">🎨</span>
              <span>Цветная обложка и иллюстрации</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-xl">🧾</span>
              <span>Подтверждение оплаты придет на email</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-xl">🚚</span>
              <span>Доставка включена в стоимость</span>
            </li>
          </ul>
        </div>

        {/* C. Цена */}
        <div className="text-center mb-8">
          <div className="text-5xl font-playfair text-[#E89C31] mb-2">2 500 ₽</div>
          <p className="text-[#DBA858]/70 text-sm">
            Цена фиксированная, без скрытых доплат.
          </p>
        </div>

        {/* D. Важное уточнение */}
        <div className="bg-[#E89C31]/10 rounded-xl p-5 mb-8 border border-[#E89C31]/30">
          <p className="text-[#DBA858]/90 text-sm leading-relaxed">
            Пожалуйста, укажите корректные email и телефон — мы пришлем подтверждение 
            и сможем связаться по доставке. Адрес вводите полностью: город, улица, дом, квартира.
          </p>
        </div>

        {/* E. Форма оплаты Юкассы */}
        <div className="mb-8">
          <link 
            rel="stylesheet" 
            href="https://yookassa.ru/integration/simplepay/css/yookassa_construct_form.css?v=1.30.0" 
          />
          <style>{`
            .yoomoney-payment-form .ym-input {
              width: 100% !important;
              padding: 16px !important;
              font-size: 16px !important;
              margin-bottom: 12px !important;
              display: block !important;
              color: #000000 !important;
              background: #ffffff !important;
            }
            .yoomoney-payment-form .ym-input::placeholder {
              color: #666666 !important;
            }
            .yoomoney-payment-form .ym-customer-info {
              display: flex !important;
              flex-direction: column !important;
            }
            .yoomoney-payment-form .ym-block-title {
              color: #E89C31 !important;
              font-size: 18px !important;
              font-weight: 600 !important;
            }
            .yoomoney-payment-form .ym-btn-pay {
              padding: 20px 40px !important;
              font-size: 20px !important;
              width: 100% !important;
              min-height: 60px !important;
              background: #E89C31 !important;
              border: none !important;
              border-radius: 8px !important;
              cursor: pointer !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
            }
            .yoomoney-payment-form .ym-btn-pay .ym-text-crop {
              color: #000000 !important;
              font-weight: 600 !important;
              text-align: center !important;
            }
            .yoomoney-payment-form .ym-price-output {
              display: none !important;
            }
            .yoomoney-payment-form .ym-payment-btn-block {
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              gap: 24px !important;
              margin-top: 20px !important;
            }
            .yoomoney-payment-form .ym-logo {
              margin-top: 16px !important;
            }
          `}</style>
          <form 
            className="yoomoney-payment-form"
            action="https://yookassa.ru/integration/simplepay/payment"
            method="post"
            acceptCharset="utf-8"
          >
            <div className="ym-customer-info">
              <div className="ym-block-title">Информация для оплаты</div>
              <input name="cps_email" className="ym-input" placeholder="Email (для подтверждения)" type="text" />
              <input name="cps_phone" className="ym-input" placeholder="Телефон" type="text" />
              <input name="custName" className="ym-input" placeholder="ФИО получателя" type="text" />
              <input name="custAddr" className="ym-input" placeholder="Адрес доставки (город, улица, дом, квартира)" type="text" />
            </div>

            <div className="ym-hidden-inputs">
              <input name="shopSuccessURL" type="hidden" value="https://fairyteller.ru/print?status=success" />
              <input name="shopFailURL" type="hidden" value="https://fairyteller.ru/print?status=fail" />
            </div>

            <input name="sum" type="hidden" value="2500" />
            <input name="shopId" type="hidden" value="1228521" />

            <div className="ym-payment-btn-block ym-before-line">
              <button className="ym-btn-pay" type="submit">
                <span className="ym-text-crop">Оплатить</span>
              </button>
              <img 
                src="https://yookassa.ru/integration/simplepay/img/iokassa-gray.svg?v=1.30.0"
                className="ym-logo"
                width="114"
                height="27"
                alt="ЮKassa"
              />
            </div>
          </form>
          <script src="https://yookassa.ru/integration/simplepay/js/yookassa_construct_form.js?v=1.30.0"></script>
        </div>

        {/* F. Доверие */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-[#DBA858]/70 text-sm mt-14">
          <span className="flex items-center gap-2">
            <span>🔒</span> Оплата проходит через Юкассу
          </span>
          <span className="flex items-center gap-2">
            <span>💳</span> Банковские карты РФ
          </span>
        </div>
      </div>

      {/* Модалка "Успех" */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="bg-[#0B2838] border-[#E89C31]/30">
          <DialogHeader>
            <DialogTitle className="text-[#E89C31] font-playfair text-2xl">
              Оплата прошла успешно
            </DialogTitle>
            <DialogDescription className="text-[#DBA858]/90 pt-4">
              Спасибо! Мы получили оплату. В ближайшее время мы напишем вам на email. 
              Если вы указали адрес доставки, дополнительно ничего делать не нужно.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleCloseSuccess}
              className="bg-[#E89C31] hover:bg-[#DBA858] text-[#031B28]"
            >
              Закрыть
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Модалка "Неуспех" */}
      <Dialog open={showFailModal} onOpenChange={setShowFailModal}>
        <DialogContent className="bg-[#0B2838] border-[#E89C31]/30">
          <DialogHeader>
            <DialogTitle className="text-[#E89C31] font-playfair text-2xl">
              Оплата не прошла
            </DialogTitle>
            <DialogDescription className="text-[#DBA858]/90 pt-4">
              Похоже, платеж не завершился. Попробуйте еще раз — это займет минуту.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="outline"
              onClick={handleCloseFail}
              className="border-[#E89C31]/50 text-[#DBA858] hover:bg-[#E89C31]/10"
            >
              Закрыть
            </Button>
            <Button 
              onClick={handleCloseFail}
              className="bg-[#E89C31] hover:bg-[#DBA858] text-[#031B28]"
            >
              Попробовать снова
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Print;
