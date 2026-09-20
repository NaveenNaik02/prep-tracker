import type { CSSProperties } from 'react';
import { libType, type LibraryType } from '../types';

export const LibTag = ({ type }: { type: LibraryType }) => {
  const { label, hue } = libType(type);
  return (
    <span className="lib-tag" style={{ '--h': hue } as CSSProperties}>
      {label}
    </span>
  );
};
