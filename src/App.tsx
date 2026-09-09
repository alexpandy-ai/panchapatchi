import { useEffect, useState } from "react";
import { AppMenu, HomeNavButton, viewTitle } from "./components/AppMenu";
import { BilingualText } from "./components/BilingualText";
import { useLanguage } from "./context/LanguageContext";
import { useNavigation } from "./context/NavigationContext";
import { DateTimeCard } from "./components/DateTimeCard";
import { DaysView } from "./components/DaysView";
import { FindPatchiView } from "./components/FindPatchiView";
import { PatchiStatusView } from "./components/PatchiStatusView";
import { TimeTableView } from "./components/TimeTableView";
import { UI } from "./utils/bilingual";
import type { PakshaData } from "./types";
import "./index.css";

type SheetTab = "valarpirai" | "theipirai";

export default function App() {
  const { language, setLanguage } = useLanguage();
  const { view: activeView, setView: setActiveView } = useNavigation();
  const [selectedDateTime, setSelectedDateTime] = useState(() => new Date());
  const [data, setData] = useState<Record<SheetTab, PakshaData | null>>({
    valarpirai: null,
    theipirai: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [valarpiraiRes, theipiraiRes] = await Promise.all([
          fetch("/api/valarpirai.json"),
          fetch("/api/theipirai.json"),
        ]);

        if (!valarpiraiRes.ok || !theipiraiRes.ok) {
          throw new Error(UI.loadError.ta);
        }

        const [valarpirai, theipirai] = await Promise.all([
          valarpiraiRes.json() as Promise<PakshaData>,
          theipiraiRes.json() as Promise<PakshaData>,
        ]);

        if (!cancelled) {
          setData({ valarpirai, theipirai });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : UI.loadError.en);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="header__toolbar">
          <div className="header__actions">
            <nav className="language-toggle" role="tablist" aria-label="Language">
              <button
                type="button"
                role="tab"
                aria-selected={language === "ta"}
                className={
                  language === "ta"
                    ? "language-toggle__btn language-toggle__btn--active"
                    : "language-toggle__btn"
                }
                onClick={() => setLanguage("ta")}
              >
                தமிழ்
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={language === "en"}
                className={
                  language === "en"
                    ? "language-toggle__btn language-toggle__btn--active"
                    : "language-toggle__btn"
                }
                onClick={() => setLanguage("en")}
              >
                English
              </button>
            </nav>
          </div>
          <h1>
            <BilingualText text={UI.appTitle} />
          </h1>
          <div className="header__nav">
            <HomeNavButton
              active={activeView === "home"}
              onNavigate={() => setActiveView("home")}
              label={UI.home}
            />
            <AppMenu activeView={activeView} onNavigate={setActiveView} />
          </div>
        </div>
      </header>

      {activeView !== "schedule" && activeView !== "alternateSchedule" && (
        <DateTimeCard value={selectedDateTime} onChange={setSelectedDateTime} />
      )}

      <main className="content">
        {activeView !== "schedule" &&
          activeView !== "alternateSchedule" &&
          activeView !== "find" &&
          activeView !== "home" &&
          activeView !== "status" && (
          <h2 className="content__section-title">
            <BilingualText text={viewTitle(activeView)} />
          </h2>
        )}

        {loading && (
          <p className="status">
            <BilingualText text={UI.loading} />
          </p>
        )}
        {error && (
          <p className="status status--error">
            <BilingualText text={UI.loadError} />
          </p>
        )}

        {!loading && !error && activeView === "home" && (
          <PatchiStatusView selectedDateTime={selectedDateTime} data={data} variant="home" />
        )}

        {!loading && !error && activeView === "status" && (
          <PatchiStatusView selectedDateTime={selectedDateTime} data={data} variant="status" />
        )}

        {!loading && !error && activeView === "find" && (
          <FindPatchiView data={data} selectedDateTime={selectedDateTime} />
        )}

        {!loading && !error && activeView === "schedule" && (
          <TimeTableView selectedDateTime={selectedDateTime} data={data} />
        )}

        {!loading && !error && activeView === "alternateSchedule" && (
          <TimeTableView
            selectedDateTime={selectedDateTime}
            data={data}
            subtitle={UI.alternateCalculation}
            alternateCalculation
          />
        )}

        {activeView === "days" && <DaysView selectedDateTime={selectedDateTime} />}
      </main>
    </div>
  );
}
