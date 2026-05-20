const LASTFM_API_KEY = process.env.LASTFM_API_KEY || '2684ede9b552689e73757de16403d766';
const BASE_URL = 'https://ws.audioscrobbler.com/2.0';

export interface LastFMArtist {
  name: string;
  listeners: number;
  playcount: number;
  tags: string[];
  similar: string[];
  bio: string;
  imageUrl: string;
}

function getLastFmImage(images: any[]): string {
  if (!images || !Array.isArray(images)) return '';
  const sizes = ['extralarge', 'large', 'medium', 'small'];
  for (const size of sizes) {
    const img = images.find((i: any) => i.size === size);
    if (img && img['#text']) return img['#text'];
  }
  return '';
}

export async function getArtistInfo(name: string): Promise<LastFMArtist> {
  try {
    const url = `${BASE_URL}/?method=artist.getinfo&artist=${encodeURIComponent(name)}&api_key=${LASTFM_API_KEY}&format=json`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ArtistIntelligenceApp/1.0' }, next: { revalidate: 3600 } });
    const data = await res.json();
    const a = data.artist || {};
    const stats = a.stats || {};
    return {
      name: a.name || name,
      listeners: parseInt(stats.listeners || '0'),
      playcount: parseInt(stats.playcount || '0'),
      tags: (a.tags?.tag || []).slice(0, 6).map((t: any) => t.name),
      similar: (a.similar?.artist || []).slice(0, 4).map((s: any) => s.name),
      bio: (a.bio?.summary || '').replace(/<[^>]*>/g, '').trim(),
      imageUrl: getLastFmImage(a.image),
    };
  } catch {
    return { name, listeners: 0, playcount: 0, tags: [], similar: [], bio: '', imageUrl: '' };
  }
}

export async function getArtistTopTracks(name: string, limit = 5) {
  try {
    const url = `${BASE_URL}/?method=artist.gettoptracks&artist=${encodeURIComponent(name)}&api_key=${LASTFM_API_KEY}&format=json&limit=${limit}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ArtistIntelligenceApp/1.0' }, next: { revalidate: 3600 } });
    const data = await res.json();
    return (data.toptracks?.track || []).map((t: any) => ({
      name: t.name,
      plays: parseInt(t.playcount || '0'),
      listeners: parseInt(t.listeners || '0'),
    }));
  } catch {
    return [];
  }
}

export async function getArtistAlbums(name: string, limit = 5) {
  try {
    const url = `${BASE_URL}/?method=artist.gettopalbums&artist=${encodeURIComponent(name)}&api_key=${LASTFM_API_KEY}&format=json&limit=${limit}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ArtistIntelligenceApp/1.0' }, next: { revalidate: 3600 } });
    const data = await res.json();
    return (data.topalbums?.album || []).map((a: any) => {
      const img = getLastFmImage(a.image);
      return { name: a.name, playcount: parseInt(a.playcount || '0'), image: img };
    });
  } catch {
    return [];
  }
}

export function calcRatio(playcount: number, listeners: number): number {
  return listeners > 0 ? Math.round(playcount / listeners * 10) / 10 : 0;
}

export async function searchArtist(name: string): Promise<any[]> {
  try {
    const url = `${BASE_URL}/?method=artist.search&artist=${encodeURIComponent(name)}&api_key=${LASTFM_API_KEY}&format=json&limit=8`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ArtistIntelligenceApp/1.0' }, next: { revalidate: 300 } });
    const data = await res.json();
    return (data.results?.artistmatches?.artist || []).map((a: any) => ({
      name: a.name,
      url: a.url,
      mbid: a.mbid,
      listeners: parseInt(a.listeners || '0'),
    }));
  } catch {
    return [];
  }
}
