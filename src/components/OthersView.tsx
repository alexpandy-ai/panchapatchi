import { BilingualText } from "./BilingualText";
import { TithiDegreeTable } from "./TithiDegreeTable";
import { useLanguage } from "../context/LanguageContext";
import { useNavigation } from "../context/NavigationContext";
import { pickBilingual, UI } from "../utils/bilingual";

interface OthersViewProps {
  selectedDateTime: Date;
}

export function OthersView({ selectedDateTime }: OthersViewProps) {
  const { language } = useLanguage();
  const { othersSection, setOthersSection } = useNavigation();
  const tithiOpen = othersSection === "tithi";

  return (
    <div className="others-view">
      <div
        className="sheet-picker others-view__submenu"
        role="tablist"
        aria-label={pickBilingual(UI.others, language)}
      >
        <button
          type="button"
          role="tab"
          className={
            tithiOpen
              ? "sheet-picker__btn sheet-picker__btn--active"
              : "sheet-picker__btn"
          }
          onClick={() => setOthersSection("tithi")}
          aria-selected={tithiOpen}
        >
          <span className="sheet-picker__label">
            <BilingualText text={UI.tithi} />
          </span>
        </button>
      </div>

      {tithiOpen ? (
        <TithiDegreeTable selectedDateTime={selectedDateTime} />
      ) : (
        <p className="status others-view__hint">
          <BilingualText text={UI.othersTithiHint} />
        </p>
      )}
    </div>
  );
}
