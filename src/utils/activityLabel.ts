import { activityBilingual, type Bilingual } from "./bilingual";

const SHORT_TO_FULL: Record<string, string> = {
  ஊ: "ஊண்",
  சா: "சாவு",
  து: "துயில்",
  அ: "அரசு",
  ந: "நடை",
};

export function displayActivity(label: string): string {
  return SHORT_TO_FULL[label.trim()] ?? label.trim();
}

export function displayActivityBi(label: string): Bilingual {
  return activityBilingual(displayActivity(label));
}
