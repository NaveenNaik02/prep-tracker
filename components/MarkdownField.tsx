'use client'

import { useMemo, type ReactNode } from 'react'
import { renderMarkdown } from '@/lib/renderMarkdown'

interface Props {
  tab: 'write' | 'preview'
  onTabChange: (tab: 'write' | 'preview') => void
  value: string
  onChange: (value: string) => void
  placeholder: string
  emptyPreviewText: string
  toolbar?: ReactNode
  // Extra content between the tab bar and the editor/preview panes (version
  // chips, generation error banners) — and after the panes (a "done" note).
  // Kept as slots rather than hardcoded so this stays reusable outside the
  // answer-generation flow.
  belowTabs?: ReactNode
  afterPanes?: ReactNode
  readOnly?: boolean
  autoFocus?: boolean
  textareaClassName?: string
  editorPaneClassName?: string
}

// Shared write/preview markdown editor — used by both the main answer field
// and the Instructions modal's textarea, which need identical tab/preview
// behavior but different toolbars and placeholder copy.
export default function MarkdownField({
  tab, onTabChange, value, onChange, placeholder, emptyPreviewText, toolbar, belowTabs, afterPanes,
  readOnly, autoFocus, textareaClassName, editorPaneClassName,
}: Props) {
  const html = useMemo(() => renderMarkdown(value), [value])

  return (
    <div className="aq-md-wrap">
      <div className="aq-md-tabs">
        <div className="aq-md-tabbtns">
          <button type="button" className={`aq-md-tab ${tab === 'write' ? 'active' : ''}`} onClick={() => onTabChange('write')}>Write</button>
          <button type="button" className={`aq-md-tab ${tab === 'preview' ? 'active' : ''}`} onClick={() => onTabChange('preview')}>Preview</button>
        </div>
        {toolbar ?? <span className="aq-md-hint">Markdown supported</span>}
      </div>
      {belowTabs}
      <div className={`aq-md-panes single show-${tab === 'write' ? 'editor' : 'preview'}`}>
        <div className={`aq-md-editor-pane ${editorPaneClassName ?? ''}`}>
          <textarea
            autoFocus={autoFocus}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            readOnly={readOnly}
            className={textareaClassName}
            placeholder={placeholder}
          />
        </div>
        <div className="aq-md-preview-pane">
          {html ? (
            <div className="q-answer q-body prose prose-slate dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <div className="aq-md-empty">{emptyPreviewText}</div>
          )}
        </div>
      </div>
      {afterPanes}
    </div>
  )
}
