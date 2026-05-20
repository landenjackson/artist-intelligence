'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ChatWidget from '@/components/ChatWidget';

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

async function ArtistProfile({ name }: { name: string }) {
  const res = await fetch(`/api/artist/${encodeURIComponent(name)}`);
  const data = await res.json();
  const a = data.artist;

  return (
    <main className="profile">
      <Link href="/" className="back-link">← Back</Link>
      <div className="profile-header">
        <div>
          <h1 className="profile-name">{a?.name || name}</h1>
          <div className="profile-stats">
            <div className="profile-stat">
              <span className="profile-stat-val">{formatListeners(a?.listeners || 0)}</span>
              <span className="profile-stat-label">Listeners</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-val">{formatPlaycount(a?.playcount || 0)}</span>
              <span className="profile-stat-label">Scrobbles</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-val ratio">{a?.ratio || 0}x</span>
              <span className="profile-stat-label">Fan Ratio</span>
            </div>
          </div>
          {a?.ratio ? (
            <div style={{ marginTop: '0.75rem' }}>
              <span style={{ color: '#F4A61A', fontWeight: 600 }}>{tierLabel(a.ratio)}</span>
              <span style={{ color: '#8D99AE', marginLeft: '0.5rem', fontSize: '0.85rem' }}>{tierNote(a.ratio)}</span>
            </div>
          ) : null}
        </div>
      </div>
      <hr className="profile-divider" />
      {(a?.tags || []).length > 0 && (
        <>
          <p className="profile-section-title">Genres</p>
          <div className="genre-tags">
            {(a.tags as string[]).map((g: string) => <span key={g} className="genre-tag">{g}</span>)}
          </div>
        </>
      )}
      {a?.bio && (
        <>
          <p className="profile-section-title">About</p>
          <p style={{ color: 'var(--steel)', fontSize: '0.9rem', lineHeight: '1.7', marginBottom: '1.5rem', maxWidth: '680px' }}>{a.bio}</p>
        </>
      )}
      {(a?.topTracks as any[])?.length > 0 && (
        <>
          <hr className="profile-divider" />
          <p className="profile-section-title">Top Tracks</p>
          <div className="data-grid">
            {a.topTracks.map((t: any, i: number) => (
              <div key={i} className="data-item">
                <div className="data-item-title">{t.name}</div>
                <div className="data-item-sub">{formatPlaycount(t.plays)} plays</div>
              </div>
            ))}
          </div>
        </>
      )}
      {(a?.albums as any[])?.length > 0 && (
        <>
          <p className="profile-section-title">Top Albums</p>
          <div className="data-grid">
            {a.albums.map((al: any, i: number) => (
              <div key={i} className="data-item">
                <div className="data-item-title">{al.name}</div>
                <div className="data-item-sub">{formatPlaycount(al.playcount)} plays</div>
              </div>
            ))}
          </div>
        </>
      )}
      <hr className="profile-divider" />
      <ChatWidget artist={a?.name || name} />
    </main>
  );
}

export default async function ArtistPage({ params }: PageProps) {
  const { artist: encoded } = await params;
  const name = decodeURIComponent(encoded);
  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', color: '#F1FAEE', padding: '2rem' }}>
      <ArtistProfile name={name} />
    </div>
  );
}