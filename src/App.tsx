import { useState } from "react";
import { AppMenu, HomeNavButton, viewTitle } from "./components/AppMenu";
import { BilingualText } from "./components/BilingualText";
import { useLanguage } from "./context/LanguageContext";
import { useNavigation } from "./context/NavigationContext";
import { DateTimeCard } from "./components/DateTimeCard";
import { DaysView } from "./components/DaysView";
import { DaySchedulerView } from "./components/DaySchedulerView";
import { FindPatchiView, type FindPatchiQuery } from "./components/FindPatchiView";
import { OthersView } from "./components/OthersView";
import { PatchiStatusView } from "./components/PatchiStatusView";
import { TimeTableView } from "./components/TimeTableView";
import { UI } from "./utils/bilingual";
import "./index.css";

export default function App() {
  const { language, setLanguage } = useLanguage();
  const { view: activeView, setView: setActiveView } = useNavigation();
  const [selectedDateTime, setSelectedDateTime] = useState(() => new Date());
  const [findPatchiQuery, setFindPatchiQuery] = useState<FindPatchiQuery | null>(null);

  return (
    <div
      className={[
        "app",
        activeView === "home" ? "app--home" : "",
        activeView === "status" ? "app--find-patchi" : "",
        activeView === "others" ? "app--others" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
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
            <BilingualText
              text={activeView === "home" ? UI.appTitle : viewTitle(activeView)}
            />
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
          selectFieldLabels={activeView === "status"}
          onSubmit={
            activeView === "status"
              ? (payload) => setFindPatchiQuery(payload)
              : undefined
          }
        />
      )}

      <main className="content">
        {activeView === "home" && (
          <PatchiStatusView selectedDateTime={selectedDateTime} variant="home" />
        )}

        {activeView === "status" && <FindPatchiView query={findPatchiQuery} />}

        {activeView === "schedule" && (
          <TimeTableView selectedDateTime={selectedDateTime} />
        )}

        {activeView === "alternateSchedule" && (
          <DaySchedulerView selectedDateTime={selectedDateTime} />
        )}

        {activeView === "days" && <DaysView selectedDateTime={selectedDateTime} />}

        {activeView === "others" && <OthersView selectedDateTime={selectedDateTime} />}
      </main>
    </div>
  );
}
