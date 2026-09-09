import type { AppView } from "../components/AppMenu";
import { PATCHI_ORDER } from "./bilingual";
import { getPakshaFromDate, type PakshaId } from "./paksha";

export type InformationSection =
  | "patchiDays"
  | "thithiPatchi"
  | "natchathiraPatchi"
  | "patchiDetails"
  | "patchiActivity"
  | "patchiRelation";

export type PatchiName = (typeof PATCHI_ORDER)[number];
export type PatchiSelection = PatchiName | "all";

export interface NavigationState {
  view: AppView;
  daysSection: InformationSection;
  paksha: PakshaId;
  patchi: PatchiSelection;
  findPatchi: PatchiName;
  myPatchi: PatchiSelection;
}

const APP_VIEWS: AppView[] = ["home", "status", "find", "schedule", "alternateSchedule", "days"];

const INFORMATION_SECTIONS: InformationSection[] = [
  "patchiDays",
  "thithiPatchi",
  "natchathiraPatchi",
  "patchiDetails",
  "patchiActivity",
  "patchiRelation",
];

const PAKSHA_IDS: PakshaId[] = ["valarpirai", "theipirai"];

const STORAGE_KEY = "pancha-patchi-navigation";

export const DEFAULT_NAVIGATION: NavigationState = {
  view: "home",
  daysSection: "patchiDays",
  paksha: "valarpirai",
  patchi: "all",
  findPatchi: PATCHI_ORDER[0],
  myPatchi: PATCHI_ORDER[0],
};

function isAppView(value: string): value is AppView {
  return APP_VIEWS.includes(value as AppView);
}

function isInformationSection(value: string): value is InformationSection {
  return INFORMATION_SECTIONS.includes(value as InformationSection);
}

function isPakshaId(value: string): value is PakshaId {
  return PAKSHA_IDS.includes(value as PakshaId);
}

function isPatchiName(value: string): value is PatchiName {
  return PATCHI_ORDER.includes(value as PatchiName);
}

function isPatchiSelection(value: string): value is PatchiSelection {
  return value === "all" || isPatchiName(value);
}

function parseParams(source: string): Partial<NavigationState> {
  const params = new URLSearchParams(source);
  const parsed: Partial<NavigationState> = {};

  const view = params.get("view");
  if (view && isAppView(view)) parsed.view = view as AppView;

  const daysSection = params.get("daysSection");
  if (daysSection && isInformationSection(daysSection)) parsed.daysSection = daysSection;

  const paksha = params.get("paksha");
  if (paksha && isPakshaId(paksha)) parsed.paksha = paksha;

  const patchi = params.get("patchi");
  if (patchi && isPatchiSelection(patchi)) parsed.patchi = patchi;

  const findPatchi = params.get("findPatchi");
  if (findPatchi && isPatchiName(findPatchi)) parsed.findPatchi = findPatchi;

  const myPatchi = params.get("myPatchi");
  if (myPatchi && isPatchiSelection(myPatchi)) parsed.myPatchi = myPatchi;

  return parsed;
}

function readHashParams(): Partial<NavigationState> {
  const hash = window.location.hash.replace(/^#/, "").trim();
  if (!hash) return {};

  if (hash.startsWith("?") || hash.includes("=")) {
    return parseParams(hash.startsWith("?") ? hash.slice(1) : hash);
  }

  return isAppView(hash) ? { view: hash as AppView } : {};
}

function readStorageObject(): Partial<NavigationState> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<NavigationState>;
  } catch {
    return {};
  }
}

export function normalizeNavigationState(
  partial: Partial<NavigationState>,
): NavigationState {
  return {
    view:
      partial.view && isAppView(partial.view) ? partial.view : DEFAULT_NAVIGATION.view,
    daysSection:
      partial.daysSection && isInformationSection(partial.daysSection)
        ? partial.daysSection
        : DEFAULT_NAVIGATION.daysSection,
    paksha:
      partial.paksha && isPakshaId(partial.paksha) ? partial.paksha : DEFAULT_NAVIGATION.paksha,
    patchi:
      partial.patchi && isPatchiSelection(partial.patchi)
        ? partial.patchi
        : DEFAULT_NAVIGATION.patchi,
    findPatchi:
      partial.findPatchi && isPatchiName(partial.findPatchi)
        ? partial.findPatchi
        : DEFAULT_NAVIGATION.findPatchi,
    myPatchi:
      partial.myPatchi && isPatchiSelection(partial.myPatchi)
        ? partial.myPatchi
        : DEFAULT_NAVIGATION.myPatchi,
  };
}

export function loadNavigationState(referenceDate = new Date()): NavigationState {
  const fromStorage = readStorageObject();
  const fromHash = readHashParams();
  const hasPersistedState =
    Object.keys(fromStorage).length > 0 || Object.keys(fromHash).length > 0;

  const merged = {
    ...DEFAULT_NAVIGATION,
    ...(hasPersistedState ? {} : { paksha: getPakshaFromDate(referenceDate) }),
    ...fromStorage,
    ...fromHash,
  };

  return normalizeNavigationState(merged);
}

export function saveNavigationState(state: NavigationState): void {
  const params = new URLSearchParams();
  params.set("view", state.view);

  if (state.view === "days") {
    params.set("daysSection", state.daysSection);
  }

  if (state.view === "find") {
    params.set("paksha", state.paksha);
    params.set("findPatchi", state.findPatchi);
  }

  if (state.view === "schedule" || state.view === "alternateSchedule") {
    params.set("paksha", state.paksha);
    params.set("patchi", state.patchi);
  }

  if (state.view === "home" || state.view === "status") {
    params.set("paksha", state.paksha);
    params.set("myPatchi", state.myPatchi);
  }

  const hash = `#${params.toString()}`;
  if (window.location.hash !== hash) {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
  }

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
