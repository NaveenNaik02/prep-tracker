'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { addLibraryEntry, type LibraryEntryInput } from '../actions/library';
import { LibraryModal } from './LibraryModal';

export const LibraryAddButton = () => {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Straight into the new entry — it was just written, so reading it back is
  // the natural next step.
  const handleSave = async (input: LibraryEntryInput) => {
    const entry = await addLibraryEntry(input);
    setOpen(false);
    router.push(`/library/${entry.id}`);
  };

  return (
    <>
      <button className="ic-action primary" onClick={() => setOpen(true)}>
        <Plus size={14} /> Add to Library
      </button>
      {open && (
        <LibraryModal onClose={() => setOpen(false)} onSave={handleSave} />
      )}
    </>
  );
};
