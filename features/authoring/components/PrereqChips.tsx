'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { BookOpen, Link2, X } from 'lucide-react';
import { parsePrereqs, formatPrereqs, type Prereq } from '@/components/QuestionItem';
import { useLibraryConcepts } from '@/features/library/client';

interface Props {
  // The comma-separated column value, so callers (and the AI generator that
  // fills them) keep dealing in plain text.
  value: string;
  onChange: (value: string) => void;
}

// Prerequisites as chips: pick a saved Library concept, type your own, or
// attach a URL to either.
export const PrereqChips = ({ value, onChange }: Props) => {
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  // Index of the chip whose link is being edited, and the URL being typed.
  const [linking, setLinking] = useState<number | null>(null);
  const [linkDraft, setLinkDraft] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => parsePrereqs(value), [value]);
  const concepts = useLibraryConcepts();

  useEffect(() => {
    if (linking !== null) linkRef.current?.focus();
  }, [linking]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  const conceptTitles = useMemo(() => {
    return new Set(concepts.map((c) => c.title.trim().toLowerCase()));
  }, [concepts]);

  const commit = (next: Prereq[]) => onChange(formatPrereqs(next));

  const add = (text: string) => {
    const name = text.trim().replace(/[,|]/g, '');
    const already = items.some(
      (p) => p.text.toLowerCase() === name.toLowerCase(),
    );
    if (name && !already) commit([...items, { text: name }]);
    setDraft('');
    setOpen(false);
  };

  const remove = (idx: number) => {
    commit(items.filter((_, i) => i !== idx));
    setLinking(null);
  };

  const saveLink = () => {
    if (linking === null) return;
    // The list is comma-separated, so a comma inside the URL would split the
    // item in two; %2C decodes back to a comma wherever the link is opened.
    const url = linkDraft.trim().replace(/,/g, '%2C');
    commit(
      items.map((p, i) => {
        if (i !== linking) return p;
        return url ? { ...p, link: url } : { text: p.text };
      }),
    );
    setLinking(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && items.length) {
      remove(items.length - 1);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const suggestions = concepts.filter((c) => {
    const taken = items.some(
      (p) => p.text.toLowerCase() === c.title.trim().toLowerCase(),
    );
    const typed = draft.trim().toLowerCase();
    return !taken && (!typed || c.title.toLowerCase().includes(typed));
  });

  return (
    <div className="prereq-field" ref={wrapRef}>
      <div className="prereq-box" onClick={() => setOpen(true)}>
        {items.map((p, i) => {
          const fromLibrary = conceptTitles.has(p.text.trim().toLowerCase());
          return (
            <span
              className={`prereq-chip${linking === i ? ' editing' : ''}`}
              key={`${p.text}-${i}`}
            >
              {p.text}
              <button
                type="button"
                className="prereq-chip-link"
                title={
                  p.link
                    ? `Linked to ${p.link} — click to edit`
                    : fromLibrary
                      ? 'Saved in your Library — click to attach a link too'
                      : 'Attach a link'
                }
                aria-label={`Attach a link to ${p.text}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setLinkDraft(p.link ?? '');
                  setLinking(linking === i ? null : i);
                }}
              >
                {p.link ? (
                  <Link2 size={12} />
                ) : fromLibrary ? (
                  <BookOpen size={12} />
                ) : (
                  <Link2 size={12} className="prereq-chip-link-faint" />
                )}
              </button>
              <button
                type="button"
                className="prereq-chip-x"
                aria-label={`Remove ${p.text}`}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(i);
                }}
              >
                <X size={12} />
              </button>
            </span>
          );
        })}
        <input
          id="dq-prereqs"
          className="prereq-input"
          type="text"
          placeholder={items.length ? 'Add a prerequisite…' : 'Two Pointers, Hash Set basics'}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => add(draft)}
          onKeyDown={onKeyDown}
        />
      </div>

      {linking !== null && (
        <div className="prereq-linkbar">
          <input
            ref={linkRef}
            className="aq-input"
            type="url"
            placeholder="https://… (leave empty to remove the link)"
            value={linkDraft}
            onChange={(e) => setLinkDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                saveLink();
              } else if (e.key === 'Escape') {
                setLinking(null);
              }
            }}
          />
          <button type="button" className="btn-cancel" onClick={saveLink}>
            Done
          </button>
        </div>
      )}

      {open && suggestions.length > 0 && (
        <div className="prereq-menu">
          <div className="prereq-menu-head">From your Library</div>
          {suggestions.map((c) => (
            <button
              type="button"
              key={c.id}
              className="prereq-menu-item"
              // The input's blur would otherwise commit the draft and close
              // the menu before this click lands.
              onMouseDown={(e) => {
                e.preventDefault();
                add(c.title);
              }}
            >
              <BookOpen size={12} /> {c.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
