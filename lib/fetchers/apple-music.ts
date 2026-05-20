import { NextRequest, NextResponse } from 'next/server';

const LASTFM_URL = 'https://ws.audioscrobbler.com/2.0/';
const LASTFM_KEY = '2684ede9b552689e73757de16403d766';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ error: 'Missing q param' }, { status: 400 });

  try {
    // Try Last.fm first
    const lfmUrl = LASTFM_URL + '?method=artist.search&api_key=' + LASTFM_KEY + '&format=json&limit=5&artist=' + encodeURIComponent(q);
    const lfmRes = await fetch(lfmUrl);
    const lfmData = await lfmRes.json();
    
    // Try Apple Music
    const appleUrl = 'https://itunes.apple.com/search?term=' + encodeURIComponent(q) + '&entity=musicArtist&limit=3';
    const appleRes = await fetch(appleUrl);
    const appleData = await appleRes.json();

    const results = {
      lastfm: lfmData.results?.artistmatches?.artist || [],
      apple: appleData.results || [],
    };

    if (!results.lastfm.length && !results.apple.length) {
      return NextResponse.json({ error: 'Artist not found on any platform' }, { status: 404 });
    }

    return NextResponse.json(results);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
