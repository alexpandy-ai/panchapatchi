import type { Bilingual } from "../utils/bilingual";

interface BilingualTextProps {
  text: Bilingual | string;
  className?: string;
  /** Stack Tamil above English (default). */
  block?: boolean;
}

export function BilingualText({ text, className = "", block = true }: BilingualTextProps) {
  if (typeof text === "string") {
    return <span className={className}>{text}</span>;
  }

  if (!block) {
    return (
      <span className={`bilingual bilingual--inline ${className}`.trim()}>
        <span className="bi-ta">{text.ta}</span>
        <span className="bi-sep" aria-hidden="true">
          {" "}
          ·{" "}
        </span>
        <span className="bi-en">{text.en}</span>
      </span>
    );
  }

  return (
    <span className={`bilingual ${className}`.trim()}>
      <span className="bi-ta">{text.ta}</span>
      <span className="bi-en">{text.en}</span>
    </span>
  );
}
