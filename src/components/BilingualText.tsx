import { useLanguage } from "../context/LanguageContext";
import { pickBilingual, type Bilingual } from "../utils/bilingual";

interface BilingualTextProps {
  text: Bilingual | string;
  className?: string;
  /** Kept for API compatibility; single-language display ignores layout mode. */
  block?: boolean;
}

export function BilingualText({ text, className = "" }: BilingualTextProps) {
  const { language } = useLanguage();

  if (typeof text === "string") {
    return <span className={className}>{text}</span>;
  }

  return <span className={className}>{pickBilingual(text, language)}</span>;
}
