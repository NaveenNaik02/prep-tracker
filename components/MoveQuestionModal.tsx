'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Search, Check } from 'lucide-react'
import { isCodeOutputSection, type TopicGroup, type SectionMeta } from '@/lib/content/topics'
import { moveQuestion } from '@/lib/actions/questions'

interface Props {
  groups: TopicGroup[]
  questionId: string
  label: string
  currentSection: SectionMeta
  onClose: () => void
  onMoved: (destination: SectionMeta, newId: string) => void
}

const sectionKey = (s: { topic: string; file: string }) => `${s.topic}/${s.file}`

export default function MoveQuestionModal({ groups, questionId, label, currentSection, onClose, onMoved }: Props) {
  const [query, setQuery] = useState('')
  const [pick, setPick] = useState<SectionMeta | null>(null)
  const [moving, setMoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const q = query.trim().toLowerCase()
  const filteredGroups = groups
    .map((g) => ({
      group: g,
      // Code-output and DSA subtopics are excluded as destinations — they hold
      // their own question kinds, and moveQuestion doesn't add the snippet or
      // description a row needs to render as one.
      sections: g.sections.filter((s) => !isCodeOutputSection(s) && !s.isDsa && (!q || g.groupName.toLowerCase().includes(q) || s.label.toLowerCase().includes(q))),
    }))
    .filter((g) => g.sections.length > 0)

  const canMove = !!pick && !moving && sectionKey(pick) !== sectionKey(currentSection)

  const handleMove = async () => {
    if (!canMove || !pick) return
    setMoving(true)
    setError(null)
    try {
      const { id: newId } = await moveQuestion(questionId, { topic: pick.topic, file: pick.file })
      onMoved(pick, newId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not move — try again.')
      setMoving(false)
    }
  }

  return (
    <div className="modal-scrim">
      <div className="mvq-modal" role="dialog" aria-modal="true" aria-label="Move question">
        <div className="mvq-head">
          <div className="mvq-head-row">
            <h2>Move to…</h2>
            <button className="aq-close" onClick={onClose} aria-label="Close" title="Close"><X size={15} /></button>
          </div>
          <p>{label}</p>
        </div>
        <div className="mvq-search">
          <Search size={15} />
          <input
            ref={inputRef}
            placeholder="Search topics or subtopics…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="mvq-list">
          {filteredGroups.length === 0 && <div className="mvq-empty">No matching subtopic</div>}
          {filteredGroups.map(({ group, sections }) => (
            <div key={group.slug}>
              <div className="mvq-topic-label">{group.groupName}</div>
              {sections.map((s) => {
                const isCurrent = sectionKey(s) === sectionKey(currentSection)
                const isPicked = !!pick && sectionKey(pick) === sectionKey(s)
                return (
                  <button
                    type="button"
                    key={sectionKey(s)}
                    className={`mvq-dest ${isPicked ? 'picked' : ''}`}
                    onClick={() => setPick(s)}
                  >
                    <span className="name">{s.label}</span>
                    {isCurrent ? <span className="tag">Current</span> : isPicked ? <Check className="check" size={14} /> : null}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        {error && <div className="aq-gen-error">{error}</div>}
        <div className="mvq-foot">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!canMove} onClick={handleMove}>
            {moving ? 'Moving…' : 'Move'}
          </button>
        </div>
      </div>
    </div>
  )
}
