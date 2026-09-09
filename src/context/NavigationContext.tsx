import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppView } from "../components/AppMenu";
import {
  loadNavigationState,
  saveNavigationState,
  type InformationSection,
  type NavigationState,
  type PatchiName,
  type PatchiSelection,
} from "../utils/navigationState";
import type { PakshaId } from "../utils/paksha";

export interface NavigationContextValue extends NavigationState {
  setView: (view: AppView) => void;
  setDaysSection: (daysSection: InformationSection) => void;
  setPaksha: (paksha: PakshaId) => void;
  setPatchi: (patchi: PatchiSelection) => void;
  setFindPatchi: (findPatchi: PatchiName) => void;
  setMyPatchi: (myPatchi: PatchiSelection) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NavigationState>(() => {
    const loaded = loadNavigationState();
    if (!window.location.hash.replace(/^#/, "").trim()) {
      saveNavigationState(loaded);
    }
    return loaded;
  });

  const updateState = useCallback((partial: Partial<NavigationState>) => {
    setState((current) => {
      const next = { ...current, ...partial };
      saveNavigationState(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      setState(loadNavigationState());
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const value = useMemo<NavigationContextValue>(
    () => ({
      ...state,
      setView: (view) => updateState({ view }),
      setDaysSection: (daysSection) => updateState({ daysSection }),
      setPaksha: (paksha) => updateState({ paksha }),
      setPatchi: (patchi) => updateState({ patchi }),
      setFindPatchi: (findPatchi) => updateState({ findPatchi }),
      setMyPatchi: (myPatchi) => updateState({ myPatchi }),
    }),
    [state, updateState],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationContextValue {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}
