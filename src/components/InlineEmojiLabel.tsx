import { useLanguage } from "../context/LanguageContext";
import { pickBilingual, type Bilingual } from "../utils/bilingual";

interface InlineEmojiLabelProps {
  text: Bilingual | string;
  emoji?: string;
  className?: string;
  /** Default: before text. Home uses after. */
  emojiPosition?: "before" | "after";
}

/** Emoji and label text on one line (flex row). */
export function InlineEmojiLabel({
  text,
  emoji,
  className = "",
  emojiPosition = "before",
}: InlineEmojiLabelProps) {
  const { language } = useLanguage();
  const label = typeof text === "string" ? text : pickBilingual(text, language);

  if (!emoji) {
    return <span className={className}>{label}</span>;
  }

  const emojiEl = (
    <span className="inline-emoji-label__emoji" aria-hidden="true">
      {emoji}
    </span>
  );
  const textEl = <span className="inline-emoji-label__text">{label}</span>;

  return (
    <span className={`inline-emoji-label${className ? ` ${className}` : ""}`}>
      {emojiPosition === "after" ? (
        <>
          {textEl}
          {emojiEl}
        </>
      ) : (
        <>
          {emojiEl}
          {textEl}
        </>
      )}
    </span>
  );
}
