import { NextRequest, NextResponse } from 'next/server';

function buildResponse(message: string, artistData: any): string {
  const lower = message.toLowerCase();
  const name = artistData?.artist?.name || 'the artist';
  const lfm = artistData?.artist?.lastfm;
  const ratio = lfm?.ratio;
  const listeners = lfm?.listeners;
  const playcount = lfm?.playcount;
  const genres = lfm?.genres || [];
  const bio = lfm?.bio?.summary || '';
  const similar = lfm?.similar || [];
  const topTracks = artistData?.artist?.topTracks?.lastfm || [];
  const albums = artistData?.artist?.albums?.lastfm || [];
  const tourEvents = artistData?.artist?.tour || [];

  if (/who|about|background|story|where from/i.test(lower)) {
    const summary = bio.replace(/<a.*?<\/a>/g, '').replace(/\s+/g, ' ').trim();
    if (summary) return name + ': ' + summary;
    return "I don't have a full bio for " + name + " yet.";
  }

  if (/listeners?|plays?|popularity|fans?|how big/i.test(lower)) {
    if (!listeners) return "No listener data for " + name + ".";
    const fL = listeners >= 1000 ? (listeners / 1000).toFixed(1) + 'K' : listeners.toString();
    const fP = playcount >= 1000000 ? (playcount / 1000000).toFixed(1) + 'M' : playcount >= 1000 ? (playcount / 1000).toFixed(0) + 'K' : playcount.toString();
    let reply = name + ' has ' + fL + ' listeners and ' + fP + ' plays on Last.fm.';
    if (ratio) reply += ' Fan ratio: ' + ratio + 'x.';
    return reply;
  }

  if (/song|track|top track|best|hits?/i.test(lower)) {
    if (!topTracks.length) return "No top tracks for " + name + " yet.";
    const list = topTracks.slice(0, 5).map((t: any, i: number) => (i + 1) + '. ' + t.name + ' (' + (t.playcount ? t.playcount.toLocaleString() + ' plays' : '?') + ')').join('\n');
    return 'Top tracks for ' + name + ':\n' + list;
  }

  if (/album|discography|released/i.test(lower)) {
    if (!albums.length) return "No album data for " + name + " yet.";
    return 'Albums by ' + name + ':\n' + albums.slice(0, 6).map((a: any, i: number) => (i + 1) + '. ' + a.name).join('\n');
  }

  if (/genre|style|sounds like/i.test(lower)) {
    if (!genres.length) return "No genre data for " + name + " yet.";
    return name + "'s genres: " + genres.join(', ');
  }

  if (/similar|like|also like/i.test(lower)) {
    if (!similar.length) return "No similar artists data for " + name + ".";
    return "Fans of " + name + " also like: " + similar.map((s: any) => s.name).join(', ');
  }

  if (/tour|concert|show|event|live|upcoming/i.test(lower)) {
    if (!tourEvents.length) return "No upcoming tour dates for " + name + ".";
    const upcoming = tourEvents.filter((e: any) => new Date(e.date) >= new Date()).slice(0, 5);
    if (!upcoming.length) return "No upcoming shows for " + name + ".";
    return "Upcoming shows for " + name + ":\n" + upcoming.map((e: any) => e.dateDisplay + ' — ' + e.venue + ', ' + e.city).join('\n');
  }

  if (/ratio|playcount|fans|engagement/i.test(lower) && ratio) {
    const tier = ratio >= 150 ? 'ultra-high engagement' : ratio >= 80 ? 'high engagement' : 'growing engagement';
    return "Fan ratio for " + name + ": " + ratio + "x. " + tier + ".";
  }

  if (/help|what can you do/i.test(lower)) {
    return "Ask me anything about " + name + " — top tracks, albums, tour dates, fan stats, genre, or their story.";
  }

  return "I have data on " + name + " — try asking about top tracks, albums, tour dates, fan stats, or genre.";
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { artist, message } = body;
  if (!artist || !message) return NextResponse.json({ error: 'Missing artist or message' }, { status: 400 });
  try {
    const artistRes = await fetch(req.nextUrl.origin + '/api/artist/' + encodeURIComponent(artist), { next: { revalidate: 300 } });
    const artistData = artistRes.ok ? await artistRes.json() : {};
    const response = buildResponse(message, artistData);
    return NextResponse.json({ response });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
