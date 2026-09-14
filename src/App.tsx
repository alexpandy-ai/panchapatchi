import { useState } from "react";
import { AppMenu, HomeNavButton, viewTitle } from "./components/AppMenu";
import { BilingualText } from "./components/BilingualText";
import { useLanguage } from "./context/LanguageContext";
import { useNavigation } from "./context/NavigationContext";
import { DateTimeCard } from "./components/DateTimeCard";
import { DaysView } from "./components/DaysView";
import { FindPatchiView } from "./components/FindPatchiView";
import { PatchiStatusView } from "./components/PatchiStatusView";
import { TimeTableView } from "./components/TimeTableView";
import { PATCHI_SCHEDULE_DATA } from "./data/patchiScheduleData";
import { UI } from "./utils/bilingual";
import "./index.css";

export default function App() {
  const { language, setLanguage } = useLanguage();
  const { view: activeView, setView: setActiveView } = useNavigation();
  const [selectedDateTime, setSelectedDateTime] = useState(() => new Date());

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
                த
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
                E
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

      {activeView !== "schedule" &&
        activeView !== "alternateSchedule" &&
        activeView !== "days" && (
        <DateTimeCard
          value={selectedDateTime}
          onChange={setSelectedDateTime}
          hideDateLabel={activeView === "home"}
          hideTimeLabel={activeView === "home"}
        />
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

        {activeView === "home" && (
          <PatchiStatusView selectedDateTime={selectedDateTime} variant="home" />
        )}

        {activeView === "status" && (
          <PatchiStatusView
            selectedDateTime={selectedDateTime}
            data={PATCHI_SCHEDULE_DATA}
            variant="status"
          />
        )}

        {activeView === "find" && (
          <FindPatchiView selectedDateTime={selectedDateTime} />
        )}

        {activeView === "schedule" && (
          <TimeTableView selectedDateTime={selectedDateTime} />
        )}

        {activeView === "alternateSchedule" && (
          <TimeTableView
            selectedDateTime={selectedDateTime}
            data={PATCHI_SCHEDULE_DATA}
            subtitle={UI.alternateCalculation}
            alternateCalculation
          />
        )}

        {activeView === "days" && <DaysView selectedDateTime={selectedDateTime} />}
      </main>
    </div>
  );
}
