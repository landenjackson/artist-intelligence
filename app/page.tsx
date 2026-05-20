'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsLoading(true);
    router.push('/artist/' + encodeURIComponent(query.trim()));
  }, [query, router]);

  return (
    <main style={{ minHeight: '100vh', background: '#0D0D0D', color: '#F1FAEE', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ padding: '2rem', borderBottom: '1px solid #1a1a2e' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🎤</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#E63946' }}>Artist Intelligence</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', lineHeight: 1.2 }}>
            Know your fanbase.<br />
            <span style={{ color: '#F4A61A' }}>Know your worth.</span>
          </h1>
          <p style={{ color: '#8D99AE', fontSize: '1rem', marginBottom: '2rem' }}>
            Enter any artist to decode their streaming data — listener counts, fan ratios, top tracks, and more.
          </p>

          {/* Search form */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', maxWidth: '500px' }}>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Try Osamason, Slayr, Nine Vicious..."
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                background: '#111318',
                border: '1px solid #2a2a3e',
                borderRadius: '8px',
                color: '#F1FAEE',
                fontSize: '1rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#E63946',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
              }}
            >
              {isLoading ? '...' : 'Lookup'}
            </button>
          </form>

          <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#8D99AE' }}>
            Powered by Last.fm · Apple Music · MusicBrainz
          </div>
        </div>
      </header>

      {/* Features */}
      <section style={{ padding: '3rem 2rem', flex: 1 }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          {[
            { icon: '📡', title: 'Fan Ratio', desc: 'Scrobbles ÷ listeners. The signal no one else shows.' },
            { icon: '🔥', title: 'Top Tracks', desc: 'What your fans play on repeat.' },
            { icon: '🎸', title: 'Tour Intel', desc: 'Upcoming shows and countdown.' },
            { icon: '🏛', title: 'Artist Profile', desc: 'Genre, origin, aliases.' },
          ].map(f => (
            <div key={f.title} style={{ background: '#111318', border: '1px solid #1a1a2e', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{f.icon}</div>
              <div style={{ fontWeight: 600, color: '#F1FAEE', marginBottom: '0.25rem' }}>{f.title}</div>
              <div style={{ fontSize: '0.85rem', color: '#8D99AE' }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ maxWidth: '800px', margin: '2rem auto 0', textAlign: 'center', color: '#8D99AE', fontSize: '0.85rem' }}>
          Free lookup tool · Full monthly intelligence briefs available
        </div>
      </section>
    </main>
  );
}