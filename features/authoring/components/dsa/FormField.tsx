import type { ReactNode } from 'react';

interface Props {
  label?: ReactNode;
  htmlFor?: string;
  // Sits on the label's row — a Generate/Suggest button.
  action?: ReactNode;
  error?: string | null;
  children: ReactNode;
}

// The label / control / error block every field in the DSA form repeats.
export const FormField = ({
  label,
  htmlFor,
  action,
  error,
  children,
}: Props) => {
  const labelEl = label ? <label htmlFor={htmlFor}>{label}</label> : null;
  return (
    <div className="aq-field">
      {action ? (
        <div className="aq-label-row">
          {labelEl}
          {action}
        </div>
      ) : (
        labelEl
      )}
      {children}
      {error && <div className="aq-gen-error">{error}</div>}
    </div>
  );
};
