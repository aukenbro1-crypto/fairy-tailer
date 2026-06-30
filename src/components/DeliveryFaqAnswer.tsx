type DeliveryFaqAnswerProps = {
  answer: string;
  deliveryHref?: string;
  linkClassName?: string;
};

const linkText = "здесь";

export const DeliveryFaqAnswer = ({
  answer,
  deliveryHref,
  linkClassName = "underline hover:opacity-80",
}: DeliveryFaqAnswerProps) => {
  if (!deliveryHref) {
    return <>{answer}</>;
  }

  const linkTextIndex = answer.indexOf(linkText);

  if (linkTextIndex === -1) {
    return (
      <>
        {answer}{" "}
        <a href={deliveryHref} className={linkClassName}>
          {linkText}
        </a>
        .
      </>
    );
  }

  return (
    <>
      {answer.slice(0, linkTextIndex)}
      <a href={deliveryHref} className={linkClassName}>
        {linkText}
      </a>
      {answer.slice(linkTextIndex + linkText.length)}
    </>
  );
};
