import { describe, it, expect, vi, beforeEach } from 'vitest';

const suggestPlacement = vi.fn();

vi.mock('@/lib/ai/suggestPlacement', () => ({ suggestPlacement }));
vi.mock('@/lib/ai/generateDsaQuestion', () => ({
  generateDsaQuestion: vi.fn(),
}));
vi.mock('@/lib/actions/topics', () => ({ addSection: vi.fn() }));
vi.mock('@/lib/actions/questions', () => ({
  addQuestion: vi.fn(),
  updateQuestion: vi.fn(),
}));

const { createDsaStore } = await import('./dsaStore');
const { STAGED } = await import('./placementSlice');

const GROUPS = [
  {
    slug: 'dsa',
    groupName: 'DSA',
    blurb: '',
    sections: [
      { topic: 'dsa', file: 'arrays', label: 'Arrays', isDsa: true },
      { topic: 'dsa', file: 'graphs', label: 'Graphs', isDsa: true },
    ],
  },
];

const arrays = {
  mode: 'existing',
  groupSlug: 'dsa',
  topic: 'dsa',
  file: 'arrays',
  reasoning: 'fits',
};
const graphs = { ...arrays, file: 'graphs' };

const makeStore = () => {
  return createDsaStore({
    groupSlug: 'dsa',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    groups: GROUPS as any,
    defaultPriority: null,
    onSaved: vi.fn(),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('placement suggestions', () => {
  it('walks back and forward through history, calling only for new ones', async () => {
    suggestPlacement
      .mockResolvedValueOnce(arrays)
      .mockResolvedValueOnce(graphs);
    const store = makeStore();

    await store.getState().suggest();
    await store.getState().reject();
    expect(suggestPlacement).toHaveBeenCalledTimes(2);
    expect(suggestPlacement.mock.calls[1][0].rejected).toEqual([arrays]);
    expect(store.getState().at).toBe(1);

    store.getState().back();
    expect(store.getState().at).toBe(0);

    // Forward again replays the one already offered — no new call.
    await store.getState().reject();
    expect(store.getState().at).toBe(1);
    expect(suggestPlacement).toHaveBeenCalledTimes(2);
  });

  it('accepting applies the placement and clears the history', async () => {
    suggestPlacement.mockResolvedValueOnce(graphs);
    const store = makeStore();

    await store.getState().suggest();
    store.getState().accept();
    expect(store.getState().targetUrl).toBe('/dsa/graphs');
    expect(store.getState().history).toEqual([]);
  });
});

describe('stageOrSelect', () => {
  it('selects an existing subtopic regardless of case', () => {
    const store = makeStore();
    store.getState().stageOrSelect('  graphs ');
    expect(store.getState().targetUrl).toBe('/dsa/graphs');
    expect(store.getState().stagedLabel).toBeNull();
  });

  it('stages a new name without creating it', () => {
    const store = makeStore();
    store.getState().stageOrSelect('Heaps');
    expect(store.getState().targetUrl).toBe(STAGED);
    expect(store.getState().stagedLabel).toBe('Heaps');
  });
});

describe('keepDraft', () => {
  it('parks each text once, even when kept twice in one tick', () => {
    const store = makeStore();
    store.getState().keepDraft('descDrafts', 'first', false);
    store.getState().keepDraft('descDrafts', 'first', true);
    store.getState().keepDraft('descDrafts', 'second', true);
    const { versions, activeId } = store.getState().descDrafts;
    expect(versions.map((v) => v.text)).toEqual(['first', 'second']);
    expect(activeId).toBe('v2');
  });
});
