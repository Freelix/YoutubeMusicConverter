const axios = require('axios');

const DEEZER_API = 'https://api.deezer.com/search';

/**
 * Search the Deezer public API (no auth required) for a track.
 * Returns up to 5 normalized candidates.
 */
async function searchDeezer(artist, track) {
  const escapeQuotes = (s) => (s || '').replace(/"/g, '').trim();
  const q = artist
    ? `artist:"${escapeQuotes(artist)}" track:"${escapeQuotes(track)}"`
    : `"${escapeQuotes(track)}"`;

  const { data } = await axios.get(DEEZER_API, {
    params: { q, limit: 5 },
    timeout: 8000,
  });

  if (!data?.data?.length) return [];

  return data.data.map((r) => ({
    title:    r.title,
    artist:   r.artist?.name || '',
    album:    r.album?.title || '',
    coverUrl: r.album?.cover_medium || '',
    duration: r.duration, // seconds
  }));
}

module.exports = { searchDeezer };
