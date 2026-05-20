import { NextRequest, NextResponse } from 'next/server';
import { getArtistInfo, getArtistTopTracks, getArtistAlbums, calcRatio } from '@/lib/fetchers/lastfm';
import { getMusicBrainzArtist } from '@/lib/fetchers/musicbrainz';

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('artist')?.trim();
  if (!name) return NextResponse.json({ error: 'Missing artist param' }, { status: 400 });

  try {
    const [lfm, lfmTracks, lfmAlbums, mb] = await Promise.allSettled([
      getArtistInfo(name),
      getArtistTopTracks(name, 10),
      getArtistAlbums(name, 6),
      getMusicBrainzArtist(name),
    ]);

    const info = lfm.status === 'fulfilled' ? lfm.value : null;
    const ratio = info ? calcRatio(info.playcount, info.listeners) : null;

    return NextResponse.json({
      artist: {
        name: info?.name || name,
        listeners: info?.listeners || 0,
        playcount: info?.playcount || 0,
        ratio,
        tags: info?.tags || [],
        similar: info?.similar || [],
        bio: info?.bio || '',
        topTracks: lfmTracks.status === 'fulfilled' ? lfmTracks.value : [],
        albums: lfmAlbums.status === 'fulfilled' ? lfmAlbums.value : [],
        musicbrainz: mb.status === 'fulfilled' ? mb.value : null,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}