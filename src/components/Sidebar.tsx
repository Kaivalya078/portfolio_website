'use client';

import { useEffect, useRef, useState } from 'react';
import { email, identity, social } from '@/data/portfolio';
import type { Section } from './Workspace';

type Props = {
  section: Section;
  onToggle: (next: Exclude<Section, null>) => void;
  /** Registers each nav button so focus can return here when its panel closes. */
  registerRef: (key: Exclude<Section, null>, el: HTMLButtonElement | null) => void;
};

const SECTIONS: { key: Exclude<Section, null>; label: string }[] = [
  { key: 'experience', label: 'Experience' },
  { key: 'projects', label: 'Projects' },
];

/**
 * Copies text without opening a mail client. The Clipboard API needs a secure
 * context, so this falls back to a hidden textarea when the page is served
 * over plain http (a LAN IP during development, for instance).
 */
async function copy(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the textarea below */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function EmailCopy() {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onClick = async () => {
    const ok = await copy(email);
    setState(ok ? 'copied' : 'failed');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 2000);
  };

  return (
    <button
      type="button"
      className="socials__link socials__copy"
      onClick={onClick}
      title={email}
      aria-label={`Copy email address ${email} to clipboard`}
    >
      Email
      <span className="socials__hint" aria-hidden="true">
        {state === 'copied' ? 'copied' : state === 'failed' ? email : 'copy'}
      </span>
      <span className="sr-only" role="status" aria-live="polite">
        {state === 'copied'
          ? 'Email address copied to clipboard'
          : state === 'failed'
            ? `Copying failed. The address is ${email}`
            : ''}
      </span>
    </button>
  );
}

export default function Sidebar({ section, onToggle, registerRef }: Props) {
  return (
    <header className="column sidebar">
      <div className="column__inner">
        <h1 className="identity__name">{identity.name}</h1>
        <p className="identity__role">
          {identity.role}
          <span>{identity.tagline}</span>
        </p>

        <nav className="nav" aria-label="Sections">
          <ul>
            {SECTIONS.map(({ key, label }) => (
              <li className="nav__item" key={key}>
                <button
                  type="button"
                  className="nav__button"
                  aria-expanded={section === key}
                  onClick={() => onToggle(key)}
                  ref={(el) => registerRef(key, el)}
                >
                  {label}
                  {section === key && (
                    <span className="nav__mark" aria-hidden="true" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="socials" aria-label="Elsewhere">
          <ul>
            {social.map(({ label, href }) => (
              <li className="socials__item" key={label}>
                <a
                  className="socials__link"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {label}
                  <span aria-hidden="true">&#8599;</span>
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            ))}
            <li className="socials__item">
              <EmailCopy />
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
