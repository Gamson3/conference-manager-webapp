/**
 * Conference Resolver Utility
 * 
 * Resolves conference identifiers (slug or numeric ID) to numeric IDs.
 * This allows URLs to use pretty slugs (e.g., /conferences/global-ai-summit-2026)
 * while the backend continues to work with numeric IDs internally.
 * 
 * Usage:
 *   const conferenceId = await resolveConferenceId(req.params.id);
 */

import prisma from '../lib/prisma';

/**
 * Resolves a conference slug or numeric ID to a numeric ID
 * 
 * @param identifier - Conference slug (e.g., "global-ai-summit-2026") or numeric ID (e.g., "123")
 * @returns Promise<number> - The conference's numeric ID
 * @throws Error if conference not found
 */
export async function resolveConferenceId(identifier: string): Promise<number> {
  // Check if identifier is already a numeric ID
  const numericId = Number(identifier);
  
  if (!isNaN(numericId) && Number.isInteger(numericId)) {
    // It's a numeric ID - verify it exists
    const conference = await prisma.conference.findUnique({
      where: { id: numericId },
      select: { id: true }
    });
    
    if (!conference) {
      throw new Error('Conference not found');
    }
    
    return conference.id;
  }
  
  // It's a slug - query by slug
  const conference = await prisma.conference.findUnique({
    where: { slug: identifier },
    select: { id: true }
  });
  
  if (!conference) {
    throw new Error('Conference not found');
  }
  
  return conference.id;
}
