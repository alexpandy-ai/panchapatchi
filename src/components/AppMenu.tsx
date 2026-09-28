import { useEffect, useState } from "react";
import { BilingualText } from "./BilingualText";
import { useNavigation } from "../context/NavigationContext";
import { MENU_ITEMS, UI, type Bilingual } from "../utils/bilingual";
import type { InformationSection } from "../utils/navigationState";

export type AppView =
  | "home"
  | "status"
  | "schedule"
  | "alternateSchedule"
  | "thithiSchedule"
  | "thithiDetails"
  | "days";

interface AppMenuProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}

interface HomeNavButtonProps {
  active: boolean;
  onNavigate: () => void;
  label: Bilingual;
}

export function HomeNavButton({ active, onNavigate, label }: HomeNavButtonProps) {
  return (
    <button
      type="button"
      className={[
        "app-menu__toggle",
        "header-home-btn",
        active ? "header-home-btn--active" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`${label.ta} ${label.en}`}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
    >
      <svg className="app-menu__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export function AppMenu({ activeView, onNavigate }: AppMenuProps) {
  const { daysSection, setView, setDaysSection } = useNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

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

  useEffect(() => {
    if (!isOpen) return;
    setOpenGroups((current) => {
      const next = { ...current };
      if (activeView === "thithiSchedule" || activeView === "thithiDetails") {
        next.thithiSchedule = true;
      }
      if (activeView === "days") next.days = true;
      return next;
    });
  }, [isOpen, activeView]);

  function selectView(view: AppView) {
    onNavigate(view);
    setIsOpen(false);
  }

  function selectChild(parentId: string, childId: string) {
    if (parentId === "days") {
      setView("days");
      setDaysSection(childId as InformationSection);
    } else {
      onNavigate(childId as AppView);
    }
    setIsOpen(false);
  }

  function childIsActive(parentId: string, childId: string) {
    if (parentId === "days") {
      return activeView === "days" && daysSection === childId;
    }
    return activeView === childId;
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
              {MENU_ITEMS.map((item) => {
                if (!item.children?.length) {
                  return (
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
                  );
                }

                const submenuId = `app-menu-sub-${item.id}`;
                const groupOpen = Boolean(openGroups[item.id]);

                return (
                  <li key={item.id} className="app-menu__group">
                    <button
                      type="button"
                      className={
                        groupOpen
                          ? "app-menu__item app-menu__item--parent app-menu__item--open"
                          : "app-menu__item app-menu__item--parent"
                      }
                      aria-expanded={groupOpen}
                      aria-controls={submenuId}
                      onClick={() =>
                        setOpenGroups((current) => ({
                          ...current,
                          [item.id]: !current[item.id],
                        }))
                      }
                    >
                      <span className="app-menu__item-label">
                        <BilingualText text={item.label} />
                      </span>
                      <svg
                        className={
                          groupOpen
                            ? "app-menu__chevron app-menu__chevron--open"
                            : "app-menu__chevron"
                        }
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          d="M6 9l6 6 6-6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    {groupOpen && (
                      <ul id={submenuId} className="app-menu__sublist">
                        {item.children.map((child) => {
                          const active = childIsActive(item.id, child.id);
                          return (
                            <li key={child.id}>
                              <button
                                type="button"
                                className={
                                  active
                                    ? "app-menu__item app-menu__item--sub app-menu__item--active"
                                    : "app-menu__item app-menu__item--sub"
                                }
                                onClick={() => selectChild(item.id, child.id)}
                                aria-current={active ? "page" : undefined}
                              >
                                <span className="app-menu__item-label">
                                  <BilingualText text={child.label} />
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}

export function viewTitle(view: AppView): Bilingual {
  const parent = MENU_ITEMS.find((item) => item.id === view);
  if (parent) return parent.label;

  for (const item of MENU_ITEMS) {
    const child = item.children?.find((entry) => entry.id === view);
    if (child) return child.label;
  }

  return UI.appTitle;
}
