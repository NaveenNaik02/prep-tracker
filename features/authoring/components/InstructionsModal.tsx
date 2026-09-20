'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { loadPresets, type InstructionPreset } from '@/lib/instructionPresets'
import AqSelect from '@/components/AqSelect'
import MarkdownField from '@/components/MarkdownField'

interface Props {
  value: string
  // Which protected preset the picker starts on — the caller knows what it's
  // generating (a plain answer, code-only, a code-output explanation), this
  // dialog doesn't.
  kind: InstructionPreset['kind']
  onClose: () => void
  onSave: (v: string) => void
}

// Formatting instructions for one question. The model choice used to live
// here too; it's a Settings preference now — see AiModelPicker.
export default function InstructionsModal({ value, kind, onClose, onSave }: Props) {
  const [draft, setDraft] = useState(value)
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const presets = useMemo(() => loadPresets(), [])
  const [presetPick, setPresetPick] = useState(() => presets.find(p => p.kind === kind)?.id ?? presets[0]?.id ?? '')

  const handleLoadPreset = (id: string) => {
    setPresetPick(id)
    if (!id) return
    const p = presets.find(x => x.id === id)
    if (p) setDraft(p.text)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="aq-instr-scrim">
      <div className="aq-instr-modal" role="dialog" aria-modal="true" aria-label="Instructions">
        <div className="aq-head">
          <h2>Instructions</h2>
          <button className="aq-close" onClick={onClose} aria-label="Close" title="Close"><X size={15} /></button>
        </div>
        <div className="aq-body">
          {presets.length > 1 && (
            <div className="aq-field">
              <label>Start from a saved version <span className="aq-customize-sub">(loads into this question only — your default in Settings won&apos;t change)</span></label>
              <AqSelect
                value={presetPick}
                onChange={handleLoadPreset}
                options={presets.map(p => ({ value: p.id, label: p.name, sub: p.text.trim() ? undefined : 'Blank' }))}
              />
            </div>
          )}
          <div className="aq-field">
            <label>How should the AI format generated answers? <span className="aq-customize-sub">(this question only)</span></label>
            <MarkdownField
              tab={tab}
              onTabChange={setTab}
              value={draft}
              onChange={setDraft}
              autoFocus
              editorPaneClassName="aq-instr-editor-pane"
              placeholder={'e.g.\n- Keep answers to 3 short bullets max\n- Always include one runnable code example\n- Bold the key term being defined'}
              emptyPreviewText="Preview appears here as you type…"
            />
          </div>
        </div>
        <div className="aq-foot">
          <span className="aq-foot-left">Applies to this question only — manage your default in Settings.</span>
          <div className="aq-foot-actions">
            <button className="btn-cancel" onClick={onClose}>Cancel</button>
            <button className="btn-primary btn-save" onClick={() => onSave(draft)}>Use for this question</button>
          </div>
        </div>
      </div>
    </div>
  )
}
