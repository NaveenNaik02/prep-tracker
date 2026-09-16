'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface Props {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}

// AqSelect, except the value can also be typed. Deliberately the same
// aq-dd/aq-select markup and classes so it sits next to the real selects
// without looking bolted on — the only difference is an <input> where
// AqSelect has a <span>, and a caret that opens the menu rather than the
// whole control.
//
// Replaces an <input list> + <datalist>: that showed no chevron and, once the
// field held a value, most browsers filtered the list down to nothing.
export const AqCombo = ({
  id,
  value,
  onChange,
  options,
  placeholder,
}: Props) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // The modal body scrolls, so a field low in the form opens its menu into
    // clipped space. Centre the control first and the menu has room.
    wrapRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const onDocDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="aq-dd" ref={wrapRef}>
      <div
        className={`aq-select aq-dd-trigger aq-dd-combo ${open ? 'open' : ''}`}
      >
        <input
          id={id}
          className="aq-dd-input"
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
        />
        <button
          type="button"
          className="aq-dd-caret"
          aria-label="Show options"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronDown className="aq-dd-chevron" size={12} />
        </button>
      </div>
      {open && (
        <div className="aq-dd-menu" role="listbox">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              role="option"
              aria-selected={o === value}
              className={`aq-dd-item ${o === value ? 'on' : ''}`}
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
            >
              <span className="aq-dd-item-label">{o}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
