import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ParsedQuestion } from '@/lib/content/parser';
import { CopyButton } from './CopyButton';

// DSA problems: description, then the solution, its output, and an explanation
// of the approach. Only the description is open by default — the solution is
// always visible (it has no disclosure, same as the code-output body), and the
// output and explanation stay collapsed so neither spoils the exercise.
//
// Prerequisites are not here: they render as tags on the row header, which
// keeps them visible whether or not the question is expanded.
export function DsaAnswer({ q }: { q: ParsedQuestion }) {
  const ref = useRef<HTMLDivElement>(null);
  const [showDesc, setShowDesc] = useState(true);
  const [showOutput, setShowOutput] = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  const code = q.code ?? '';
  const lang = q.lang && q.lang !== 'none' ? q.lang : 'code';
  // Questions written before problem_html existed have only the raw text.
  const descriptionHtml = q.problemHtml || '';

  useEffect(() => {
    let cancelled = false;
    import('./highlight').then(({ highlightIn }) => {
      if (!cancelled) highlightIn(ref.current);
    });
    return () => {
      cancelled = true;
    };
  }, [q.id, showDesc, showExplain]);

  return (
    <div className="q-body q-dsa-body" ref={ref}>
      <button
        type="button"
        className={`qc-toggle ${showDesc ? 'open' : ''}`}
        onClick={() => setShowDesc(!showDesc)}
        aria-expanded={showDesc}
      >
        <span>Description</span>
        <ChevronDown size={15} />
      </button>
      {showDesc &&
        (descriptionHtml ? (
          <div
            className="qc-explain prose prose-slate dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        ) : (
          <p className="qc-explain">{q.problem}</p>
        ))}

      <div className="q-code-card">
        <div className="q-code-head">
          <span className="q-code-lang">{lang}</span>
          <CopyButton getText={() => code} variant="solution" />
        </div>
        <pre className="qc-code">
          <code className={`language-${lang}`}>{code}</code>
        </pre>
      </div>

      <button
        type="button"
        className={`qc-toggle ${showOutput ? 'open' : ''}`}
        onClick={() => setShowOutput(!showOutput)}
        aria-expanded={showOutput}
      >
        <span>Output</span>
        <ChevronDown size={15} />
      </button>
      {showOutput && <pre className="qc-output">{q.output?.trim() || '—'}</pre>}

      {q.bodyHtml && (
        <>
          <button
            type="button"
            className={`qc-toggle ${showExplain ? 'open' : ''}`}
            onClick={() => setShowExplain(!showExplain)}
            aria-expanded={showExplain}
          >
            <span>Explanation</span>
            <ChevronDown size={15} />
          </button>
          {showExplain && (
            <div
              className="qc-explain prose prose-slate dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: q.bodyHtml }}
            />
          )}
        </>
      )}
    </div>
  );
}
