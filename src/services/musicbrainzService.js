const axios = require('axios');
const { scoreCandidates, pickBest } = require('./metadataScorer');

const MB_API_URL = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'YoutubeMusicConverter/1.0.0 ( your-email@example.com )';

/**
 * Extract artist and track from a YouTube video title.
 * Splits on separator characters BEFORE stripping noise,
 * which fixes titles like "Artist - Song (Official Video)".
 */
function extractArtistAndTrack(rawTitle) {
  const stripNoise = (s) =>
    s.replace(/\s*[\(\[\{][^\)\]\}]*[\)\]\}]/g, '').replace(/\s+/g, ' ').trim();

  // Try separator-based split first (most common YouTube pattern)
  const separators = [' - ', ' – ', ' — ', ' | '];
  for (const sep of separators) {
    const idx = rawTitle.indexOf(sep);
    if (idx > 0) {
      const artist = stripNoise(rawTitle.slice(0, idx));
      const track  = stripNoise(rawTitle.slice(idx + sep.length));
      if (artist && track) return { artist, track };
    }
  }

  // Clean the title (brackets only) before trying remaining patterns
  const cleanTitle = rawTitle
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .replace(/\s*\{[^}]*\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Pattern: Track by Artist
  const byMatch = cleanTitle.match(/^(.+?)\s+by\s+(.+)$/i);
  if (byMatch) return { artist: byMatch[2].trim(), track: byMatch[1].trim() };

  // Pattern: Artist "Track"
  const quoteMatch = cleanTitle.match(/^([^"]+?)\s*["'](.+?)["']/);
  if (quoteMatch) return { artist: quoteMatch[1].trim(), track: quoteMatch[2].trim() };

  // Pattern: Artist: Track
  const colonMatch = cleanTitle.match(/^([^:]+?):\s*(.+)/);
  if (colonMatch) return { artist: colonMatch[1].trim(), track: colonMatch[2].trim() };

  return { artist: null, track: null };
}

/**
 * Search MusicBrainz for up to 5 recording candidates and score them.
 * Falls back to raw title/author when extraction fails.
 *
 * @param {string} author  - YouTube uploader name
 * @param {string} title   - YouTube video title
 * @param {number} duration - Duration in seconds (from yt-dlp)
 * @returns {Promise<Object|null>}
 */
async function searchRecording(author, title, duration) {
  try {
    const { artist: extractedArtist, track: extractedTrack } = extractArtistAndTrack(title);

    // Use extracted values when available, fall back to raw YouTube metadata
    const searchArtist = extractedArtist || author || '';
    const searchTrack  = extractedTrack  || title  || '';

    if (!searchTrack) return null;

    console.log(`[MusicBrainz] Searching for: "${searchArtist}" - "${searchTrack}"`);

    const escQ = (s) => s.replace(/"/g, '').trim();
    const query = searchArtist
      ? `recording:"${escQ(searchTrack)}" AND artist:"${escQ(searchArtist)}"`
      : `recording:"${escQ(searchTrack)}"`;

    const response = await axios.get(`${MB_API_URL}/recording/`, {
      params: { query, fmt: 'json', limit: 5 },
      headers: { 'User-Agent': USER_AGENT },
      timeout: 8000,
    });

    const recordings = response.data.recordings || [];
    if (recordings.length === 0) {
      console.log('[MusicBrainz] No results found');
      return null;
    }

    // Normalize to scorer format (MusicBrainz stores duration in ms)
    const candidates = recordings.map((r) => {
      const release = r.releases?.[0] || {};
      return {
        title:       r.title,
        artist:      r['artist-credit']?.[0]?.name || '',
        album:       release.title || '',
        year:        release.date ? new Date(release.date).getFullYear().toString() : '',
        duration:    r.length ? Math.round(r.length / 1000) : null,
        recordingId: r.id,
        releaseId:   release.id || '',
      };
    });

    const scored = scoreCandidates(candidates, searchArtist, searchTrack, duration);
    const best   = pickBest(scored);

    if (!best) {
      console.log('[MusicBrainz] No candidate met the confidence threshold');
      return null;
    }

    console.log(`[MusicBrainz] Match (${(best.score * 100).toFixed(1)}%): "${best.artist}" - "${best.title}"`);
    return best;

  } catch (error) {
    console.error('[MusicBrainz] Error:', error.message);
    return null;
  }
}

module.exports = { extractArtistAndTrack, searchRecording };
