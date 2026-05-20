import { NextRequest, NextResponse } from 'next/server';

const LASTFM_KEY = process.env.LASTFM_API_KEY || '2684ede9b552689e73757de16403d766';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ error: 'Missing q param' }, { status: 400 });

  try {
    const lfmUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.search&api_key=${LASTFM_KEY}&format=json&limit=5&artist=${encodeURIComponent(q)}`;
    const lfmRes = await fetch(lfmUrl, { headers: { 'User-Agent': 'ArtistIntelligenceApp/1.0' } });
    const lfmData = await lfmRes.json();

    const appleUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=musicArtist&limit=3`;
    const appleRes = await fetch(appleUrl, { headers: { 'User-Agent': 'ArtistIntelligenceApp/1.0' } });
    const appleData = await appleRes.json();

    const artists = (lfmData.results?.artistmatches?.artist || []).map((a: any) => ({
      name: a.name,
      listeners: parseInt(a.listeners || '0'),
      url: a.url,
    }));

    return NextResponse.json({
      lastfm: artists,
      apple: appleData.results || [],
    });
  } catch (e) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}