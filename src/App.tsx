import { useEffect, useState } from "react";
import { AppMenu, viewTitle, type AppView } from "./components/AppMenu";
import { BilingualText } from "./components/BilingualText";
import { useLanguage } from "./context/LanguageContext";
import { DateTimeCard } from "./components/DateTimeCard";
import { DaysView } from "./components/DaysView";
import { FindPatchiView } from "./components/FindPatchiView";
import { PatchiStatusView } from "./components/PatchiStatusView";
import { TimeTableView } from "./components/TimeTableView";
import { PATCHI_ORDER, UI } from "./utils/bilingual";
import type { PakshaData } from "./types";
import "./index.css";

type SheetTab = "valarpirai" | "theipirai";
type PatchiName = (typeof PATCHI_ORDER)[number];

export default function App() {
  const { language, setLanguage } = useLanguage();
  const [selectedDateTime, setSelectedDateTime] = useState(() => new Date());
  const [activeView, setActiveView] = useState<AppView>("status");
  const [athikaraPatchi, setAthikaraPatchi] = useState<PatchiName>(PATCHI_ORDER[0]);
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
          <AppMenu activeView={activeView} onNavigate={setActiveView} />
        </div>
      </header>

      <DateTimeCard value={selectedDateTime} onChange={setSelectedDateTime} />

      <main className="content">
        <h2 className="content__section-title">
          <BilingualText text={viewTitle(activeView)} />
        </h2>

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

        {!loading && !error && activeView === "status" && (
          <PatchiStatusView
            selectedDateTime={selectedDateTime}
            data={data}
            athikaraPatchi={athikaraPatchi}
            onAthikaraPatchiChange={setAthikaraPatchi}
          />
        )}

        {!loading && !error && activeView === "find" && (
          <FindPatchiView
            data={data}
            selectedDateTime={selectedDateTime}
            highlightPatchi={athikaraPatchi}
          />
        )}

        {!loading && !error && activeView === "schedule" && (
          <TimeTableView selectedDateTime={selectedDateTime} data={data} />
        )}

        {activeView === "days" && <DaysView />}
      </main>
    </div>
  );
}
