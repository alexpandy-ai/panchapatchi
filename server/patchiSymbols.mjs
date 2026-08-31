/** Pancha Pakshi bird emojis (single source for Excel import). */
export const PATCHI_SYMBOL = {
  காகம்: "🐦",
  வல்லூறு: "🦅",
  கோழி: "🐔",
  ஆந்தை: "🦉",
  மயில்: "🦚",
};

const EMOJI_RE = /[\s\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2B1B}]+/gu;

export function patchiBaseName(name) {
  return String(name ?? "")
    .replace(EMOJI_RE, "")
    .trim();
}

export function formatPatchiName(name) {
  const base = patchiBaseName(name);
  const symbol = PATCHI_SYMBOL[base];
  return symbol ? `${base} ${symbol}` : String(name ?? "").trim();
}
