'use client';

import { useEffect, useRef } from 'react';

type Props = {
  title: string;
  /** Distinguishes the two column widths. */
  variant: 'list' | 'detail';
  /** True while the column is collapsing but still mounted. */
  closing: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

/**
 * The shared shell for every opened column: title, close mark, scroll area.
 *
 * The close mark always sits on the leftmost column that is actually painted.
 * Normally that is the row which opened this panel, so the mark here is hidden;
 * when the column budget drops that row the panel shows its own instead. CSS
 * decides which, so there is no second code path.
 *
 * On mount it moves focus to the heading so keyboard users land inside the new
 * panel rather than at the top of the document.
 */
export default function Panel({ title, variant, closing, onClose, children }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <section
      className={`column panel panel--${variant}${closing ? ' panel--closing' : ''}`}
      aria-label={title}
      inert={closing}
    >
      <div className="column__inner">
        <div className="panel__head">
          <h2 className="panel__title" tabIndex={-1} ref={heading}>
            {title}
          </h2>
          <button
            type="button"
            className="panel__close"
            onClick={onClose}
            aria-label={`Close ${title}`}
          >
            <span className="nav__mark" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </section>
  );
}
