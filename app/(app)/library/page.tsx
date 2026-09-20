import { Icon } from '@/components/SidebarIcons';
import {
  LibraryAddButton,
  LibraryList,
  fetchLibraryEntries,
} from '@/features/library';

export default async function LibraryPage() {
  const entries = await fetchLibraryEntries();
  const lede = entries.length
    ? `${entries.length} saved write-up${entries.length === 1 ? '' : 's'}`
    : "Algorithms, patterns and notes you've saved to come back to";

  return (
    <div className="content-wrapper">
      <div className="ic-page-head" style={{ marginBottom: 'var(--s-5)' }}>
        <div>
          <h1 className="pg-h1">
            <Icon.Book /> Library
          </h1>
          <p className="ic-page-sub">{lede}</p>
        </div>
        <LibraryAddButton />
      </div>

      <LibraryList entries={entries} />
    </div>
  );
}
