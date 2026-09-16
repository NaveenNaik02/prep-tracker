'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Plus } from 'lucide-react'
import {
  findGroup,
  findSection,
  isCodeOutputSection,
  sectionUrl,
} from '@/lib/content/topics'
import { useAppStore } from '@/lib/stores/appStore';
import { useFabDrag } from '@/lib/hooks'

// Rarely opened relative to every other page view (Add Question/Topic pull in
// marked + isomorphic-dompurify + AI action wiring) — load only when needed.
const AddQuestionModal = dynamic(
  () => import('@/features/authoring').then((m) => m.AddQuestionModal),
  { ssr: false },
)
const AddTopicModal = dynamic(() => import('./AddTopicModal'), { ssr: false })
const CodeQuestionModal = dynamic(
  () => import('@/features/authoring').then((m) => m.CodeQuestionModal),
  { ssr: false },
)
const DsaQuestionModal = dynamic(
  () => import('@/features/authoring').then((m) => m.DsaQuestionModal),
  { ssr: false },
)

export default function AddQuestionFab() {
  const pathname = usePathname()
  const router = useRouter()
  const groups = useAppStore((s) => s.groups)
  const [open, setOpen] = useState(false)
  const { style, handlers } = useFabDrag()

  // Inbox has its own static "Save a question" button in the page header
  // instead; Priority Mix has no capture entry point at all.
  if (pathname === '/settings' || pathname === '/inbox' || pathname === '/priority-mix') return null

  const isHome = pathname === '/'
  const segments = pathname.split('/').filter(Boolean)
  const currentSection = findSection(groups, segments)
  // A topic overview is a single segment — a section URL is always at least
  // two, so this can't match one by accident.
  const currentGroup = segments.length === 1 ? findGroup(groups, segments[0]) : null
  // On a DSA topic's overview there's no section in the URL — the modal picks
  // among that topic's DSA subtopics, or names a new one. A DSA topic with no
  // subtopics yet is the normal starting state, so it still opens.
  const dsaGroup = currentGroup?.isDsa ? currentGroup : null
  const isDsaAdd = !!currentSection?.isDsa || !!dsaGroup
  const addLabel = isHome
    ? 'Add topic'
    : isDsaAdd
      ? 'Add DSA question'
      : 'Add question'

  return (
    <>
      <button
        className="fab"
        style={style}
        title={addLabel}
        aria-label={addLabel}
        onClick={() => setOpen(true)}
        {...handlers}
      >
        <Plus size={22} />
      </button>
      {open && (
        isHome ? (
          <AddTopicModal
            onClose={() => setOpen(false)}
            onSaved={(result) => {
              setOpen(false)
              if (result.kind === 'subtopic') {
                router.push(sectionUrl(result.section))
              } else {
                router.refresh()
              }
            }}
          />
        ) : isDsaAdd ? (
          <DsaQuestionModal
            section={currentSection?.isDsa ? currentSection : undefined}
            groupSlug={dsaGroup?.slug}
            onClose={() => setOpen(false)}
            onSaved={(_question, section) => {
              setOpen(false)
              const url = sectionUrl(section)
              if (pathname === url) router.refresh()
              else router.push(url)
            }}
          />
        ) : currentSection && isCodeOutputSection(currentSection) ? (
          <CodeQuestionModal
            section={currentSection}
            onClose={() => setOpen(false)}
            onSaved={() => {
              setOpen(false)
              router.refresh()
            }}
          />
        ) : (
          <AddQuestionModal
            defaultSection={currentSection ?? undefined}
            onClose={() => setOpen(false)}
            onSaved={(_question, section) => {
              setOpen(false)
              const url = sectionUrl(section)
              if (pathname === url) router.refresh()
              else router.push(url)
            }}
          />
        )
      )}
    </>
  )
}
