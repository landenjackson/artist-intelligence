'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PageProps { params: Promise<{ artist: string }> }

function formatListeners(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n.toString();
}

function formatPlaycount(n: number): string {
  if (n >= 1000000000) return (n / 1000000000).toFixed(1) + 'B';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n.toString();
}

function tierLabel(ratio: number) {
  if (ratio >= 150) return '🔴 Elite';
  if (ratio >= 100) return '🟡 High';
  if (ratio >= 60) return '🟡 Solid';
  if (ratio >= 30) return '🟢 Growing';
  return '⚪ Sparse';
}

function tierNote(ratio: number) {
  if (ratio >= 150) return 'Elite superfan base — highest repeat behavior.';
  if (ratio >= 100) return 'Strong repeat — fans are locked in.';
  if (ratio >= 60) return 'Solid core, growing but not sticky.';
  if (ratio >= 30) return 'Broad reach, low repeat — breakout changes this.';
  return 'Early stage.';
}

export default function ArtistPage({ params }: PageProps) {
  const [name, setName] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    params.then(({ artist: encoded }) => {
      const decoded = decodeURIComponent(encoded);
      setName(decoded);
      fetch(`/api/artist/${encodeURIComponent(decoded)}`)
        .then(r => r.json())
        .then(d => {
          setData(d.artist);
          setLoading(false);
        })
        .catch(e => {
          setError('Failed to load artist data');
          setLoading(false);
        });
    });
  }, [params]);

  if (!name) return <div style={{ color: '#F1FAEE', padding: '2rem' }}>Loading...</div>;
  if (loading) return <div style={{ color: '#F1FAEE', padding: '2rem' }}>Loading {name}...</div>;
  if (error) return <div style={{ color: '#E63946', padding: '2rem' }}>{error}</div>;

  const a = data;

  return (
    <main style={{ minHeight: '100vh', background: '#0D0D0D', color: '#F1FAEE', padding: '2rem' }}>
      <Link href="/" style={{ color: '#8D99AE', textDecoration: 'none', display: 'inline-block', marginBottom: '1.5rem' }}>← Back</Link>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>{a?.name || name}</h1>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatListeners(a?.listeners || 0)}</div>
            <div style={{ fontSize: '0.8rem', color: '#8D99AE' }}>Listeners</div>
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatPlaycount(a?.playcount || 0)}</div>
            <div style={{ fontSize: '0.8rem', color: '#8D99AE' }}>Scrobbles</div>
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F4A61A' }}>{a?.ratio || 0}x</div>
            <div style={{ fontSize: '0.8rem', color: '#8D99AE' }}>Fan Ratio</div>
          </div>
        </div>
        {a?.ratio ? (
          <div style={{ marginTop: '0.75rem' }}>
            <span style={{ fontWeight: 600, color: '#F4A61A' }}>{tierLabel(a.ratio)}</span>
            <span style={{ color: '#8D99AE', marginLeft: '0.5rem', fontSize: '0.85rem' }}>{tierNote(a.ratio)}</span>
          </div>
        ) : null}
      </div>
      <hr style={{ borderColor: '#1a1a2e', margin: '1.5rem 0' }} />
      {(a?.tags || []).length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ color: '#8D99AE', fontSize: '0.8rem', marginBottom: '0.5rem' }}>GENRES</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(a.tags as string[]).map((g: string) => (
              <span key={g} style={{ background: '#1a1a2e', color: '#F4A61A', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.85rem' }}>{g}</span>
            ))}
          </div>
        </div>
      )}
      {a?.bio && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ color: '#8D99AE', fontSize: '0.8rem', marginBottom: '0.5rem' }}>ABOUT</p>
          <p style={{ color: '#8D99AE', fontSize: '0.9rem', lineHeight: 1.7, maxWidth: '680px' }}>{a.bio}</p>
        </div>
      )}
      {(a?.topTracks as any[])?.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <hr style={{ borderColor: '#1a1a2e', margin: '1rem 0' }} />
          <p style={{ color: '#8D99AE', fontSize: '0.8rem', marginBottom: '0.75rem' }}>TOP TRACKS</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
            {a.topTracks.map((t: any, i: number) => (
              <div key={i} style={{ background: '#111318', border: '1px solid #1a1a2e', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{t.name}</div>
                <div style={{ color: '#8D99AE', fontSize: '0.8rem' }}>{formatPlaycount(t.plays)} plays</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {(a?.albums as any[])?.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ color: '#8D99AE', fontSize: '0.8rem', marginBottom: '0.75rem' }}>TOP ALBUMS</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
            {a.albums.map((al: any, i: number) => (
              <div key={i} style={{ background: '#111318', border: '1px solid #1a1a2e', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{al.name}</div>
                <div style={{ color: '#8D99AE', fontSize: '0.8rem' }}>{formatPlaycount(al.playcount)} plays</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}