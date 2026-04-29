const { extractArtistAndTrack, searchRecording } = require('./musicbrainzService');
const { searchDeezer }              = require('./deezerService');
const { scoreCandidates, pickBest } = require('./metadataScorer');

/**
 * Enrich MP3 metadata using external APIs.
 *
 * Tries Deezer first (free, no auth, fast), falls back to MusicBrainz,
 * and returns null if neither produces a confident match.
 *
 * @param {Object} params
 * @param {string} params.title    - YouTube video title
 * @param {string} params.author   - YouTube uploader / channel name
 * @param {number} params.duration - Duration in seconds (from yt-dlp), optional
 * @returns {Promise<Object|null>}  Enriched metadata or null
 */
async function enrichMetadata({ title, author, duration }) {
  const { artist, track } = extractArtistAndTrack(title);

  // When parsing fails, fall back to raw title as the search term
  const searchTrack  = track  || title;
  const searchArtist = artist || null;

  // --- Primary: Deezer ---
  try {
    const candidates = await searchDeezer(searchArtist, searchTrack);
    if (candidates.length > 0) {
      const scored = scoreCandidates(candidates, searchArtist, searchTrack, duration);
      const best   = pickBest(scored);
      if (best) {
        console.log(`[Metadata] Deezer match (${(best.score * 100).toFixed(1)}%): "${best.artist}" - "${best.title}"`);
        return { source: 'deezer', ...best };
      }
    }
  } catch (err) {
    console.warn('[Metadata] Deezer failed:', err.message);
  }

  // --- Secondary: MusicBrainz ---
  try {
    const mb = await searchRecording(author, title, duration);
    if (mb) {
      console.log(`[Metadata] MusicBrainz match: "${mb.artist}" - "${mb.title}"`);
      return { source: 'musicbrainz', ...mb };
    }
  } catch (err) {
    console.warn('[Metadata] MusicBrainz failed:', err.message);
  }

  return null;
}

module.exports = { enrichMetadata };
