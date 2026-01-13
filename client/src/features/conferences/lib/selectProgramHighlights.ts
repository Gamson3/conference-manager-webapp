import type { ProgramDay } from '../components/tabs';
import type { ProgramHighlight } from '../components/program/ProgramHighlightCard';

/**
 * Selects curated program highlights for preview display.
 * 
 * Priority heuristics:
 * 1. Keynotes / plenaries
 * 2. Sessions with most presentations
 * 3. Earliest presentations (anchors timeline)
 * 
 * @param days - Program days data
 * @param maxHighlights - Maximum number of highlights to return (default: 6)
 * @returns Array of program highlights
 */
export function selectProgramHighlights(
  days: ProgramDay[],
  maxHighlights: number = 6
): ProgramHighlight[] {
  const highlights: ProgramHighlight[] = [];

  // Extract all presentations with metadata
  interface EnrichedPresentation {
    id: string;
    title: string;
    abstract?: string;
    keywords?: string[];
    authors: Array<{ id?: string; name: string; affiliation?: string; email?: string }>;
    isFavorite: boolean;
    sessionType: 'presentation' | 'keynote' | 'panel' | 'workshop' | 'poster' | 'other';
    startTime: string;
    endTime: string;
    room?: string;
    isKeynote: boolean;
  }

  const allPresentations: EnrichedPresentation[] = [];

  days.forEach((day) => {
    (day.sessions || []).forEach((session) => {
      const isKeynote = session.type === 'keynote';
      
      // Map sessionType, convert break/networking to 'other'
      const mappedType: 'presentation' | 'keynote' | 'panel' | 'workshop' | 'poster' | 'other' = 
        (session.type === 'break' || session.type === 'networking') 
          ? 'other' 
          : session.type;
      
      (session.presentations || []).forEach((presentation) => {
        // Type assertion to access isFavorite which may or may not exist
        const presWithFav = presentation as typeof presentation & { isFavorite?: boolean };
        
        allPresentations.push({
          ...presentation,
          isFavorite: presWithFav.isFavorite || false,
          sessionType: mappedType,
          startTime: session.startTime,
          endTime: session.endTime,
          room: session.room,
          isKeynote,
        });
      });
    });
  });

  // Priority 1: All keynotes (these are premium content)
  const keynotes = allPresentations.filter((p) => p.isKeynote);
  highlights.push(...keynotes.slice(0, maxHighlights));

  // If we have space, add more content
  if (highlights.length < maxHighlights) {
    // Priority 2: Panel discussions (interactive, engaging)
    const panels = allPresentations.filter(
      (p) => p.sessionType === 'panel' && !p.isKeynote
    );
    const remainingSlots = maxHighlights - highlights.length;
    highlights.push(...panels.slice(0, Math.min(2, remainingSlots)));
  }

  // Priority 3: Fill remaining with earliest presentations (chronological anchor)
  if (highlights.length < maxHighlights) {
    const usedIds = new Set(highlights.map((h) => h.id));
    const remaining = allPresentations
      .filter((p) => !usedIds.has(p.id))
      .sort((a, b) => {
        // Sort by start time (earliest first)
        return a.startTime.localeCompare(b.startTime);
      });

    const remainingSlots = maxHighlights - highlights.length;
    highlights.push(...remaining.slice(0, remainingSlots));
  }

  // Transform to ProgramHighlight format
  return highlights.map((p) => ({
    id: p.id,
    title: p.title,
    authors: p.authors || [],
    startTime: p.startTime,
    endTime: p.endTime,
    room: p.room,
    sessionType: p.sessionType,
    isFavorite: p.isFavorite,
    isKeynote: p.isKeynote,
  }));
}

/**
 * Extract unique topics from program presentations.
 * 
 * @param days - Program days data
 * @param maxTopics - Maximum topics to return (default: 10)
 * @returns Array of topic strings
 */
export function extractProgramTopics(
  days: ProgramDay[],
  maxTopics: number = 10
): string[] {
  const topicCounts = new Map<string, number>();

  days.forEach((day) => {
    (day.sessions || []).forEach((session) => {
      (session.presentations || []).forEach((presentation) => {
        (presentation.keywords || []).forEach((keyword) => {
          const normalized = keyword.toLowerCase().trim();
          topicCounts.set(normalized, (topicCounts.get(normalized) || 0) + 1);
        });
      });
    });
  });

  // Sort by frequency, then alphabetically
  const sortedTopics = Array.from(topicCounts.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]; // Frequency descending
      return a[0].localeCompare(b[0]); // Alphabetical
    })
    .map(([topic]) => topic.charAt(0).toUpperCase() + topic.slice(1)); // Capitalize

  return sortedTopics.slice(0, maxTopics);
}

/**
 * Count unique speakers across program.
 * 
 * @param days - Program days data
 * @returns Number of unique speakers
 */
export function countUniqueSpeakers(days: ProgramDay[]): number {
  const speakerEmails = new Set<string>();

  days.forEach((day) => {
    (day.sessions || []).forEach((session) => {
      (session.presentations || []).forEach((presentation) => {
        (presentation.authors || []).forEach((author) => {
          const authorWithEmail = author as { name: string; email?: string };
          if (authorWithEmail.email) {
            speakerEmails.add(authorWithEmail.email.toLowerCase());
          } else if (author.name) {
            // Fallback to name if no email
            speakerEmails.add(author.name.toLowerCase());
          }
        });
      });
    });
  });

  return speakerEmails.size;
}
