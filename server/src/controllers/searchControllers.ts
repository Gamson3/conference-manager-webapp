import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getUserId, isAdmin } from '../utils/authHelper';
import { ConferenceStatus, Prisma } from '@prisma/client'; // Add Prisma import

// Create reusable filter utilities at the top
const textSearchFilter = (term: string): Prisma.StringFilter => ({
  contains: term,
  mode: 'insensitive'
});

const arraySearchFilter = (term: string): Prisma.StringNullableListFilter => ({
  hasSome: [term]
});

// Create conference access filter utility
const conferenceAccessFilter = (userId: number | null, isAdminUser: boolean): Prisma.ConferenceWhereInput[] => [
  { status: ConferenceStatus.published, isPublic: true },
  ...(userId ? [{ createdById: userId }] : []),
  ...(isAdminUser ? [{}] : [])
];

// GET /api/conferences/:id/search - Search presentations within a conference
export const searchConferencePresentations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { q, type, limit = 50 } = req.query;
    const userId = getUserId(req);

    if (!q || typeof q !== 'string') {
      res.status(400).json({ message: "Search query is required" });
      return;
    }

    // Verify conference access
    const conference = await prisma.conference.findFirst({
      where: {
        id: Number(id),
        OR: conferenceAccessFilter(userId ?? null, isAdmin(req))
      }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found or not accessible" });
      return;
    }

    const searchTerm = q.toLowerCase();
    const textFilter = textSearchFilter(searchTerm);
    const arrayFilter = arraySearchFilter(searchTerm);

    let whereClause: Prisma.PresentationWhereInput = {
      section: {
        conferenceId: Number(id)
      }
    };

    // Build search conditions based on type
    switch (type) {
      case 'author':
        whereClause.authors = {
          some: {
            authorName: textFilter
          }
        };
        break;
      
      case 'title':
        whereClause.title = textFilter;
        break;
      
      case 'section':
        whereClause.section = {
          conferenceId: Number(id),
          name: textFilter
        };
        break;
      
      case 'keyword':
        whereClause.keywords = arrayFilter;
        break;
      
      case 'affiliation':
        whereClause.OR = [
          { affiliations: arrayFilter },
          {
            authors: {
              some: {
                affiliation: textFilter
              }
            }
          }
        ];
        break;
      
      default:
        // Search across all fields
        whereClause = {
          AND: [
            { section: { conferenceId: Number(id) } },
            {
              OR: [
                { title: textFilter },
                { abstract: textFilter },
                { keywords: arrayFilter },
                { affiliations: arrayFilter },
                { 
                  authors: { 
                    some: { 
                      authorName: textFilter
                    } 
                  } 
                },
                { 
                  authors: { 
                    some: { 
                      affiliation: textFilter
                    } 
                  } 
                },
                { 
                  section: { 
                    name: textFilter
                  } 
                }
              ]
            }
          ]
        };
    }

    const presentations = await prisma.presentation.findMany({
      where: whereClause,
      include: {
        authors: {
          orderBy: { order: 'asc' }
        },
        section: {
          include: {
            day: true
          }
        },
        favorites: userId ? {
          where: { userId: userId }
        } : false,
        _count: {
          select: { favorites: true }
        }
      },
      orderBy: [
        { section: { day: { order: 'asc' } } },
        { section: { order: 'asc' } },
        { order: 'asc' }
      ],
      take: Number(limit)
    });

    // Format results with highlights
    const formattedResults = presentations.map(presentation => ({
      id: presentation.id,
      title: presentation.title,
      abstract: presentation.abstract,
      keywords: presentation.keywords,
      affiliations: presentation.affiliations,
      duration: presentation.duration,
      order: presentation.order,
      status: presentation.status,
      authors: presentation.authors.map(author => ({
        id: author.id,
        name: author.authorName,
        email: author.authorEmail,
        affiliation: author.affiliation,
        isPresenter: author.isPresenter,
        isExternal: author.isExternal
      })),
      section: {
        id: presentation.section.id,
        name: presentation.section.name,
        type: presentation.section.type,
        startTime: presentation.section.startTime?.toISOString(),
        endTime: presentation.section.endTime?.toISOString(),
        room: presentation.section.room,
        day: presentation.section.day ? {
          id: presentation.section.day.id,
          name: presentation.section.day.name,
          date: presentation.section.day.date.toISOString().split('T')[0]
        } : null
      },
      isFavorite: userId ? (presentation.favorites?.length > 0) : false,
      favoriteCount: presentation._count.favorites,
      matchedFields: getMatchedFields(presentation, searchTerm, type as string)
    }));

    res.json({
      query: q,
      type: type || 'all',
      resultsCount: formattedResults.length,
      results: formattedResults
    });

  } catch (error: any) {
    console.error('Error searching presentations:', error);
    res.status(500).json({ message: 'Search failed', error: error.message });
  }
};

// GET /api/search/global - Global search across all accessible conferences
export const globalSearch = async (req: Request, res: Response) => {
  try {
    const { q, limit = 50, includeLocation='false' } = req.query;
    const userId = getUserId(req);

    if (!q || typeof q !== 'string') {
      res.status(400).json({ message: "Search query is required" });
      return;
    }

    const searchTerm = q.toLowerCase();
    const textFilter = textSearchFilter(searchTerm);
    const arrayFilter = arraySearchFilter(searchTerm);
    const accessFilter = conferenceAccessFilter(userId ?? null, isAdmin(req));

    // Search presentations
    const presentations = await prisma.presentation.findMany({
      where: {
        AND: [
          { 
            section: { 
              conference: {
                OR: accessFilter
              }
            }
          },
          {
            OR: [
              { title: textFilter },
              { abstract: textFilter },
              { keywords: arrayFilter },
              { 
                authors: { 
                  some: { 
                    authorName: textFilter
                  } 
                } 
              }
            ]
          }
        ]
      },
      include: {
        authors: {
          orderBy: { order: 'asc' }
        },
        section: {
          include: {
            day: includeLocation === 'true',
            conference: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
                status: true
              }
            }
          }
        },
        favorites: userId ? {
          where: { userId: userId }
        } : false,
        _count: {
          select: { favorites: true }
        }
      },
      take: Number(limit),
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Search conferences
    const conferences = await prisma.conference.findMany({
      where: {
        AND: [
          {
            OR: accessFilter
          },
          {
            OR: [
              { name: textFilter },
              { description: textFilter },
              { topics: arrayFilter }
            ]
          }
        ]
      },
      take: 10,
      orderBy: {
        startDate: 'desc'
      }
    });

    res.json({
      query: q,
      presentations: presentations.map(presentation => ({
        id: presentation.id,
        title: presentation.title,
        abstract: presentation.abstract?.substring(0, 200) + (presentation.abstract ? '...' : ''),
        authors: presentation.authors.map(a => a.authorName).join(', '),
        conference: {
          id: presentation.section.conference.id,
          name: presentation.section.conference.name,
          startDate: presentation.section.conference.startDate
        },
        section: {
          id: presentation.section.id,
          name: presentation.section.name,
          day: presentation.section.day?.name
        },
        isFavorite: userId ? (presentation.favorites?.length > 0) : false,
        favoriteCount: presentation._count.favorites,
        // Add navigation support
        ...(includeLocation === 'true' && {
          navigationPath: {
            dayId: presentation.section.day?.id,
            sectionId: presentation.section.id,
            directUrl: `/attendee/conferences/${presentation.section.conference.id}/tree?expandDay=${presentation.section.day?.id}&expandSection=${presentation.section.id}&highlight=${presentation.id}`
          }
        })
      })),
      conferences: conferences.map(conference => ({
        id: conference.id,
        name: conference.name,
        description: conference.description?.substring(0, 200) + (conference.description ? '...' : ''),
        startDate: conference.startDate,
        endDate: conference.endDate,
        status: conference.status,
        navigationUrl: `/attendee/conferences/${conference.id}`
      }))
    });

  } catch (error: any) {
    console.error('Error in global search:', error);
    res.status(500).json({ message: 'Global search failed', error: error.message });
  }
};

// Update getSearchSuggestions to use the same pattern
export const getSearchSuggestions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { q } = req.query;
    const userId = getUserId(req);

    if (!q || typeof q !== 'string' || q.length < 2) {
      res.json({ suggestions: [] });
      return;
    }

    // Verify conference access
    const conference = await prisma.conference.findFirst({
      where: {
        id: Number(id),
        OR: conferenceAccessFilter(userId ?? null, isAdmin(req))
      }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    const searchTerm = q.toLowerCase();
    const textFilter = textSearchFilter(searchTerm);
    const arrayFilter = arraySearchFilter(searchTerm);

    // Get suggestions from different sources
    const [authorSuggestions, keywordSuggestions, sectionSuggestions] = await Promise.all([
      // Author suggestions
      prisma.presentationAuthor.findMany({
        where: {
          presentation: {
            section: { conferenceId: Number(id) }
          },
          authorName: textFilter
        },
        select: { authorName: true },
        distinct: ['authorName'],
        take: 5
      }),

      // Keyword suggestions
      prisma.presentation.findMany({
        where: {
          section: { conferenceId: Number(id) },
          keywords: arrayFilter
        },
        select: { keywords: true },
        take: 10
      }),

      // Section suggestions
      prisma.section.findMany({
        where: {
          conferenceId: Number(id),
          name: textFilter
        },
        select: { name: true },
        take: 5
      })
    ]);

    // Extract and format suggestions
    const suggestions = [
      ...authorSuggestions.map(a => ({ type: 'author', value: a.authorName })),
      ...sectionSuggestions.map(s => ({ type: 'section', value: s.name })),
      ...keywordSuggestions
        .flatMap(p => p.keywords)
        .filter(keyword => keyword.toLowerCase().includes(searchTerm))
        .map(keyword => ({ type: 'keyword', value: keyword }))
        .slice(0, 5)
    ];

    // Remove duplicates and limit results
    const uniqueSuggestions = suggestions
      .filter((suggestion, index, self) => 
        index === self.findIndex(s => s.value === suggestion.value)
      )
      .slice(0, 10);

    res.json({ suggestions: uniqueSuggestions });

  } catch (error: any) {
    console.error('Error getting search suggestions:', error);
    res.status(500).json({ message: 'Failed to get suggestions', error: error.message });
  }
};

// GET /api/conferences/:id/search/tree - Search with tree structure context
export const searchWithTreeContext = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { q, type, limit = 50 } = req.query;
    const userId = getUserId(req);

    if (!q || typeof q !== 'string') {
      res.status(400).json({ message: "Search query is required" });
      return;
    }

    // Verify conference access
    const conference = await prisma.conference.findFirst({
      where: {
        id: Number(id),
        OR: conferenceAccessFilter(userId ?? null, isAdmin(req))
      }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found or not accessible" });
      return;
    }

    const searchTerm = q.toLowerCase();
    const textFilter = textSearchFilter(searchTerm);
    const arrayFilter = arraySearchFilter(searchTerm);

    // Search presentations with full tree context
    const presentations = await prisma.presentation.findMany({
      where: {
        AND: [
          { section: { conferenceId: Number(id) } },
          {
            OR: [
              { title: textFilter },
              { abstract: textFilter },
              { keywords: arrayFilter },
              { affiliations: arrayFilter },
              { 
                authors: { 
                  some: { 
                    authorName: textFilter
                  } 
                } 
              }
            ]
          }
        ]
      },
      include: {
        authors: {
          orderBy: { order: 'asc' }
        },
        section: {
          include: {
            day: {
              select: {
                id: true,
                name: true,
                date: true,
                order: true
              }
            }
          }
        },
        favorites: userId ? {
          where: { userId: userId }
        } : false,
        _count: {
          select: { favorites: true }
        }
      },
      orderBy: [
        { section: { day: { order: 'asc' } } },
        { section: { order: 'asc' } },
        { order: 'asc' }
      ],
      take: Number(limit)
    });

    // Group results by day -> section for tree view
    const treeStructure = presentations.reduce((acc: any, presentation) => {
      const dayId = presentation.section.day?.id ?? 'unscheduled';
      const dayName = presentation.section.day?.name || 'Unscheduled';
      const sectionId = presentation.section.id;
      const sectionName = presentation.section.name;

      if (!acc[dayId]) {
        acc[dayId] = {
          id: dayId,
          name: dayName,
          date: presentation.section.day?.date,
          order: presentation.section.day?.order || 999,
          sections: {}
        };
      }

      if (!acc[dayId].sections[sectionId]) {
        acc[dayId].sections[sectionId] = {
          id: sectionId,
          name: sectionName,
          type: presentation.section.type,
          startTime: presentation.section.startTime,
          endTime: presentation.section.endTime,
          room: presentation.section.room,
          presentations: []
        };
      }

      acc[dayId].sections[sectionId].presentations.push({
        id: presentation.id,
        title: presentation.title,
        abstract: presentation.abstract,
        keywords: presentation.keywords,
        duration: presentation.duration,
        order: presentation.order,
        authors: presentation.authors.map(author => ({
          name: author.authorName,
          affiliation: author.affiliation,
          isPresenter: author.isPresenter
        })),
        isFavorite: userId ? (presentation.favorites?.length > 0) : false,
        favoriteCount: presentation._count.favorites,
        // Add navigation context for tree view
        navigationPath: {
          dayId: dayId,
          dayName: dayName,
          sectionId: sectionId,
          sectionName: sectionName
        }
      });

      return acc;
    }, {});

    // Convert to array and sort
    const sortedDays = Object.values(treeStructure).map((day: any) => ({
      ...day,
      sections: Object.values(day.sections)
    })).sort((a: any, b: any) => a.order - b.order);

    res.json({
      query: q,
      type: type || 'all',
      conferenceId: Number(id),
      conferenceName: conference.name,
      totalResults: presentations.length,
      treeStructure: sortedDays,
      // Also provide flat results for other uses
      flatResults: presentations.map(presentation => ({
        id: presentation.id,
        title: presentation.title,
        abstract: presentation.abstract,
        authors: presentation.authors.map(a => a.authorName).join(', '),
        section: presentation.section.name,
        day: presentation.section.day?.name,
        isFavorite: userId ? (presentation.favorites?.length > 0) : false,
        navigationPath: {
          dayId: presentation.section.day?.id,
          dayName: presentation.section.day?.name,
          sectionId: presentation.section.id,
          sectionName: presentation.section.name
        }
      }))
    });

  } catch (error: any) {
    console.error('Error in tree search:', error);
    res.status(500).json({ message: 'Tree search failed', error: error.message });
  }
};


// GET /api/presentations/:id/location - Get presentation location for tree navigation
export const getPresentationLocation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const presentation = await prisma.presentation.findUnique({
      where: { id: Number(id) },
      include: {
        section: {
          include: {
            day: true,
            conference: {
              select: {
                id: true,
                name: true,
                status: true,
                isPublic: true,
                createdById: true
              }
            }
          }
        }
      }
    });

    if (!presentation) {
      res.status(404).json({ message: "Presentation not found" });
      return;
    }

    // Check access
    const hasAccess = presentation.section.conference.isPublic && 
                     presentation.section.conference.status === 'published' ||
                     presentation.section.conference.createdById === userId ||
                     isAdmin(req);

    if (!hasAccess) {
      res.status(403).json({ message: "Not authorized to access this presentation" });
      return;
    }

    res.json({
      presentationId: presentation.id,
      title: presentation.title,
      conference: {
        id: presentation.section.conference.id,
        name: presentation.section.conference.name
      },
      location: {
        dayId: presentation.section.day?.id,
        dayName: presentation.section.day?.name,
        dayDate: presentation.section.day?.date,
        sectionId: presentation.section.id,
        sectionName: presentation.section.name,
        sectionType: presentation.section.type,
        sectionTime: {
          start: presentation.section.startTime,
          end: presentation.section.endTime
        },
        room: presentation.section.room
      },
      // Navigation URLs for frontend
      navigationUrls: {
        conference: `/attendee/conferences/${presentation.section.conference.id}`,
        treeView: `/attendee/conferences/${presentation.section.conference.id}/tree`,
        directLink: `/attendee/conferences/${presentation.section.conference.id}/tree?expandDay=${presentation.section.day?.id}&expandSection=${presentation.section.id}&highlight=${presentation.id}`
      }
    });

  } catch (error: any) {
    console.error('Error getting presentation location:', error);
    res.status(500).json({ message: 'Failed to get location', error: error.message });
  }
};

// Helper function remains the same
function getMatchedFields(presentation: any, searchTerm: string, searchType: string): string[] {
  const matched: string[] = [];
  const term = searchTerm.toLowerCase();

  if (presentation.title.toLowerCase().includes(term)) {
    matched.push('title');
  }

  if (presentation.abstract && presentation.abstract.toLowerCase().includes(term)) {
    matched.push('abstract');
  }

  if (presentation.keywords.some((keyword: string) => keyword.toLowerCase().includes(term))) {
    matched.push('keywords');
  }

  if (presentation.authors.some((author: any) => 
    author.authorName.toLowerCase().includes(term) ||
    (author.affiliation && author.affiliation.toLowerCase().includes(term))
  )) {
    matched.push('authors');
  }

  if (presentation.affiliations.some((affiliation: string) => 
    affiliation.toLowerCase().includes(term)
  )) {
    matched.push('affiliations');
  }

  return matched;
}