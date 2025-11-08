const axios = require('axios');
const stringSimilarity = require('string-similarity');

// MusicBrainz API configuration
const MB_API_URL = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'YoutubeMusicConverter/1.0.0 ( your-email@example.com )';

// Minimum similarity score (0-1) to consider a match
const MIN_SIMILARITY_SCORE = 0.85;

/**
 * Calculate similarity between two strings (0-1)
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  return stringSimilarity.compareTwoStrings(
    str1.toLowerCase(),
    str2.toLowerCase()
  );
}

/**
 * Clean up YouTube video title to extract artist and track name
 * @param {string} title - YouTube video title
 * @returns {Object} - Object with artist and track name
 */
function extractArtistAndTrack(title) {
  // Common patterns in YouTube video titles
  const patterns = [
    // Pattern: Artist - Track (Official Video)
    /^([^-]+?)\s*-\s*([^(\[]+)/,
    // Pattern: Artist "Track"
    /^([^"]+?)\s*["'](.+?)["']/,
    // Pattern: Track by Artist
    /^(.+?)\s+by\s+(.+)/i,
    // Pattern: Artist: Track
    /^([^:]+?):\s*(.+)/
  ];

  // Remove common suffixes
  const cleanTitle = title
    .replace(/\s*\([^)]*\)/g, '')  // Remove anything in parentheses
    .replace(/\s*\[[^\]]*\]/g, '')   // Remove anything in square brackets
    .replace(/\s*\{[^}]*\}/g, '')    // Remove anything in curly braces
    .replace(/\s*[|\-~]\s*.+$/, '')  // Remove anything after |, ~, or -
    .replace(/\s+/g, ' ')             // Replace multiple spaces with single space
    .trim();

  // Try to match patterns
  for (const pattern of patterns) {
    const match = cleanTitle.match(pattern);
    if (match && match[1] && match[2]) {
      const artist = match[1].trim();
      const track = match[2].trim();
      if (artist && track) {
        return { artist, track };
      }
    }
  }

  // If no pattern matched, try to split by common separators
  const separators = [' - ', ' | ', ' ~ ', ' — '];
  for (const sep of separators) {
    const parts = cleanTitle.split(sep);
    if (parts.length >= 2) {
      const artist = parts[0].trim();
      const track = parts.slice(1).join(sep).trim();
      if (artist && track) {
        return { artist, track };
      }
    }
  }

  // If all else fails, return null to indicate we couldn't parse it
  return { artist: null, track: null };
}

/**
 * Search for a recording in MusicBrainz
 * @param {string} artist - Original artist from YouTube
 * @param {string} title - Original title from YouTube
 * @returns {Promise<Object|null>} - Recording data or null if not confident in the match
 */
async function searchRecording(artist, title) {
  try {
    // First, try to extract artist and track from the title
    const { artist: extractedArtist, track } = extractArtistAndTrack(title);
    
    // If we couldn't extract both artist and track, don't try to match
    if (!extractedArtist || !track) {
      console.log('Could not reliably extract artist and track from title');
      return null;
    }

    console.log(`Searching MusicBrainz for: "${extractedArtist}" - "${track}"`);
    
    // Only try exact matches
    const query = `recording:${encodeURIComponent(`"${track}"`)} AND artist:${encodeURIComponent(`"${extractedArtist}"`)}`;
    
    let recording;
    try {
      const response = await axios.get(`${MB_API_URL}/recording/`, {
        params: {
          query: query,
          fmt: 'json',
          limit: 1
        },
        headers: {
          'User-Agent': USER_AGENT
        }
      });

      if (!response.data.recordings || response.data.recordings.length === 0) {
        console.log('No exact match found in MusicBrainz');
        return null;
      }
      
      recording = response.data.recordings[0];
    } catch (error) {
      console.error('Error querying MusicBrainz:', error.message);
      return null;
    }

    // Verify the match is good enough
    const titleSimilarity = calculateSimilarity(recording.title, track);
    const artistSimilarity = calculateSimilarity(
      recording['artist-credit']?.[0]?.name || '',
      extractedArtist
    );

    console.log(`Match confidence - Title: ${(titleSimilarity * 100).toFixed(1)}%, Artist: ${(artistSimilarity * 100).toFixed(1)}%`);
    
    // Only proceed if both title and artist are very good matches
    if (titleSimilarity < MIN_SIMILARITY_SCORE || artistSimilarity < MIN_SIMILARITY_SCORE) {
      console.log('Match confidence too low, skipping');
      return null;
    }
    
    // Get release information for the recording
    let release = null;
    if (recording.releases && recording.releases.length > 0) {
      try {
        const releaseResponse = await axios.get(`${MB_API_URL}/release/${recording.releases[0].id}`, {
          params: {
            fmt: 'json',
            inc: 'artists+recordings+release-groups+tags'
          },
          headers: {
            'User-Agent': USER_AGENT
          }
        });
        release = releaseResponse.data;
      } catch (error) {
        console.error('Error fetching release info:', error.message);
      }
    }
    
    // Return only the most basic and reliable metadata
    const result = {
      title: recording.title,
      artist: recording['artist-credit']?.[0]?.name || extractedArtist,
      album: release?.title || '',
      year: release?.date ? new Date(release.date).getFullYear().toString() : '',
      recordingId: recording.id,
      releaseId: release?.id || ''
    };
    
    console.log('Using metadata:', result);
    return result;
    
  } catch (error) {
    console.error('Error in searchRecording:', error.message);
    return null;
  }
}

module.exports = {
  searchRecording
};
