import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import logoImage from "@/assets/logo.png";

const PRINT_VIEW_NOTIFY_URL = "/api/fairyteller/print/payment-page-view";

const typeStyle = {
  fontFamily:
    '"Avenir Next", "Helvetica Neue", Jost, Futura, Arial, sans-serif',
};

const Print = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailModal, setShowFailModal] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const paymentStatus = searchParams.get("status");

  const initialPdfUrl = useMemo(() => {
    return searchParams.get("pdf") || searchParams.get("pdfUrl") || "";
  }, [searchParams]);

  useEffect(() => {
    if (paymentStatus === "success") {
      setShowSuccessModal(true);
    } else if (paymentStatus === "fail") {
      setShowFailModal(true);
    }
  }, [paymentStatus]);

  useEffect(() => {
    if (paymentStatus) return;

    const payload = JSON.stringify({
      pdfUrl: initialPdfUrl,
      referrer: document.referrer,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(PRINT_VIEW_NOTIFY_URL, new Blob([payload], { type: "application/json" }));
      return;
    }

    void fetch(PRINT_VIEW_NOTIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  }, [initialPdfUrl, paymentStatus]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;

    if (!form.checkValidity()) {
      event.preventDefault();
      form.reportValidity();
      return;
    }

    if (!consentChecked) {
      event.preventDefault();
      alert("Пожалуйста, подтвердите согласие на обработку персональных данных");
    }
  };

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
    <main className="print-page min-h-screen bg-[#fffaf0] px-5 py-8 text-black md:px-8 md:py-10" style={typeStyle}>
      <style>{`
        .print-page,
        .print-page * {
          box-sizing: border-box;
          min-width: 0;
        }

        .print-page h1,
        .print-page h2 {
          color: #111111;
          font-family: "Avenir Next", "Helvetica Neue", Jost, Futura, Arial, sans-serif;
          letter-spacing: 0;
          text-shadow: none;
        }

        .print-page input,
        .print-page button {
          font-family: inherit;
        }

        .print-payment-card {
          background: #ffffff;
          box-shadow: 10px 10px 0 #111111;
        }

        .print-page .yoomoney-payment-form {
          display: grid;
          gap: 24px;
        }

        .print-page .ym-customer-info {
          display: grid !important;
          gap: 14px !important;
        }

        .print-page .ym-block-title {
          color: #111111 !important;
          font-size: 15px !important;
          font-weight: 900 !important;
          letter-spacing: 0.14em !important;
          line-height: 1.25 !important;
          margin-bottom: 8px !important;
          text-transform: uppercase !important;
        }

        .print-field-label {
          display: grid;
          gap: 8px;
          color: #5e6264;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.14em;
          line-height: 1.2;
          text-transform: uppercase;
        }

        .print-page .ym-input {
          width: 100% !important;
          min-height: 58px !important;
          padding: 16px 18px !important;
          border: 2px solid #111111 !important;
          border-radius: 8px !important;
          background: #ffffff !important;
          color: #111111 !important;
          display: block !important;
          font-size: 18px !important;
          font-weight: 600 !important;
          line-height: 1.25 !important;
          margin: 0 !important;
          outline: none !important;
        }

        .print-page .ym-input::placeholder {
          color: #777777 !important;
          font-weight: 500 !important;
        }

        .print-page .ym-input:focus {
          box-shadow: 4px 4px 0 #e89c31 !important;
        }

        .print-page .ym-price-output,
        .print-page .ym-logo {
          display: none !important;
        }

        .print-page .ym-payment-btn-block {
          display: grid !important;
          margin-top: 6px !important;
          position: static !important;
        }

        .print-page .ym-btn-pay {
          align-items: center !important;
          background: #111111 !important;
          border: 1px solid #111111 !important;
          border-radius: 8px !important;
          box-shadow: 8px 8px 0 #e89c31 !important;
          cursor: pointer !important;
          display: inline-flex !important;
          justify-content: center !important;
          min-height: 62px !important;
          padding: 18px 24px !important;
          transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease !important;
          width: 100% !important;
        }

        .print-page .ym-btn-pay:hover {
          background: #5e6264 !important;
          box-shadow: 4px 4px 0 #e89c31 !important;
          transform: translate(4px, 4px);
        }

        .print-page .ym-btn-pay .ym-text-crop {
          color: #ffffff !important;
          font-size: 15px !important;
          font-weight: 900 !important;
          letter-spacing: 0.08em !important;
          max-width: none !important;
          overflow: visible !important;
          text-overflow: clip !important;
          text-transform: uppercase !important;
          white-space: nowrap !important;
          width: auto !important;
        }
      `}</style>

      <div className="mx-auto mb-8 flex max-w-[760px] items-center justify-between gap-4">
        <Link to="/" aria-label="Fairyteller">
          <img src={logoImage} alt="Fairyteller" className="h-11 w-auto object-contain" />
        </Link>
        <span className="text-right text-[10px] font-black uppercase tracking-[0.16em] text-[#5e6264]">
          Оплата печати
        </span>
      </div>

      <section className="print-payment-card mx-auto max-w-[760px] border-2 border-black px-5 py-8 md:px-14 md:py-12">
        <p className="text-[13px] font-black uppercase tracking-[0.22em] text-[#5e6264]">
          Оплата печати
        </p>
        <h1 className="mt-5 text-[34px] font-black uppercase leading-none md:text-[52px]">
          Печатная книга
        </h1>
        <p className="mt-5 max-w-[560px] text-[20px] leading-8 text-[#5e6264]">
          Укажите контактные данные и полный адрес доставки.
        </p>

        <div className="mt-8">
          <div className="text-[48px] font-black leading-none md:text-[64px]">3 500 ₽</div>
          <div className="mt-2 text-[13px] font-black uppercase tracking-[0.16em] text-[#5e6264]">
            Итоговая цена
          </div>
        </div>

        <div className="my-9 border-t-2 border-black" />

        <link
          rel="stylesheet"
          href="https://yookassa.ru/integration/simplepay/css/yookassa_construct_form.css?v=1.30.0"
        />
        <form
          className="yoomoney-payment-form"
          action="https://yookassa.ru/integration/simplepay/payment"
          method="post"
          acceptCharset="utf-8"
          onSubmit={handleSubmit}
        >
          <div className="ym-customer-info">
            <div className="ym-block-title">Данные для оплаты и доставки</div>
            <label className="print-field-label">
              Email
              <input
                name="cps_email"
                className="ym-input"
                placeholder="Для подтверждения оплаты"
                required
                type="email"
              />
            </label>
            <label className="print-field-label">
              Телефон
              <input name="cps_phone" className="ym-input" placeholder="+7 999 000-00-00" required type="tel" />
            </label>
            <label className="print-field-label">
              Получатель
              <input name="custName" className="ym-input" placeholder="ФИО получателя" required type="text" />
            </label>
            <label className="print-field-label">
              Адрес доставки
              <input name="custAddr" className="ym-input" placeholder="Город, улица, дом, квартира" required type="text" />
            </label>
            <label className="print-field-label">
              Ссылка на PDF
              <input
                name="pdfUrl"
                className="ym-input"
                defaultValue={initialPdfUrl}
                placeholder="https://fairyteller.ru/..."
                required
                type="url"
              />
            </label>

            <label className="mt-2 flex cursor-pointer items-start gap-4 border-2 border-black bg-[#fae7e1] p-5">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(event) => setConsentChecked(event.target.checked)}
                required
                className="mt-1 h-6 w-6 shrink-0 cursor-pointer accent-[#111111]"
              />
              <span className="text-[16px] font-black leading-7 text-[#3f4447]">
                Даю согласие на обработку персональных данных для оплаты и доставки заказа.
              </span>
            </label>
          </div>

          <div className="ym-hidden-inputs">
            <input name="shopSuccessURL" type="hidden" value="https://fairyteller.ru/pay?status=success" />
            <input name="shopFailURL" type="hidden" value="https://fairyteller.ru/pay?status=fail" />
          </div>

          <input name="sum" type="hidden" value="3500" />
          <input name="shopId" type="hidden" value="1228521" />

          <div className="ym-payment-btn-block ym-before-line">
            <button className="ym-btn-pay" type="submit">
              <span className="ym-text-crop">Оплатить книгу</span>
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
      </section>

      <Dialog
        open={showSuccessModal}
        onOpenChange={(open) => {
          setShowSuccessModal(open);
          if (!open) clearStatusParam();
        }}
      >
        <DialogContent className="border border-black bg-[#fffaf0] text-black sm:rounded-md">
          <DialogHeader>
            <DialogTitle className="text-[28px] font-black uppercase text-black">
              Оплата прошла успешно
            </DialogTitle>
            <DialogDescription className="pt-4 text-[15px] font-semibold leading-7 text-[#5e6264]">
              Спасибо! Мы получили оплату. В ближайшее время напишем вам на email.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button onClick={handleCloseSuccess} className="bg-black text-white hover:bg-[#5e6264]">
              Закрыть
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showFailModal}
        onOpenChange={(open) => {
          setShowFailModal(open);
          if (!open) clearStatusParam();
        }}
      >
        <DialogContent className="border border-black bg-[#fffaf0] text-black sm:rounded-md">
          <DialogHeader>
            <DialogTitle className="text-[28px] font-black uppercase text-black">
              Оплата не прошла
            </DialogTitle>
            <DialogDescription className="pt-4 text-[15px] font-semibold leading-7 text-[#5e6264]">
              Похоже, платеж не завершился. Проверьте данные карты или попробуйте еще раз.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleCloseFail}
              className="border-black text-black hover:bg-[#fae7e1]"
            >
              Закрыть
            </Button>
            <Button onClick={handleCloseFail} className="bg-black text-white hover:bg-[#5e6264]">
              Попробовать снова
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Print;
