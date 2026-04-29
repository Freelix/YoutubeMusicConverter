const stringSimilarity = require('string-similarity');

const THRESHOLD = 0.65;
const MIN_TITLE_SIM = 0.40; // guard against completely wrong songs

function scoreDuration(youtubeSecs, candidateSecs) {
  if (!youtubeSecs || !candidateSecs) return 0.5; // neutral when unknown
  const delta = Math.abs(youtubeSecs - candidateSecs);
  return 1 - Math.min(delta / 30, 1);
}

/**
 * Score each candidate against the extracted artist/track/duration.
 * Returns candidates sorted by score descending.
 */
function scoreCandidates(candidates, extractedArtist, extractedTrack, youtubeDuration) {
  return candidates
    .map((c) => {
      const titleSim = stringSimilarity.compareTwoStrings(
        (c.title || '').toLowerCase(),
        extractedTrack.toLowerCase()
      );
      const artistSim = extractedArtist
        ? stringSimilarity.compareTwoStrings(
            (c.artist || '').toLowerCase(),
            extractedArtist.toLowerCase()
          )
        : 0.5; // neutral when no artist to compare
      const durScore = scoreDuration(youtubeDuration, c.duration);
      const score = titleSim * 0.50 + artistSim * 0.35 + durScore * 0.15;
      return { ...c, score, titleSim };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Return the best candidate if it meets the confidence threshold,
 * with a minimum title similarity floor to prevent wrong-song matches.
 */
function pickBest(candidates) {
  const best = candidates[0];
  if (!best) return null;
  if (best.score < THRESHOLD) return null;
  if (best.titleSim < MIN_TITLE_SIM) return null;
  return best;
}

module.exports = { scoreCandidates, pickBest };
