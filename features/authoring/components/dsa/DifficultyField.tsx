'use client';

import { useDsa, useFieldError } from '../../store/dsa/dsaStore';
import { FieldGenerateButton } from './FieldGenerateButton';
import { FormField } from './FormField';

// Difficulty is the priority column under DSA labels — same three levels, so
// a DSA question stays filterable and sortable as priority everywhere else.
const DIFFICULTY_OPTIONS = [
  { level: 'low', label: 'Easy' },
  { level: 'med', label: 'Medium' },
  { level: 'high', label: 'Hard' },
] as const;

export const DifficultyField = () => {
  const priority = useDsa((s) => s.priority);
  const setPriority = useDsa((s) => s.setPriority);
  const error = useFieldError('difficulty');
  return (
    <FormField
      label="Difficulty"
      action={<FieldGenerateButton field="difficulty" hasValue={!!priority} />}
      error={error}
    >
      <div className="aq-pills">
        {DIFFICULTY_OPTIONS.map((o) => (
          <button
            key={o.level}
            type="button"
            className={`aq-pill ${o.level} ${priority === o.level ? 'on' : ''}`}
            onClick={() => setPriority(priority === o.level ? null : o.level)}
          >
            <span className="pdot" />
            {o.label}
          </button>
        ))}
      </div>
    </FormField>
  );
};
