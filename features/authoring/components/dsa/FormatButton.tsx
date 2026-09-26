'use client';

import { AlignLeft } from 'lucide-react';
import { selectAnyBusy, useDsa } from '../../store/dsa/dsaStore';

type Props = {
  text: string;
  noun: string;
  onClick: () => void;
};

export const FormatButton = ({ text, noun, onClick }: Props) => {
  const anyBusy = useDsa(selectAnyBusy);
  const canFormat = text.trim().length > 3 && !anyBusy;
  const article = /^[aeiou]/i.test(noun) ? 'an' : 'a';
  const title = canFormat
    ? `Reformat the ${noun} below into the app's markdown style — keeps your content as-is`
    : `Write or paste ${article} ${noun} below first`;

  return (
    <button
      type="button"
      className="aq-format-btn"
      disabled={!canFormat}
      title={title}
      onClick={onClick}
    >
      <AlignLeft size={13} /> Format
    </button>
  );
};
