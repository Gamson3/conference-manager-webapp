import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getUserId, getUserCognitoId, isAdmin } from "../utils/authHelper";

// Configure storage directory for files
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Helper function to create or get presenter profile
const getOrCreatePresenterProfile = async (user: any) => {
  let presenter = await prisma.presenter.findFirst({
    where: { userId: user.cognitoId }
  });

  if (!presenter) {
    presenter = await prisma.presenter.create({
      data: {
        userId: user.cognitoId,
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        affiliation: user.organization || '',
        title: user.jobTitle || null,
        // Removed profilePicture, socialLinks - they don't exist in schema
      }
    });
  }

  return presenter;
};

// Submit a new presentation
export const submitPresentation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conferenceId } = req.params;
    const { 
      title, 
      abstract, 
      categoryId,
      presentationTypeId,
      keywords,
      authors,
      requestedDuration
    } = req.body;
    const cognitoId = getUserCognitoId(req);
    
    if (!cognitoId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }
    
    // Get user info
    const user = await prisma.user.findUnique({
      where: { cognitoId }
    });
    
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Check if conference exists and is accepting submissions
    const conference = await prisma.conference.findFirst({
      where: { 
        id: Number(conferenceId),
        status: 'call_for_papers'
      },
      include: {
        submissionSettings: true,
        sections: {
          take: 1
        }
      }
    });
    
    if (!conference) {
      res.status(404).json({ 
        message: "Conference not found or not accepting submissions" 
      });
      return;
    }
    
    if (!conference.sections || conference.sections.length === 0) {
      res.status(400).json({ message: "Conference does not have any sections" });
      return;
    }

    // Validate submission based on submission settings
    const settings = conference.submissionSettings;
    if (!settings) {
      res.status(400).json({ message: "Conference submission settings not configured" });
      return;
    }
    
    // Validation checks
    if (settings.requireAbstract && !abstract) {
      res.status(400).json({ message: "Abstract is required" });
      return;
    }
    
    if (settings.maxAbstractLength && abstract && 
        abstract.length > settings.maxAbstractLength) {
      res.status(400).json({ 
        message: `Abstract cannot be longer than ${settings.maxAbstractLength} characters` 
      });
      return;
    }
    
    if (settings.requireKeywords && (!keywords || keywords.length < settings.minKeywords)) {
      res.status(400).json({ 
        message: `Please provide at least ${settings.minKeywords} keywords` 
      });
      return;
    }
    
    if (settings.requirePresentationType && !presentationTypeId) {
      res.status(400).json({ message: "Presentation type is required" });
      return;
    }
    
    // Create or get presenter profile for the user
    const presenter = await getOrCreatePresenterProfile(user);
    
    // Create the presentation - using only fields that exist in schema
    const presentation = await prisma.presentation.create({
      data: {
        title,
        abstract: abstract || '',
        categoryId: categoryId ? Number(categoryId) : null,
        presentationTypeId: presentationTypeId ? Number(presentationTypeId) : null,
        keywords: keywords || [],
        affiliations: [], // Add empty array as required by schema
        duration: requestedDuration || 20,
        sectionId: conference.sections[0].id, // Use sectionId directly
        conferenceId: Number(conferenceId), // Add required conferenceId
        status: 'submitted',
        submissionType: 'external',
        reviewStatus: 'PENDING',
        order: 0
        // Removed submitterId and submittedAt - they don't exist in schema
      }
    });
    
    // Create authors
    if (authors && authors.length > 0) {
      await Promise.all(
        authors.map(async (author: any, index: number) => {
          return prisma.presentationAuthor.create({
            data: {
              presentationId: presentation.id,
              authorName: author.name,
              authorEmail: author.email,
              affiliation: author.affiliation || '',
              isPresenter: author.isPresenter || false,
              isExternal: !author.userId,
              userId: author.userId || null,
              order: index + 1,
              title: author.title || null,
              bio: author.bio || null
            }
          });
        })
      );
    } else {
      // If no authors provided, add the submitter as author and presenter
      await prisma.presentationAuthor.create({
        data: {
          presentationId: presentation.id,
          authorName: user.name || '',
          authorEmail: user.email || '',
          affiliation: user.organization || '',
          isPresenter: true,
          isExternal: false,
          userId: user.id,
          order: 1
        }
      });
    }
    
    res.status(201).json({
      message: "Submission received successfully",
      presentation: {
        id: presentation.id,
        title: presentation.title,
        status: presentation.status,
        reviewStatus: presentation.reviewStatus
      },
      presenterProfileCreated: true
    });
  } catch (error: any) {
    console.error("Error submitting presentation:", error);
    res.status(500).json({ message: "Failed to submit presentation", error: error.message });
  }
};

// Get submission status
export const getSubmissionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const cognitoId = getUserCognitoId(req);
    
    if (!cognitoId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }
    
    const user = await prisma.user.findUnique({
      where: { cognitoId }
    });
    
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Find the presentation and check if user is author - remove submitterId check
    const presentation = await prisma.presentation.findFirst({
      where: {
        id: Number(id),
        // Only check if user is an author since submitterId doesn't exist
        authors: {
          some: {
            userId: user.id
          }
        }
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        presentationType: {
          select: {
            id: true,
            name: true
          }
        },
        authors: {
          select: {
            id: true,
            authorName: true,
            authorEmail: true,
            affiliation: true,
            isPresenter: true,
            order: true
          },
          orderBy: { order: 'asc' }
        },
        materials: {
          select: {
            id: true,
            title: true,
            fileType: true,
            uploadedAt: true,
            isPublic: true
          }
        },
        section: {
          select: {
            id: true,
            name: true,
            conference: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        }
      }
    });
    
    if (!presentation) {
      res.status(404).json({ message: "Submission not found or you don't have access" });
      return;
    }
    
    res.json(presentation);
  } catch (error: any) {
    console.error("Error fetching submission status:", error);
    res.status(500).json({ message: "Failed to fetch submission status", error: error.message });
  }
};

// List user's submissions
export const listUserSubmissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const cognitoId = getUserCognitoId(req);
    
    if (!cognitoId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }
    
    const user = await prisma.user.findUnique({
      where: { cognitoId }
    });
    
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    // Find all submissions where user is author - remove submitterId check
    const submissions = await prisma.presentation.findMany({
      where: {
        authors: {
          some: {
            userId: user.id
          }
        }
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        presentationType: {
          select: {
            id: true,
            name: true
          }
        },
        section: {
          select: {
            id: true,
            name: true,
            conference: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        },
        materials: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc' // Use createdAt instead of submittedAt
      }
    });
    
    res.json(submissions);
  } catch (error: any) {
    console.error("Error listing user submissions:", error);
    res.status(500).json({ message: "Failed to list submissions", error: error.message });
  }
};

// Upload a file for a presentation
export const uploadPresentationFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { presentationId } = req.params;
    const cognitoId = getUserCognitoId(req);
    
    if (!cognitoId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }
    
    // Get user info
    const user = await prisma.user.findUnique({
      where: { cognitoId }
    });
    
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    // Check if presentation exists and belongs to user - remove submitterId check
    const presentation = await prisma.presentation.findFirst({
      where: { 
        id: Number(presentationId),
        authors: {
          some: {
            userId: user.id
          }
        }
      },
      include: {
        section: {
          include: {
            conference: {
              include: {
                submissionSettings: true
              }
            }
          }
        }
      }
    });
    
    if (!presentation) {
      res.status(404).json({ message: "Presentation not found or you don't have permission" });
      return;
    }
    
    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    // Check if presentation has a section
    if (!presentation.section) {
      res.status(400).json({ message: "Presentation is not assigned to a section" });
      return;
    }
    
    // Get conference submission settings
    const settings = presentation.section.conference.submissionSettings;
    
    // Check file size if limit is set
    if (settings?.maxFileSize && req.file.size > settings.maxFileSize * 1024 * 1024) {
      // Delete the uploaded file from temp storage
      fs.unlinkSync(req.file.path);
      
      res.status(400).json({ 
        message: `File exceeds maximum size of ${settings.maxFileSize}MB` 
      });
      return;
    }
    
    // Check file type if required
    if (settings?.allowedFileTypes) {
      const allowedTypes = settings.allowedFileTypes.map(type => type.trim().toLowerCase());
      const fileExtension = path.extname(req.file.originalname).substring(1).toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        // Delete the uploaded file from temp storage
        fs.unlinkSync(req.file.path);
        
        res.status(400).json({ 
          message: `File type not allowed. Allowed types: ${settings.allowedFileTypes.join(', ')}` 
        });
        return;
      }
    }
    
    // Create directory for conference and presentation if it doesn't exist
    const conferenceDir = path.join(UPLOAD_DIR, `conference-${presentation.section.conferenceId}`);
    const presentationDir = path.join(conferenceDir, `presentation-${presentationId}`);
    
    if (!fs.existsSync(conferenceDir)) {
      fs.mkdirSync(conferenceDir, { recursive: true });
    }
    
    if (!fs.existsSync(presentationDir)) {
      fs.mkdirSync(presentationDir);
    }
    
    // Generate unique filename
    const uniqueFilename = `${Date.now()}-${uuidv4()}${path.extname(req.file.originalname)}`;
    const filePath = path.join(presentationDir, uniqueFilename);
    
    // Move file from temp location to final location
    fs.copyFileSync(req.file.path, filePath);
    fs.unlinkSync(req.file.path); // Remove the temp file
    
    // Store relative path for easier portability
    const relativePath = path.join('uploads', 
      `conference-${presentation.section.conferenceId}`, 
      `presentation-${presentationId}`, 
      uniqueFilename
    );
    
    // Create record in database with only existing fields
    const material = await prisma.presentationMaterial.create({
      data: {
        presentationId: Number(presentationId),
        title: req.file.originalname,
        fileUrl: relativePath,
        fileType: req.file.mimetype,
        uploadedAt: new Date(),
        isPublic: req.body.isPublic === 'true' || false,
        description: req.body.description || null
        // Removed uploadedById - it doesn't exist in schema
      }
    });
    
    // Return success response with file info
    res.status(201).json({
      message: "File uploaded successfully",
      material: {
        id: material.id,
        title: material.title,
        fileUrl: material.fileUrl,
        fileType: material.fileType,
        uploadedAt: material.uploadedAt,
        isPublic: material.isPublic
      }
    });
    
  } catch (error: any) {
    console.error("Error uploading file:", error);
    
    // Clean up temp file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      message: "Failed to upload file", 
      error: error.message 
    });
  }
};

// Get all materials for a presentation
export const getPresentationMaterials = async (req: Request, res: Response): Promise<void> => {
  try {
    const { presentationId } = req.params;
    const cognitoId = getUserCognitoId(req);
    
    if (!cognitoId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }
    
    const user = await prisma.user.findUnique({
      where: { cognitoId }
    });
    
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    // Check if user has access to this presentation - remove submitterId check
    const presentation = await prisma.presentation.findFirst({
      where: {
        id: Number(presentationId),
        OR: [
          { 
            authors: {
              some: {
                userId: user.id
              }
            }
          },
          // Conference organizers should also have access
          { 
            section: {
              conference: {
                createdById: user.id
              }
            }
          }
        ]
      }
    });
    
    if (!presentation && !isAdmin(req)) {
      res.status(404).json({ message: "Presentation not found or you don't have access" });
      return;
    }
    
    // Get all materials for this presentation - remove uploadedBy include
    const materials = await prisma.presentationMaterial.findMany({
      where: { presentationId: Number(presentationId) },
      orderBy: { uploadedAt: 'desc' }
    });
    
    // Add download URLs to materials
    const materialsWithUrls = materials.map(material => ({
      id: material.id,
      title: material.title,
      fileType: material.fileType,
      fileUrl: material.fileUrl,
      uploadedAt: material.uploadedAt,
      isPublic: material.isPublic,
      downloadUrl: `/api/files/${material.id}/download`
    }));
    
    res.json(materialsWithUrls);
  } catch (error: any) {
    console.error("Error getting presentation materials:", error);
    res.status(500).json({ message: "Failed to get materials", error: error.message });
  }
};

// Download a specific file
export const downloadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;
    const cognitoId = getUserCognitoId(req);
    
    if (!cognitoId && !req.query.public) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }
    
    // Get the file metadata
    const file = await prisma.presentationMaterial.findUnique({
      where: { id: Number(fileId) },
      include: {
        presentation: true
      }
    });
    
    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }
    
    // Check if the file is public or if the user has permission
    if (!file.isPublic && cognitoId) {
      const user = await prisma.user.findUnique({
        where: { cognitoId }
      });
      
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      
      // Check if user has access to the presentation - remove submitterId check
      const hasAccess = await prisma.presentation.findFirst({
        where: {
          id: file.presentationId,
          OR: [
            { authors: { some: { userId: user.id } } },
            { section: { conference: { createdById: user.id } } }
          ]
        }
      });
      
      if (!hasAccess && !isAdmin(req)) {
        res.status(403).json({ message: "You don't have permission to access this file" });
        return;
      }
    } else if (!file.isPublic && !cognitoId) {
      res.status(403).json({ message: "This file is not public" });
      return;
    }
    
    // Check if file exists on disk
    const fullPath = path.join(process.cwd(), file.fileUrl);
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ message: "File not found on server" });
      return;
    }
    
    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.title)}"`);
    res.setHeader('Content-Type', file.fileType || 'application/octet-stream');
    
    // Stream the file
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);
  } catch (error: any) {
    console.error("Error downloading file:", error);
    res.status(500).json({ message: "Failed to download file", error: error.message });
  }
};

// Delete a presentation material
export const deletePresentationMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { materialId } = req.params;
    const cognitoId = getUserCognitoId(req);
    
    if (!cognitoId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }
    
    const user = await prisma.user.findUnique({
      where: { cognitoId }
    });
    
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    // Check if material exists and user has permission to delete it
    const material = await prisma.presentationMaterial.findFirst({
      where: {
        id: Number(materialId)
      },
      include: {
        presentation: {
          include: {
            authors: {
              where: { userId: user.id }
            },
            section: {
              include: {
                conference: true
              }
            }
          }
        }
      }
    });
    
    if (!material) {
      res.status(404).json({ message: "Material not found" });
      return;
    }
    
    // Check if user is author or conference organizer
    const isAuthor = material.presentation.authors.length > 0;
    const isOrganizer = material.presentation.section?.conference.createdById === user.id;
    
    if (!isAuthor && !isOrganizer && !isAdmin(req)) {
      res.status(403).json({ message: "You don't have permission to delete this material" });
      return;
    }
    
    // Delete file from disk
    const fullPath = path.join(process.cwd(), material.fileUrl);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    
    // Delete record from database
    await prisma.presentationMaterial.delete({
      where: { id: Number(materialId) }
    });
    
    res.json({ message: "Material deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting material:", error);
    res.status(500).json({ message: "Failed to delete material", error: error.message });
  }
};

// GET /api/presenter/dashboard - Get presenter dashboard data
export const getPresenterDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const cognitoId = getUserCognitoId(req);
    
    if (!cognitoId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }
    
    const user = await prisma.user.findUnique({
      where: { cognitoId }
    });
    
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Get or create presenter profile
    const presenter = await getOrCreatePresenterProfile(user);

    // Get presenter's submissions and presentations - remove submitterId check
    const submissions = await prisma.presentation.findMany({
      where: {
        authors: {
          some: {
            userId: user.id
          }
        }
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        presentationType: {
          select: {
            id: true,
            name: true
          }
        },
        section: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            room: true,
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
        authors: {
          where: { userId: user.id },
          select: {
            id: true,
            isPresenter: true,
            order: true
          }
        },
        materials: {
          select: {
            id: true,
            title: true,
            fileType: true,
            uploadedAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc' // Use createdAt instead of submittedAt
      }
    });

    // Get statistics
    const stats = {
      totalSubmissions: submissions.length,
      approvedPresentations: submissions.filter(s => s.reviewStatus === 'APPROVED').length,
      pendingSubmissions: submissions.filter(s => s.reviewStatus === 'PENDING').length,
      rejectedSubmissions: submissions.filter(s => s.reviewStatus === 'REJECTED').length,
      scheduledPresentations: submissions.filter(s => s.status === 'scheduled').length,
      totalMaterials: submissions.reduce((sum, s) => sum + s.materials.length, 0)
    };

    // Get upcoming presentations
    const upcomingPresentations = submissions.filter(s => 
      s.section?.conference.startDate && 
      new Date(s.section.conference.startDate) > new Date() &&
      s.reviewStatus === 'APPROVED'
    );

    // Get conferences the presenter is involved with
    const conferences = [...new Set(submissions.map(s => s.section?.conference).filter(Boolean))];

    res.json({
      presenter,
      submissions,
      upcomingPresentations,
      conferences,
      stats,
      userRole: user.role
    });
  } catch (error: any) {
    console.error("Error fetching presenter dashboard:", error);
    res.status(500).json({ message: "Failed to fetch presenter dashboard", error: error.message });
  }
};

// POST /api/presenter/profile - Create presenter profile
export const createPresenterProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const cognitoId = getUserCognitoId(req);
    
    if (!cognitoId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }
    
    const user = await prisma.user.findUnique({
      where: { cognitoId }
    });
    
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const presenter = await getOrCreatePresenterProfile(user);
    
    res.status(201).json({
      message: "Presenter profile created successfully",
      presenter
    });
  } catch (error: any) {
    console.error("Error creating presenter profile:", error);
    res.status(500).json({ message: "Failed to create presenter profile", error: error.message });
  }
};

// PUT /api/presenter/profile - Update presenter profile
export const updatePresenterProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const cognitoId = getUserCognitoId(req);
    const { bio, affiliation, title } = req.body; // Remove socialLinks and isActive
    
    if (!cognitoId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }
    
    const user = await prisma.user.findUnique({
      where: { cognitoId }
    });
    
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Get or create presenter profile first
    await getOrCreatePresenterProfile(user);

    // Get the presenter to get its ID first
    const presenter = await prisma.presenter.findFirst({
      where: { userId: cognitoId }
    });
    
    if (!presenter) {
      res.status(404).json({ message: "Presenter profile not found" });
      return;
    }

    // Update the presenter profile with only existing fields
    const updatedPresenter = await prisma.presenter.update({
      where: { id: presenter.id },
      data: {
        bio: bio || undefined,
        affiliation: affiliation || undefined,
        title: title || undefined
        // Removed socialLinks and isActive - they don't exist in schema
      }
    });
    
    res.json({
      message: "Presenter profile updated successfully",
      presenter: updatedPresenter
    });
  } catch (error: any) {
    console.error("Error updating presenter profile:", error);
    res.status(500).json({ message: "Failed to update presenter profile", error: error.message });
  }
};