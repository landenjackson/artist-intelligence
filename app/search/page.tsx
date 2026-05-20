import { Suspense } from 'react';
import Link from 'next/link';
import { searchArtist } from '@/lib/fetchers/lastfm';
import styles from './search.module.css';

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

function formatListeners(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n.toString();
}

async function ArtistResults({ query }: { query: string }) {
  const artists = await searchArtist(query);
  if (!artists.length) return <p className={styles.empty}>No artists found for &ldquo;{query}&rdquo;</p>;
  return (
    <div className="artist-grid">
      {artists.map(a => (
        <Link key={a.mbid || a.url} href={'/artist/' + encodeURIComponent(a.name)} className="artist-card">
          <div className="artist-card-name">{a.name}</div>
          <div className="artist-card-stats">
            <span>{formatListeners(a.stats.listeners)}</span> listeners &bull; <span>{formatListeners(a.stats.playcount)}</span> plays
          </div>
        </Link>
      ))}
    </div>
  );
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() || '';
  return (
    <main className={styles.page}>
      <div className={styles.backRow}>
        <Link href="/" className="back-link">Back</Link>
        {query && <span className="section-label">Results for &ldquo;{query}&rdquo;</span>}
      </div>
      {query ? (
        <Suspense fallback={<div className="loading">Searching Last.fm...</div>}>
          <ArtistResults query={query} />
        </Suspense>
      ) : (
        <p className={styles.empty}>Use the search bar on the home page.</p>
      )}
    </main>
  );
}
