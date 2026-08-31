import { useEffect, useState } from "react";
import { BilingualText } from "./BilingualText";
import { MENU_ITEMS, UI, type Bilingual } from "../utils/bilingual";

export type AppView = "status" | "find" | "schedule" | "days";

interface AppMenuProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}

export function AppMenu({ activeView, onNavigate }: AppMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  function selectView(view: AppView) {
    onNavigate(view);
    setIsOpen(false);
  }

  return (
    <div className="app-menu">
      <button
        type="button"
        className="app-menu__toggle"
        aria-label={`${UI.openMenu.ta} ${UI.openMenu.en}`}
        aria-expanded={isOpen}
        aria-controls="app-menu-panel"
        onClick={() => setIsOpen((open) => !open)}
      >
        <svg className="app-menu__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            className="app-menu__backdrop"
            aria-label={`${UI.closeMenu.ta} ${UI.closeMenu.en}`}
            onClick={() => setIsOpen(false)}
          />
          <nav id="app-menu-panel" className="app-menu__panel" aria-label={`${UI.appMenu.ta} ${UI.appMenu.en}`}>
            <div className="app-menu__panel-head">
              <p className="app-menu__panel-title">
                <BilingualText text={UI.menu} />
              </p>
              <button
                type="button"
                className="app-menu__close"
                aria-label={`${UI.closeMenu.ta} ${UI.closeMenu.en}`}
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>
            <ul className="app-menu__list">
              {MENU_ITEMS.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={
                      activeView === item.id
                        ? "app-menu__item app-menu__item--active"
                        : "app-menu__item"
                    }
                    onClick={() => selectView(item.id as AppView)}
                    aria-current={activeView === item.id ? "page" : undefined}
                  >
                    <span className="app-menu__item-label">
                      <BilingualText text={item.label} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}

export function viewTitle(view: AppView): Bilingual {
  return MENU_ITEMS.find((item) => item.id === view)!.label;
}
