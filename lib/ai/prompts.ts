// Every system instruction sent to Gemini, in one place.
//
// These hold the non-negotiable part of each prompt: the model's role and the
// output contract the app parses against (Markdown-only, no preamble, the
// exact JSON shapes). Style and depth guidance is the other half and does NOT
// live here — it comes from the author's editable Instructions field, backed
// by lib/instructionPresets.ts, and arrives as `instructions` on the input.
// Builders below append it; anything they hardcode is something the app
// breaks without.

const CODE_EXAMPLE =
  'Include at least one fenced code example (with a language tag) that illustrates the answer.';

const fromAuthor = (instructions?: string) => {
  return instructions?.trim()
    ? `Follow these formatting and style instructions from the author: ${instructions.trim()}`
    : '';
};

export const PROMPTS = {
  answer: (o: { wantCodeExample?: boolean; instructions?: string }) => {
    return [
      'You write study answers for a developer flashcard app.',
      'Respond only in Markdown.',
      'Do NOT start with a Markdown heading (#, ##, ###) — the question itself is already the heading; the answer body starts directly with prose.',
      'No preamble, no closing remarks, no "In summary" — start directly with the answer and end when the explanation is complete.',
      o.wantCodeExample ? CODE_EXAMPLE : '',
      fromAuthor(o.instructions),
    ]
      .filter(Boolean)
      .join(' ');
  },

  question: (o: { isImpl?: boolean; instructions?: string }) => {
    return [
      'You write a single realistic technical interview/study question for a developer flashcard app.',
      o.isImpl
        ? 'It must describe a concrete coding task to implement (e.g. "Implement a function that …").'
        : 'It should be answerable in a focused written explanation.',
      'Respond with ONLY the question itself — one sentence, no quotes, no preamble, no numbering.',
      o.instructions?.trim() ?? '',
    ]
      .filter(Boolean)
      .join(' ');
  },

  problem: (o: { instructions?: string }) => {
    return [
      'You write a short, precise problem statement (1-3 sentences, plain prose, no preamble)',
      'describing what a developer must implement, for a coding-interview flashcard app.',
      'Name the function/signature if relevant. Respond with only the problem statement.',
      o.instructions?.trim() ?? '',
    ]
      .filter(Boolean)
      .join(' ');
  },

  // Reformats rough/pasted text into the app's answer style — the "keep every
  // fact" clause is what separates this from `answer`, which may invent content.
  formatAnswer: (o: {
    isImpl?: boolean;
    isDescription?: boolean;
    wantCodeExample?: boolean;
    instructions?: string;
  }) => {
    const extra = o.instructions?.trim()
      ? `Additionally, follow these formatting preferences from the author: ${o.instructions.trim()}`
      : '';
    // A problem statement is not an answer. Without its own mode the answer
    // prompt below reads "study answer" as an instruction to solve the
    // problem, and comes back with a walkthrough and a solution.
    if (o.isDescription) {
      return [
        "You reformat a coding problem statement for a developer flashcard app's DSA question.",
        'This is the PROBLEM, not the answer. Never solve it, never add a solution, an approach, a complexity note, or any code that implements it.',
        "Keep every sentence, constraint and example the author wrote, with the same meaning — you are only applying Markdown.",
        'Format identifiers, parameters and literal values as `inline code`, and put each worked example in its own fenced block.',
        'Do NOT start with a Markdown heading — the question title is already the heading.',
        'Respond ONLY with the reformatted Markdown — no preamble, no closing remarks.',
        extra,
      ]
        .filter(Boolean)
        .join(' ');
    }
    return o.isImpl
      ? [
          "You reformat rough code/notes into a clean solution for a developer flashcard app's IMPLEMENTATION question.",
          'Respond with ONLY a fenced code block (with a language tag) — no prose, no explanation, no headings.',
          "Keep the author's logic and approach intact; only clean up formatting/syntax.",
          extra,
        ]
          .filter(Boolean)
          .join(' ')
      : [
          'You reformat rough notes into a clean Markdown study answer for a developer flashcard app.',
          'Keep every fact, step, and piece of content the author wrote — do not add new information, do not remove',
          'substance, and do not soften or expand the meaning. Only apply structure: bold key terms inline,',
          'short paragraphs or lists where that helps scanning, and fenced code blocks (with a language tag) for any code.',
          'Do NOT start with a Markdown heading — the question itself is already the heading.',
          'Respond ONLY with the reformatted Markdown — no preamble, no closing remarks.',
          o.wantCodeExample ? CODE_EXAMPLE : '',
          extra,
        ]
          .filter(Boolean)
          .join(' ');
  },

  blurb:
    'You write a single short blurb (max ~12 words, one sentence fragment, no trailing period) ' +
    'for a topic card in a developer interview-prep app. No preamble — respond with only the blurb text.',

  codeOutput:
    'You are a code interpreter. Given a code snippet, determine exactly what it prints/returns/outputs when run. ' +
    'Respond with ONLY the raw output — no explanation, no preamble, no markdown code fences, no backticks. ' +
    'If it would throw an error, respond with the exact error message. If it produces no output, respond with "(no output)".',

  // The formatting half of this prompt lives in the 'code-explanation'
  // instruction preset so it stays editable; what's fixed here is the task
  // itself and the no-preamble rule.
  codeExplanation: (o: { instructions?: string }) => {
    return [
      "You write a short explanation, in Markdown, of why a code snippet produces its output — for a developer flashcard app's code-output question.",
      'Respond ONLY with the explanation — no preamble, no closing remarks.',
      o.instructions?.trim() ?? '',
    ]
      .filter(Boolean)
      .join(' ');
  },

  // Same contract as codeExplanation, different task: a DSA explanation is
  // about the approach, not about why a snippet prints what it prints. Shares
  // the 'code-explanation' instruction preset rather than adding a fifth
  // protected built-in.
  dsaExplanation: (o: { instructions?: string }) => {
    return [
      "You write a short explanation, in Markdown, of how a DSA solution works — for a developer flashcard app's DSA question.",
      'Name the algorithm or pattern it uses and state its time and space complexity.',
      'Respond ONLY with the explanation — no preamble, no closing remarks.',
      o.instructions?.trim() ?? '',
    ]
      .filter(Boolean)
      .join(' ');
  },

  // One prompt behind both the per-field Generate buttons and "Generate all":
  // the caller names the keys it wants, so filling a whole question from its
  // title is a single request rather than one per field.
  dsaQuestion: (fields: readonly string[]) => {
    const spec: Record<string, string> = {
      title:
        '"title": the name of the problem, e.g. "Two Sum". Just the name — no numbering, no description. If a description or solution is given below, name that problem; otherwise pick a well-known one that fits the subtopic.',
      subtopic:
        '"subtopic": which subtopic to file this under. If one of the existing subtopics listed below fits, return its name exactly; otherwise invent a short new one. Name only.',
      description:
        '"description": the problem statement in Markdown, 1-3 sentences, naming the inputs and what to return. Language-agnostic: never name a programming language or a language-specific type or API — the language belongs to the solution, not the problem. No title, no worked examples.',
      prerequisites:
        '"prerequisites": array of 1-3 short concepts the solver should already know before attempting this.',
      code: '"code": a complete, runnable program in the requested language — the solution itself plus a short driver that calls it on the worked examples and prints each result using that language\'s own idiom (console.log, print, System.out.println, fmt.Println, …). It must run as-is and produce visible output; do not stop at a bare function definition. Plain source only — no markdown fences, no commentary. Keep real line breaks and indentation, escaped as \\n in the JSON string; never flatten it onto one line.',
      output:
        '"output": exactly what that program prints when run, line for line — just the printed text, no commentary and no repetition of the code.',
      explanation:
        '"explanation": Markdown. Name the algorithm or pattern and state its time and space complexity.',
      difficulty: '"difficulty": exactly one of "easy", "medium", "hard".',
    };
    return [
      'You draft parts of a data-structures-and-algorithms interview question for a developer flashcard app, working from the problem title.',
      'Respond with ONLY minified JSON containing exactly these keys and nothing else:',
      ...fields.map((f) => `- ${spec[f]}`),
      'Never wrap the JSON in code fences. Every field must describe the same single problem.',
    ].join('\n');
  },

  placement: [
    'You place a new flashcard question into an existing curriculum tree of topics and subtopics for a developer interview-prep app.',
    'Respond with ONLY minified JSON, no prose, matching exactly one of these shapes:',
    '{"mode":"existing","groupSlug":"...","topic":"...","file":"...","reasoning":"..."}',
    '{"mode":"new-subtopic","groupSlug":"...","label":"...","reasoning":"..."}',
    '{"mode":"new-topic","topicName":"...","blurb":"...","label":"...","reasoning":"..."}',
    'Treat every question as a fresh placement: judge only what the question is about — its subject and the context it is framed in — and ignore where it may already be filed.',
    'Prefer an existing subtopic. Filing the question alongside related ones is almost always better than a new home, even when the fit is good rather than perfect.',
    'A new subtopic has to earn itself: propose one only when it opens an area you would expect several more questions to join, never as a home for a single stray question. A new topic is rarer still.',
    'For "existing", copy groupSlug/topic/file exactly from the tree below, never invent them.',
    'Never force a fit — a keyword in common with an existing subtopic is not enough if the question really belongs elsewhere.',
    'A "Description" is the question\'s own problem statement — read it to settle what the question is really about when the title is terse, but place the question, not the description: a data structure or API it happens to mention in passing is not on its own a reason to file it there.',
    'A "Rejected" list means the author has already turned those placements down — never suggest one of them again, nor a trivial variation of one. Give the best remaining home, and propose a new subtopic or new topic when that has become the honest answer.',
    '"label" and "topicName" are display names shown in a picker, like the existing subtopic names in the tree (e.g. "Redux", "Scalability Basics") — Title Case words with spaces, never a slug or hyphenated string.',
    'Keep reasoning under 12 words, no trailing period.',
  ].join(' '),

  duplicate: [
    "You check whether a new flashcard question is a duplicate (or a very close near-duplicate) of any question already in a subtopic's list.",
    'Respond with ONLY minified JSON: {"isDuplicate":true|false,"matchIndex":<number or null>,"reasoning":"..."}.',
    'matchIndex is the 0-based index of the closest existing match when isDuplicate is true, else null.',
    'Keep reasoning under 16 words, no trailing period.',
  ].join(' '),

  splitInbox: [
    'You extract individual interview questions from a pasted block of text (often a LinkedIn post, recruiter email, or notes).',
    'Respond with ONLY minified JSON: an array of strings, one per distinct question, in the original wording.',
    'Ignore commentary, intros, and sign-offs.',
    'If the whole text is a single question, return an array with one string.',
  ].join(' '),
};
