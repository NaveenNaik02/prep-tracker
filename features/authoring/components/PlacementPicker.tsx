'use client';

import { Sparkles } from 'lucide-react';
import AqSelect from '@/components/AqSelect';
import { useAuthoring, usePlacementView } from '../store/authoringStore';
import { SuggestionCard } from './SuggestionCard';

// Topic/subtopic pickers plus the "Suggest placement" flow. The suggestion
// card previews where the AI wants the question to go — including topics or
// subtopics that don't exist yet — and only touches state when accepted.
export const PlacementPicker = () => {
  const { topicOptions, sectionOptions } = usePlacementView();
  const groups = useAuthoring((s) => s.groups);
  const groupSlug = useAuthoring((s) => s.groupSlug);
  const sectionK = useAuthoring((s) => s.sectionK);
  const setGroupSlug = useAuthoring((s) => s.setGroupSlug);
  const setSectionK = useAuthoring((s) => s.setSectionK);
  const title = useAuthoring((s) => s.title);
  const suggestion = useAuthoring((s) => s.suggestion);
  const suggestState = useAuthoring((s) => s.suggestState);
  const suggest = useAuthoring((s) => s.suggestPlacement);
  const accept = useAuthoring((s) => s.acceptSuggestion);
  const dismiss = useAuthoring((s) => s.dismissSuggestion);
  const reject = useAuthoring((s) => s.rejectSuggestion);
  const back = useAuthoring((s) => s.backSuggestion);
  const history = useAuthoring((s) => s.history);
  const at = useAuthoring((s) => s.at);

  const canSuggest = title.trim().length > 3 && suggestState !== 'loading';
  const groupName = (slug: string) => {
    return groups.find((g) => g.slug === slug)?.groupName;
  };

  return (
    <>
      <div className="aq-field">
        <div className="aq-label-row">
          <label>Placement</label>
          <button
            type="button"
            className={`aq-generate-btn ${suggestState === 'loading' ? 'loading' : ''}`}
            onClick={suggest}
            disabled={!canSuggest}
            title={
              canSuggest
                ? 'Suggest where this question belongs, using the existing topics'
                : 'Write a question first'
            }
          >
            {suggestState === 'loading' ? (
              <>
                <span className="aq-gen-spinner" />
                Thinking…
              </>
            ) : (
              <>
                <Sparkles size={12.5} /> Suggest placement
              </>
            )}
          </button>
        </div>
        {suggestState === 'error' && (
          <div
            className="aq-gen-error"
            style={{ padding: '0 0 6px', background: 'none' }}
          >
            Couldn&apos;t get a suggestion — try again.
          </div>
        )}
      </div>

      <div className="aq-row">
        <div className="aq-field">
          <label htmlFor="aq-topic">Topic</label>
          <AqSelect
            id="aq-topic"
            value={groupSlug}
            onChange={setGroupSlug}
            options={topicOptions}
          />
        </div>
        <div className="aq-field">
          <label htmlFor="aq-subtopic">Subtopic</label>
          <AqSelect
            id="aq-subtopic"
            value={sectionK}
            onChange={setSectionK}
            options={sectionOptions}
          />
        </div>
      </div>

      {suggestion && (
        <SuggestionCard
          path={
            <>
              {suggestion.mode === 'existing' && (
                <>
                  <b>{groupName(suggestion.groupSlug)}</b>
                  {' → '}
                  <b>
                    {
                      groups
                        .find((g) => g.slug === suggestion.groupSlug)
                        ?.sections.find((s) => {
                          return (
                            s.topic === suggestion.topic &&
                            s.file === suggestion.file
                          );
                        })?.label
                    }
                  </b>
                </>
              )}
              {suggestion.mode === 'new-subtopic' && (
                <>
                  <b>{groupName(suggestion.groupSlug)}</b>
                  {' → '}
                  <b>{suggestion.label}</b>
                  <span className="aq-suggest-badge">new subtopic</span>
                </>
              )}
              {suggestion.mode === 'new-topic' && (
                <>
                  <b>{suggestion.topicName}</b>
                  <span className="aq-suggest-badge">new topic</span>
                  {' → '}
                  <b>{suggestion.label}</b>
                  <span className="aq-suggest-badge">new subtopic</span>
                </>
              )}
            </>
          }
          reasoning={suggestion.reasoning}
          at={at}
          total={history.length}
          onDismiss={dismiss}
          onBack={back}
          onReject={reject}
          onAccept={accept}
        />
      )}
    </>
  );
};
