'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  deleteLibraryEntry,
  updateLibraryEntry,
  type LibraryEntryInput,
} from '../actions/library';
import { LibraryModal } from './LibraryModal';
import type { LibraryEntry } from '../types';

// The article page itself is a server component; these two buttons and the
// modal they open are the only client-side part of it.
export const LibraryArticleActions = ({ entry }: { entry: LibraryEntry }) => {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const router = useRouter();

  const handleSave = async (input: LibraryEntryInput) => {
    await updateLibraryEntry(entry.id, input);
    setEditing(false);
    router.refresh();
  };

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await deleteLibraryEntry(entry.id);
      router.push('/library');
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Could not delete — try again.',
      );
    }
  };

  return (
    <>
      <div className="lib-article-actions">
        <a
          className="action-chip"
          href={`/read/${entry.shareToken}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Open this write-up on its own page — anyone with the link can read it"
        >
          <ExternalLink size={13} /> Open standalone
        </a>
        <button className="action-chip" onClick={() => setEditing(true)}>
          <Pencil size={13} /> Edit
        </button>
        <button
          className="action-chip danger"
          onClick={() => setConfirming(true)}
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>

      {editing && (
        <LibraryModal
          entry={entry}
          onClose={() => setEditing(false)}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        open={confirming}
        danger
        title="Delete this entry?"
        message={`"${entry.title}" will be removed from your Library. This cannot be undone.`}
        confirmLabel="Delete"
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
};
