/**
 * Slug Generator Utility
 * 
 * Generates URL-safe slugs from conference names.
 * Ensures uniqueness by appending year or counter if needed.
 */

import prisma from '../lib/prisma';

/**
 * Converts a string to a URL-safe slug
 * @param text - The text to slugify
 * @returns A URL-safe slug
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars (except spaces and hyphens)
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generates a unique slug for a conference
 * @param name - Conference name
 * @param startDate - Conference start date (used for uniqueness)
 * @returns A unique slug
 */
export async function generateUniqueSlug(name: string, startDate: Date): Promise<string> {
  const baseSlug = slugify(name);
  const year = new Date(startDate).getFullYear();
  
  // Try base slug with year first
  let slug = `${baseSlug}-${year}`;
  
  // Check if slug exists
  const existing = await prisma.conference.findUnique({
    where: { slug },
    select: { id: true }
  });
  
  if (!existing) {
    return slug;
  }
  
  // If exists, append counter
  let counter = 2;
  while (counter < 100) { // Safety limit
    slug = `${baseSlug}-${year}-${counter}`;
    
    const exists = await prisma.conference.findUnique({
      where: { slug },
      select: { id: true }
    });
    
    if (!exists) {
      return slug;
    }
    
    counter++;
  }
  
  // Fallback: append timestamp
  return `${baseSlug}-${year}-${Date.now()}`;
}
