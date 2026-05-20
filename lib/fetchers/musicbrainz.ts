const MB_BASE = 'https://musicbrainz.org/ws/2';
const MB_HEADERS = { 'User-Agent': 'ArtistIntelligence/0.1 (landooutthere@gmail.com)' };

async function mbGet(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(MB_BASE + endpoint);
  url.searchParams.set('fmt', 'json');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  await new Promise(r => setTimeout(r, 1100));
  const res = await fetch(url.toString(), { headers: MB_HEADERS, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error('MusicBrainz error: ' + res.status);
  return res.json();
}

export async function getMusicBrainzArtist(artistName: string): Promise<any | null> {
  const data = await mbGet('/artist', { query: artistName, limit: '1' });
  return (data.artists || [])[0] || null;
}

export async function getMusicBrainzRecordings(artistName: string, limit = 10): Promise<any[]> {
  const data = await mbGet('/recording', { query: 'artistname:' + artistName, limit: String(limit) });
  return data.recordings || [];
}
