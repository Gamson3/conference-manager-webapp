import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getUserId, isAdmin } from '../utils/authHelper';
import prisma from '../lib/prisma';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'presentations');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-originalname
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

// File filter for ONLY PDF and Word documents
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = [
    'application/pdf',                                                          // PDF files
    'application/msword',                                                       // .doc files
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'  // .docx files
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (reasonable for PDF/Word docs)
  }
});

// POST /api/presentations/:id/materials - Upload material
export const uploadPresentationMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: presentationId } = req.params;
    const { title, description } = req.body;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    // Verify presentation exists and user has permission
    const presentation = await prisma.presentation.findUnique({
      where: { id: Number(presentationId) },
      include: {
        section: {
          include: {
            conference: {
              select: { createdById: true }
            }
          }
        }
      }
    });

    if (!presentation) {
      res.status(404).json({ message: "Presentation not found" });
      return;
    }

    // Check permissions
    if (!isAdmin(req) && presentation.section.conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to upload materials for this presentation" });
      return;
    }

    // Determine file type based on mimetype (only PDF and Word)
    const getFileType = (mimetype: string): string => {
      if (mimetype === 'application/pdf') return 'pdf';
      if (mimetype === 'application/msword') return 'doc';
      if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
      return 'document'; // fallback
    };

    // Create file URL (relative to server root)
    const fileUrl = `/uploads/presentations/${req.file.filename}`;

    // Save material to database
    const material = await prisma.presentationMaterial.create({
      data: {
        presentationId: Number(presentationId),
        title: title || req.file.originalname,
        description: description || null,
        fileUrl,
        fileType: getFileType(req.file.mimetype),
      }
    });

    res.status(201).json({
      id: material.id,
      title: material.title,
      description: material.description,
      fileUrl: material.fileUrl,
      fileType: material.fileType,
      uploadedAt: material.uploadedAt,
      message: "Material uploaded successfully"
    });

  } catch (error: any) {
    console.error('Error uploading material:', error);
    
    // Clean up uploaded file if database save failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error.message.includes('Invalid file type')) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Failed to upload material", error: error.message });
    }
  }
};

// GET /api/presentations/:id/materials - Get all materials for a presentation
export const getPresentationMaterials = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: presentationId } = req.params;

    const materials = await prisma.presentationMaterial.findMany({
      where: { 
        presentationId: Number(presentationId),
        isPublic: true // Only show public materials for now
      },
      orderBy: { uploadedAt: 'desc' }
    });

    res.json(materials);
  } catch (error: any) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ message: "Failed to fetch materials" });
  }
};

// DELETE /api/materials/:id - Delete a material
export const deletePresentationMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Get material with presentation info for permission check
    const material = await prisma.presentationMaterial.findUnique({
      where: { id: Number(id) },
      include: {
        presentation: {
          include: {
            section: {
              include: {
                conference: {
                  select: { createdById: true }
                }
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

    // Check permissions
    if (!isAdmin(req) && material.presentation.section.conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to delete this material" });
      return;
    }

    // Delete file from filesystem
    const filePath = path.join(process.cwd(), material.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await prisma.presentationMaterial.delete({
      where: { id: Number(id) }
    });

    res.json({ message: "Material deleted successfully" });
  } catch (error: any) {
    console.error('Error deleting material:', error);
    res.status(500).json({ message: "Failed to delete material" });
  }
};

// GET /uploads/presentations/:filename - Serve uploaded files
export const servePresentationFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'uploads', 'presentations', filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const fileExtension = path.extname(filename).toLowerCase();

    // Set appropriate content type (only PDF and Word)
    const contentTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    const contentType = contentTypes[fileExtension] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error: any) {
    console.error('Error serving file:', error);
    res.status(500).json({ message: "Failed to serve file" });
  }
};