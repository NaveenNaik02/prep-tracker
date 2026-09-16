// Instruction presets are owned by ProgressContext (via user_settings in
// Supabase) alongside the rest of Settings — see addInstructionPreset /
// updateInstructionPreset / deleteInstructionPreset there. Per-question edits
// in that modal's Instructions dialog only change that question's local
// draft — they never write back here.
//
// Every question starts from one of two built-in, protected presets —
// picked automatically by kind ('text' for a regular answer, 'code' once
// the Implementation toggle is on), not by a single global "active" choice.
// Custom presets you add are just saved snippets you can pull into a single
// question via "Start from a saved version" in the Instructions dialog.
export interface InstructionPreset {
  id: string
  name: string
  text: string
  protected?: boolean
  kind?: 'text' | 'code' | 'suggestion' | 'problem' | 'code-explanation' | 'description'
}

const PRESETS_KEY = 'prep-tracker:ai-instruction-presets'
const ACTIVE_PRESET_KEY = 'prep-tracker:ai-active-instruction-preset'

const DEFAULT_TEXT_PRESET_ID = 'default-text'
const DEFAULT_CODE_PRESET_ID = 'default-code'
const DEFAULT_SUGGESTION_PRESET_ID = 'default-suggestion'
const DEFAULT_PROBLEM_PRESET_ID = 'default-problem'
const DEFAULT_DESCRIPTION_PRESET_ID = 'default-description'
const DEFAULT_CODE_EXPLANATION_PRESET_ID = 'default-code-explanation'

const DEFAULT_TEXT_INSTRUCTIONS = [
  'Lead with a bold key term or topic name and a one-line definition in the same sentence, then expand with bullet points written as complete narrative sentences (not fragments). This is the default format.',
  "Keep it natural and concise, not padded — use only as many bullets as the topic genuinely needs. If the opening sentence alone fully answers it, that's enough.",
  'Bold key technical terms inline within the sentence as they come up — never as a static label like "**Caching:** ...".',
  'Use an em dash (—) within a bullet to add contrast or elaboration where it reads naturally.',
  'Switch to a Markdown table only when the content is inherently comparative (e.g. "X vs Y"). Use code blocks only when a code example is genuinely needed.',
].map(line => `- ${line}`).join('\n')

const DEFAULT_CODE_INSTRUCTIONS = 'Respond with only the code snippet as a fenced code block — no explanation, no preamble, no comments unless essential to understanding the code.'

// Governs the "Generate question" button — refining an existing draft should
// only polish wording, never change what's actually being asked (see the
// seed line in generateQuestion.ts, which hands the draft over neutrally so
// this instruction is the only thing steering that behavior).
const DEFAULT_SUGGESTION_INSTRUCTIONS = 'If a draft question is already provided, only fix spelling, grammar, and awkward wording, or find a cleaner way to phrase the exact same question — do not add any requirement, detail, constraint, or sub-part that wasn\'t already in the draft (no new mentions of specific approaches, edge cases, parameters, or "correctly handles X, Y, and Z" additions). The result should stay about the same length and simplicity as the draft, never longer or more elaborate. Only compose a brand-new question from scratch when no draft text exists yet — in that case, keep it concise and concrete: one sentence, phrased the way a real interviewer would ask it, no multi-part questions.'

const DEFAULT_PROBLEM_INSTRUCTIONS = "Keep it to 1-3 sentences of plain prose, name the function/signature if relevant, and don't restate the question verbatim."

// Governs Format on a DSA question's Description. Deliberately separate from
// the 'problem' preset above: that one generates a terse 1-3 sentence problem
// statement, which when fed to Format told the model to compress away the
// author's worked examples.
const DEFAULT_DESCRIPTION_INSTRUCTIONS = 'Format identifiers, parameters and literal values as `inline code`, and put each worked example in its own fenced block. Keep the examples exactly as written.'

// Governs the code-output subtopic's "Generate" on the Explanation field.
// Kept here rather than hardcoded in generateCodeOutput.ts so editing it in
// Settings actually changes what the model is told.
const DEFAULT_CODE_EXPLANATION_INSTRUCTIONS = 'Use ## for section heading(s) if useful, **bold** for key terms, short paragraphs. Keep it focused on the mechanism (evaluation order, scoping, coercion, async timing, etc.), not a restatement of the code.'

export const DEFAULT_PRESETS: InstructionPreset[] = [
  { id: DEFAULT_TEXT_PRESET_ID, name: 'Detailed explanation', text: DEFAULT_TEXT_INSTRUCTIONS, protected: true, kind: 'text' },
  { id: DEFAULT_CODE_PRESET_ID, name: 'Code snippet only', text: DEFAULT_CODE_INSTRUCTIONS, protected: true, kind: 'code' },
  { id: DEFAULT_SUGGESTION_PRESET_ID, name: 'Question suggestion', text: DEFAULT_SUGGESTION_INSTRUCTIONS, protected: true, kind: 'suggestion' },
  { id: DEFAULT_PROBLEM_PRESET_ID, name: 'Implementation problem statement', text: DEFAULT_PROBLEM_INSTRUCTIONS, protected: true, kind: 'problem' },
  { id: DEFAULT_CODE_EXPLANATION_PRESET_ID, name: 'Code output explanation', text: DEFAULT_CODE_EXPLANATION_INSTRUCTIONS, protected: true, kind: 'code-explanation' },
  { id: DEFAULT_DESCRIPTION_PRESET_ID, name: 'DSA problem description', text: DEFAULT_DESCRIPTION_INSTRUCTIONS, protected: true, kind: 'description' },
]

export function presetUid(): string {
  return `preset_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

// Ensures every protected kind-tagged preset exists, for lists saved
// before one of them was introduced — prepends/appends whichever is missing
// and backfills a default's text if it was ever saved blank. Safe to call on
// an already-migrated list (no-op).
export function migratePresets(list: InstructionPreset[]): InstructionPreset[] {
  // Derived from DEFAULT_PRESETS rather than a check per preset: the old
  // hand-written ladder silently skipped any preset added after it was written.
  let next = list
  for (const preset of DEFAULT_PRESETS) {
    const existing = next.find(p => p.id === preset.id)
    if (!existing) {
      // The text preset has always led the list; the rest append.
      next = preset.id === DEFAULT_TEXT_PRESET_ID ? [preset, ...next] : [...next, preset]
      continue
    }
    // An emptied protected preset is restored — except the text one, where a
    // blank means "no extra instructions" and is the author's choice.
    if (preset.id !== DEFAULT_TEXT_PRESET_ID && !existing.text.trim()) {
      next = next.map(p => (p.id === preset.id ? { ...p, text: preset.text } : p))
    }
  }
  return next
}

export function loadPresets(): InstructionPreset[] {
  try {
    const raw = JSON.parse(localStorage.getItem(PRESETS_KEY) || 'null')
    if (Array.isArray(raw) && raw.length) return migratePresets(raw)
  } catch {}
  return DEFAULT_PRESETS
}

export function savePresets(list: InstructionPreset[]) {
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(list)) } catch {}
}

// Vestigial: predates the kind-based auto-selection below. Still tracked so
// existing rows/localStorage keep a stable "last picked" value, but nothing
// in the UI lets you set this anymore.
export function loadActivePresetId(presets: InstructionPreset[]): string {
  let id: string | null = null
  try { id = localStorage.getItem(ACTIVE_PRESET_KEY) } catch {}
  if (id && presets.some(p => p.id === id)) return id
  return presets[0].id
}

export function saveActivePresetId(id: string) {
  try { localStorage.setItem(ACTIVE_PRESET_KEY, id) } catch {}
}

// Read-only helper used to seed a fresh question's instructions draft — the
// text/code defaults are fixed to the two protected kind presets, not
// user-selectable as a single global default.
export function getActiveInstructionText(isImpl: boolean): string {
  const presets = loadPresets()
  const wantKind = isImpl ? 'code' : 'text'
  const active = presets.find(p => p.kind === wantKind) || presets[0]
  return active?.text || ''
}

// Fixed instruction text (kind: 'suggestion'/'problem') for the "Generate
// question" / "Generate problem statement" buttons — user-editable in
// Settings like the answer-instruction defaults above.
export function getSuggestionInstructionText(): string {
  return loadPresets().find(p => p.kind === 'suggestion')?.text || ''
}

export function getProblemInstructionText(): string {
  return loadPresets().find(p => p.kind === 'problem')?.text || ''
}

export function getCodeExplanationInstructionText(): string {
  return loadPresets().find(p => p.kind === 'code-explanation')?.text || ''
}

export function getDescriptionInstructionText(): string {
  return loadPresets().find(p => p.kind === 'description')?.text || ''
}
