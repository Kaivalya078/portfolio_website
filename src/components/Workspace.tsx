'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { experience, projects } from '@/data/portfolio';
import ExperienceDetail from './ExperienceDetail';
import KoiPond from './KoiPond';
import Panel from './Panel';
import ProjectDetail from './ProjectDetail';
import Sidebar from './Sidebar';

export type Section = 'experience' | 'projects' | null;

const TITLES = { experience: 'Experience', projects: 'Projects' } as const;

/** Keep in step with --dur in globals.css. */
const EXIT_MS = 420;

/**
 * Keeps a value rendered for `ms` after it clears, so its column can transition
 * out before React removes it. Reopening inside that window cancels the wait,
 * and the transition turns around on its own.
 */
function useClosing<T>(value: T | null, ms: number): [T | null, boolean] {
  const [kept, setKept] = useState<T | null>(value);

  useEffect(() => {
    if (value !== null) {
      setKept(value);
      return;
    }
    const timer = setTimeout(() => setKept(null), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);

  return [value ?? kept, value === null && kept !== null];
}

/**
 * The whole navigation model is these two values.
 *
 *   section  which nav entry is open
 *   item     which row inside it is open
 *
 * Closing an item leaves its section open; closing a section clears both. How
 * many columns are actually painted at a given viewport is decided in CSS, so
 * the state is identical at every width.
 */
export default function Workspace() {
  const [section, setSection] = useState<Section>(null);
  const [item, setItem] = useState<string | null>(null);

  // What is *painted* lags what is open, so a closed column can collapse.
  const [shownSection, sectionClosing] = useClosing(section, EXIT_MS);
  const [shownItem, itemClosing] = useClosing(item, EXIT_MS);

  // Focus returns to whatever opened a panel once that panel closes.
  const navRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Restoring focus has to happen *after* React commits. Calling focus() in the
  // click handler puts it on the right element, but the closing panel then
  // unmounts and the browser drops focus to <body>.
  const focusAfterCommit = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const el = focusAfterCommit.current;
    if (el) {
      focusAfterCommit.current = null;
      el.focus();
    }
  });

  const registerNav = useCallback(
    (key: Exclude<Section, null>, el: HTMLButtonElement | null) => {
      navRefs.current[key] = el;
    },
    [],
  );

  const toggleSection = useCallback((next: Exclude<Section, null>) => {
    setSection((current) => (current === next ? null : next));
    setItem(null);
  }, []);

  const closeSection = useCallback(() => {
    if (section) focusAfterCommit.current = navRefs.current[section];
    setSection(null);
    setItem(null);
  }, [section]);

  const closeItem = useCallback(() => {
    if (item) focusAfterCommit.current = rowRefs.current[item];
    setItem(null);
  }, [item]);

  // A row is its own close control: clicking the open one shuts its detail.
  const toggleItem = useCallback((id: string) => {
    setItem((current) => (current === id ? null : id));
  }, []);

  // Escape closes the deepest open column only.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (item) closeItem();
      else if (section) closeSection();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, section, closeItem, closeSection]);

  // Both lists render identically, so they are flattened to one shape first.
  // (Project and Role both have a `title`, so narrowing on it would not work.)
  const rows =
    shownSection === 'projects'
      ? projects.map((p) => ({ id: p.id, label: p.title, sub: p.subtitle }))
      : experience.map((r) => ({ id: r.id, label: r.company, sub: r.period }));

  const openProject = projects.find((p) => p.id === shownItem);
  const openRole = experience.find((r) => r.id === shownItem);

  return (
    <main className="workspace">
      <Sidebar
        section={section}
        onToggle={toggleSection}
        registerRef={registerNav}
      />

      {shownSection && (
        <Panel
          title={TITLES[shownSection]}
          variant="list"
          closing={sectionClosing}
          onClose={closeSection}
        >
          <ul>
            {rows.map((row) => (
              <li className="list__item" key={row.id}>
                <button
                  type="button"
                  className="list__button"
                  aria-expanded={item === row.id}
                  onClick={() => toggleItem(row.id)}
                  ref={(el) => {
                    rowRefs.current[row.id] = el;
                  }}
                >
                  <span className="list__label">
                    {row.label}
                    {item === row.id && (
                      <span className="nav__mark" aria-hidden="true" />
                    )}
                  </span>
                  <span className="list__sub">{row.sub}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {shownSection === 'projects' && openProject && (
        <Panel
          title={openProject.title}
          variant="detail"
          closing={itemClosing}
          onClose={closeItem}
        >
          <ProjectDetail project={openProject} />
        </Panel>
      )}

      {shownSection === 'experience' && openRole && (
        <Panel
          title={openRole.company}
          variant="detail"
          closing={itemClosing}
          onClose={closeItem}
        >
          <ExperienceDetail role={openRole} />
        </Panel>
      )}

      <KoiPond />
    </main>
  );
}
