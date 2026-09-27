'use client';

import { useDsa } from '../../store/dsa/dsaStore';
import { PRIORITY_OPTIONS } from '../../types';
import { FormField } from './FormField';

export const PriorityField = () => {
  const priority = useDsa((s) => s.priority);
  const setPriority = useDsa((s) => s.setPriority);
  return (
    <FormField label="Priority">
      <div className="aq-pills">
        {PRIORITY_OPTIONS.map((o) => (
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
