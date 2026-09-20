import { RefreshCw, Sparkles } from 'lucide-react';

interface Props {
  loading: boolean;
  // Switches the label to Regenerate — the field already holds something this
  // click would replace.
  hasValue?: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
  label?: string;
  loadingLabel?: string;
}

export const GenerateButton = ({
  loading,
  hasValue,
  disabled,
  title,
  onClick,
  label = 'Generate',
  loadingLabel = 'Generating…',
}: Props) => {
  return (
    <button
      type="button"
      className={`aq-generate-btn ${loading ? 'loading' : ''}`}
      disabled={disabled || loading}
      title={title}
      onClick={onClick}
    >
      {loading ? (
        <>
          <span className="aq-gen-spinner" />
          {loadingLabel}
        </>
      ) : hasValue ? (
        <>
          <RefreshCw size={12.5} /> Regenerate
        </>
      ) : (
        <>
          <Sparkles size={12.5} /> {label}
        </>
      )}
    </button>
  );
};
