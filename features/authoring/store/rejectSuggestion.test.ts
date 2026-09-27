import { describe, it, expect, vi, beforeEach } from 'vitest';

const suggestPlacement = vi.fn();

vi.mock('@/lib/ai/suggestPlacement', () => ({ suggestPlacement }));
vi.mock('@/lib/ai/generateQuestion', () => ({ generateQuestion: vi.fn() }));
vi.mock('@/lib/ai/checkDuplicate', () => ({ checkDuplicateQuestion: vi.fn() }));
vi.mock('@/lib/ai/generateAnswer', () => ({ generateAnswer: vi.fn() }));
vi.mock('@/lib/ai/generateProblem', () => ({ generateProblem: vi.fn() }));
vi.mock('@/lib/ai/formatAnswer', () => ({ formatAnswer: vi.fn() }));
vi.mock('@/lib/actions/topics', () => ({
  addTopicGroup: vi.fn(),
  addSection: vi.fn(),
}));

const ok = <T>(data: T) => ({ ok: true, data });

const { createAuthoringStore } = await import('./authoringStore');

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

const closures = {
  mode: 'existing',
  groupSlug: 'js',
  topic: 'js',
  file: 'closures',
  reasoning: 'fits',
};
const scope = { ...closures, file: 'scope' };

const makeStore = () => {
  return createAuthoringStore({
    heading: '',
    footNote: '',
    submitLabel: '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    groups: GROUPS as any,
    defaultPriority: null,
    onSubmit: vi.fn(),
    onClose: vi.fn(),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  suggestPlacement.mockResolvedValue(ok(closures));
});

describe('rejectSuggestion', () => {
  it('sends every turned-down placement into the next run', async () => {
    const store = makeStore();
    store.getState().setTitle('What is a closure?');

    await store.getState().suggestPlacement();
    expect(suggestPlacement.mock.calls[0][0].rejected).toEqual([]);

    suggestPlacement.mockResolvedValue(ok(scope));
    await store.getState().rejectSuggestion();
    expect(suggestPlacement.mock.calls[1][0].rejected).toEqual([closures]);

    suggestPlacement.mockResolvedValue(ok({ ...closures, file: 'other' }));
    await store.getState().rejectSuggestion();
    expect(suggestPlacement.mock.calls[2][0].rejected).toEqual([
      closures,
      scope,
    ]);
  });

  it('forgets the history once a placement is accepted', async () => {
    const store = makeStore();
    store.getState().setTitle('What is a closure?');

    await store.getState().suggestPlacement();
    await store.getState().rejectSuggestion();
    expect(store.getState().history).toHaveLength(2);

    store.getState().acceptSuggestion();
    expect(store.getState().history).toEqual([]);
    expect(store.getState().at).toBe(-1);
  });

  it('does nothing when there is no suggestion to reject', async () => {
    const store = makeStore();
    await store.getState().rejectSuggestion();
    expect(suggestPlacement).not.toHaveBeenCalled();
    expect(store.getState().history).toEqual([]);
  });

  it('steps back and forward through history without calling out again', async () => {
    const store = makeStore();
    store.getState().setTitle('What is a closure?');

    await store.getState().suggestPlacement();
    suggestPlacement.mockResolvedValue(ok(scope));
    await store.getState().rejectSuggestion();
    expect(store.getState().suggestion).toEqual(scope);
    expect(suggestPlacement).toHaveBeenCalledTimes(2);

    store.getState().backSuggestion();
    expect(store.getState().suggestion).toEqual(closures);

    // Forward again is already known — no third call.
    await store.getState().rejectSuggestion();
    expect(store.getState().suggestion).toEqual(scope);
    expect(suggestPlacement).toHaveBeenCalledTimes(2);
  });

  it('stops at the oldest suggestion', async () => {
    const store = makeStore();
    store.getState().setTitle('What is a closure?');

    await store.getState().suggestPlacement();
    store.getState().backSuggestion();
    store.getState().backSuggestion();
    expect(store.getState().suggestion).toEqual(closures);
    expect(store.getState().at).toBe(0);
  });
});
