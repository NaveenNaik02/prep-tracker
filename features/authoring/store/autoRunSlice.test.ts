import { describe, it, expect, vi, beforeEach } from 'vitest';

const generateQuestion = vi.fn();
const suggestPlacement = vi.fn();
const checkDuplicateQuestion = vi.fn();
const generateAnswer = vi.fn();

vi.mock('@/lib/ai/generateQuestion', () => ({ generateQuestion }));
vi.mock('@/lib/ai/suggestPlacement', () => ({ suggestPlacement }));
vi.mock('@/lib/ai/checkDuplicate', () => ({ checkDuplicateQuestion }));
vi.mock('@/lib/ai/generateAnswer', () => ({ generateAnswer }));
vi.mock('@/lib/ai/generateProblem', () => ({ generateProblem: vi.fn() }));
vi.mock('@/lib/ai/formatAnswer', () => ({ formatAnswer: vi.fn() }));
vi.mock('@/lib/actions/topics', () => ({
  addTopicGroup: vi.fn(),
  addSection: vi.fn(),
}));

const ok = <T>(data: T) => ({ ok: true, data });

const { createAuthoringStore } = await import('./authoringStore');

type SectionMeta = { topic: string; file: string; label: string };

const GROUPS = [
  {
    slug: 'js',
    groupName: 'JavaScript',
    blurb: '',
    sections: [
      { topic: 'js', file: 'closures', label: 'Closures' },
      { topic: 'js', file: 'scope', label: 'Scope' },
    ],
  },
];

// The typewriter is a React effect the store can't run itself, so stand in
// for it: play every parked stream through instantly.
const makeStore = (init: { initialSection?: SectionMeta } = {}) => {
  const store = createAuthoringStore({
    heading: '',
    footNote: '',
    submitLabel: '',
    initialSection: init.initialSection,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    groups: GROUPS as any,
    defaultPriority: null,
    onSubmit: vi.fn(),
    onClose: vi.fn(),
  });
  // Keyed on the token like the real bridge's effect, or writing the field
  // would re-enter this subscriber before the stream clears.
  let played = 0;
  store.subscribe((s) => {
    if (!s.stream || s.stream.token === played) return;
    played = s.stream.token;
    const { target, text } = s.stream;
    if (target === 'title') store.getState().setTitle(text);
    else if (target === 'markdown') store.getState().setMarkdown(text);
    store.getState().finishStream();
  });
  return store;
};

const clean = {
  isDuplicate: false,
  match: null,
  reasoning: 'nothing alike',
};

beforeEach(() => {
  vi.clearAllMocks();
  generateQuestion.mockResolvedValue(ok('What is a closure?'));
  suggestPlacement.mockResolvedValue(
    ok({
      mode: 'existing',
      groupSlug: 'js',
      topic: 'js',
      file: 'closures',
      reasoning: 'fits',
    }),
  );
  checkDuplicateQuestion.mockResolvedValue(ok(clean));
  generateAnswer.mockResolvedValue(ok('A function plus its scope.'));
});

describe('auto-run pipeline', () => {
  it('runs every step and stops without saving', async () => {
    const store = makeStore();
    await store.getState().startAuto();

    const s = store.getState();
    expect(s.autoStatus).toBe('done');
    expect(s.title).toBe('What is a closure?');
    expect(s.sectionK).toBe('js/closures');
    expect(s.markdown).toBe('A function plus its scope.');
    expect(s.onSubmit).not.toHaveBeenCalled();
  });

  it('skips the duplicate check when placement leaves the question put', async () => {
    const store = makeStore({
      initialSection: { topic: 'js', file: 'closures', label: 'Closures' },
    });

    await store.getState().startAuto();
    expect(store.getState().autoStatus).toBe('done');
    expect(checkDuplicateQuestion).not.toHaveBeenCalled();
  });

  it('checks for duplicates when placement moves the question', async () => {
    suggestPlacement.mockResolvedValue(
      ok({
        mode: 'existing',
        groupSlug: 'js',
        topic: 'js',
        file: 'scope',
        reasoning: 'better fit',
      }),
    );
    const store = makeStore({
      initialSection: { topic: 'js', file: 'closures', label: 'Closures' },
    });

    await store.getState().startAuto();
    expect(store.getState().sectionK).toBe('js/scope');
    expect(checkDuplicateQuestion).toHaveBeenCalledOnce();
  });

  it('pauses on a duplicate and leaves the answer step unrun', async () => {
    checkDuplicateQuestion.mockResolvedValue(
      ok({
        isDuplicate: true,
        match: 'Explain closures',
        reasoning: 'same question',
      }),
    );
    const store = makeStore();
    await store.getState().startAuto();

    expect(store.getState().autoStatus).toBe('paused');
    expect(generateAnswer).not.toHaveBeenCalled();

    await store.getState().keepAsNew();
    expect(store.getState().autoStatus).toBe('done');
    expect(generateAnswer).toHaveBeenCalledOnce();
  });

  it('carries on past a failed step instead of blocking the run', async () => {
    suggestPlacement.mockResolvedValueOnce({
      ok: false,
      error: 'rate limited',
    });
    const store = makeStore();
    await store.getState().startAuto();

    // The field shows its own error; the remaining steps still run.
    expect(store.getState().suggestState).toBe('error');
    expect(store.getState().autoStatus).toBe('done');
    expect(generateAnswer).toHaveBeenCalledOnce();
  });

  it('skips the duplicate check when placement staged a new subtopic', async () => {
    suggestPlacement.mockResolvedValue(
      ok({
        mode: 'new-subtopic',
        groupSlug: 'js',
        label: 'Scope',
        reasoning: 'no home yet',
      }),
    );
    const store = makeStore();
    await store.getState().startAuto();

    expect(store.getState().autoStatus).toBe('done');
    expect(checkDuplicateQuestion).not.toHaveBeenCalled();
  });

  it('abandons an in-flight run when switched to manual', async () => {
    let releaseAnswer: (result: unknown) => void = () => {};
    generateAnswer.mockReturnValue(
      new Promise((resolve) => {
        releaseAnswer = resolve;
      }),
    );
    const store = makeStore();
    const run = store.getState().startAuto();
    await Promise.resolve();

    store.getState().dismissAuto();
    releaseAnswer(ok('too late'));
    await run;

    expect(store.getState().autoStatus).toBe('idle');
  });

  it('pins its calls to Flash Lite without touching the saved picker', async () => {
    const store = makeStore();
    // The picker lives in Settings now and seeds the store at construction,
    // so there's no in-modal setter to go through.
    store.setState({ model: 'gemini-3-flash-preview' });
    await store.getState().startAuto();

    for (const call of [
      generateQuestion,
      suggestPlacement,
      checkDuplicateQuestion,
      generateAnswer,
    ]) {
      expect(call.mock.calls[0][0]).toMatchObject({
        model: 'gemini-3.1-flash-lite',
      });
    }
    // The run redirects its own requests only — the preference is untouched,
    // so the manual buttons still use whatever was picked.
    expect(store.getState().model).toBe('gemini-3-flash-preview');

    await store.getState().generateAnswer();
    expect(generateAnswer.mock.calls[1][0]).toMatchObject({
      model: 'gemini-3-flash-preview',
    });
  });
});
