import { useLanguage } from "../context/LanguageContext";
import { pickBilingual, type Bilingual } from "../utils/bilingual";

interface InlineEmojiLabelProps {
  text: Bilingual | string;
  emoji?: string;
  className?: string;
}

/** Emoji left of label text on one line (flex row). */
export function InlineEmojiLabel({ text, emoji, className = "" }: InlineEmojiLabelProps) {
  const { language } = useLanguage();
  const label = typeof text === "string" ? text : pickBilingual(text, language);

  if (!emoji) {
    return <span className={className}>{label}</span>;
  }

  return (
    <span className={`inline-emoji-label${className ? ` ${className}` : ""}`}>
      <span className="inline-emoji-label__emoji" aria-hidden="true">
        {emoji}
      </span>
      <span className="inline-emoji-label__text">{label}</span>
    </span>
  );
}
