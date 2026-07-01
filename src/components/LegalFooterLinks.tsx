import { Link } from "react-router-dom";

import { legalFooterLinks } from "@/data/legalPages";

type LegalFooterLinksProps = {
  className?: string;
  linkClassName?: string;
};

const defaultClassName = "flex flex-wrap gap-4 text-[12px] font-bold uppercase tracking-[0.12em] text-white/70";
const defaultLinkClassName = "hover:text-white hover:underline";

const LegalFooterLinks = ({
  className = defaultClassName,
  linkClassName = defaultLinkClassName,
}: LegalFooterLinksProps) => (
  <nav aria-label="Технические документы" className={className}>
    {legalFooterLinks.map((item) => (
      <Link key={item.href} to={item.href} className={linkClassName}>
        {item.label}
      </Link>
    ))}
  </nav>
);

export default LegalFooterLinks;
