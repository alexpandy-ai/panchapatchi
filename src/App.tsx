import { useState } from "react";
import {
  AppMenu,
  HomeNavButton,
  LanguageToggleButton,
  LocationDetectButton,
  RefreshPageButton,
  viewTitle,
} from "./components/AppMenu";
import { BilingualText } from "./components/BilingualText";
import { useNavigation } from "./context/NavigationContext";
import { DateTimeCard } from "./components/DateTimeCard";
import { DaysView } from "./components/DaysView";
import { ThithiDetailsView } from "./components/ThithiDetailsView";
import { ThithiScheduleView } from "./components/ThithiScheduleView";
import { FindPatchiView, type FindPatchiQuery } from "./components/FindPatchiView";
import { PatchiStatusView } from "./components/PatchiStatusView";
import { SunriseView } from "./components/SunriseView";
import { TimeTableView } from "./components/TimeTableView";
import { useLocation } from "./context/LocationContext";
import { placeZoneNote, UI } from "./utils/bilingual";
import { placeZoneLabel } from "./utils/placeClock";
import "./index.css";

export default function App() {
  const { view: activeView, setView: setActiveView } = useNavigation();
  const [selectedDateTime, setSelectedDateTime] = useState(() => new Date());
  const [findPatchiQuery, setFindPatchiQuery] = useState<FindPatchiQuery | null>(null);
  const { coords } = useLocation();
  const zoneLabel = placeZoneLabel(coords, selectedDateTime);

  return (
    <div
      className={[
        "app",
        activeView === "home" ? "app--home" : "",
        activeView === "status" ? "app--find-patchi" : "",
        activeView === "schedule" ? "app--patchi-schedule" : "",
        activeView === "thithiSchedule" ? "app--thithi-schedule" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="header">
        <div className="header__toolbar">
          <div className="header__actions">
            <LanguageToggleButton />
            <LocationDetectButton />
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
            <RefreshPageButton label={UI.refreshPage} />
            <AppMenu activeView={activeView} onNavigate={setActiveView} />
          </div>
        </div>
      </header>

      {activeView !== "schedule" &&
        activeView !== "thithiSchedule" &&
        activeView !== "days" &&
        activeView !== "sunrise" && (
        <DateTimeCard
          value={selectedDateTime}
          onChange={setSelectedDateTime}
          hideDateLabel={activeView === "home" || activeView === "thithiDetails" || activeView === "status"}
          hideTimeLabel={activeView === "home" || activeView === "thithiDetails"}
          selectFieldLabels={activeView === "status"}
          onSubmit={
            activeView === "status"
              ? (payload) => setFindPatchiQuery(payload)
              : undefined
          }
        />
      )}

      <main className="content">
        {zoneLabel ? (
          <p className="place-zone-note">
            <BilingualText text={placeZoneNote(zoneLabel)} />
          </p>
        ) : null}

        {activeView === "home" && (
          <PatchiStatusView selectedDateTime={selectedDateTime} variant="home" />
        )}

        {activeView === "status" && <FindPatchiView query={findPatchiQuery} />}

        {activeView === "schedule" && (
          <TimeTableView selectedDateTime={selectedDateTime} />
        )}

        {activeView === "thithiSchedule" && (
          <ThithiScheduleView selectedDateTime={selectedDateTime} />
        )}

        {activeView === "thithiDetails" && (
          <ThithiDetailsView
            selectedDateTime={selectedDateTime}
            onDateTimeChange={setSelectedDateTime}
          />
        )}

        {activeView === "days" && <DaysView selectedDateTime={selectedDateTime} />}

        {activeView === "sunrise" && <SunriseView selectedDateTime={selectedDateTime} />}
      </main>
    </div>
  );
}
