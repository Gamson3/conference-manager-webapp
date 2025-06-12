import { Request, Response } from "express";
import prisma from '../lib/prisma';
import { getUserId, isAdmin } from "../utils/authHelper";

// GET /api/conferences/:id/categories - Get all categories for a conference
export const getConferenceCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Verify conference exists and user has permission
    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      select: { createdById: true }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to view categories for this conference" });
      return;
    }

    // Get categories with counts
    const categories = await prisma.category.findMany({
      where: { conferenceId: Number(id) },
      include: {
        _count: {
          select: {
            presentations: true,
            sections: true
          }
        }
      },
      orderBy: { order: 'asc' }
    });

    console.log(`[CATEGORY] Retrieved ${categories.length} categories for conference ${id}`);
    res.json(categories);

  } catch (error: any) {
    console.error("Error fetching conference categories:", error);
    res.status(500).json({ 
      message: "Failed to fetch categories", 
      error: error.message 
    });
  }
};

// POST /api/conferences/:id/categories - Create new category
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, color } = req.body;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Verify conference exists and user has permission
    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      select: { createdById: true }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to create categories for this conference" });
      return;
    }

    // Validate required fields
    if (!name || name.trim().length === 0) {
      res.status(400).json({ message: "Category name is required" });
      return;
    }

    // Get next order number
    const lastCategory = await prisma.category.findFirst({
      where: { conferenceId: Number(id) },
      orderBy: { order: 'desc' }
    });

    const nextOrder = lastCategory ? lastCategory.order + 1 : 1;

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#3B82F6', // Default blue color
        conferenceId: Number(id),
        order: nextOrder
      },
      include: {
        _count: {
          select: {
            presentations: true,
            sections: true
          }
        }
      }
    });

    console.log(`[CATEGORY] Created category "${name}" for conference ${id}`);
    res.status(201).json(category);

  } catch (error: any) {
    console.error("Error creating category:", error);
    res.status(500).json({ 
      message: "Failed to create category", 
      error: error.message 
    });
  }
};

// PUT /api/categories/:id - Update category
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, color, order } = req.body;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Verify category exists and user has permission
    const category = await prisma.category.findUnique({
      where: { id: Number(id) },
      include: {
        conference: {
          select: { createdById: true }
        }
      }
    });

    if (!category) {
      res.status(404).json({ message: "Category not found" });
      return;
    }

    if (!isAdmin(req) && category.conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to update this category" });
      return;
    }

    // Validate required fields
    if (!name || name.trim().length === 0) {
      res.status(400).json({ message: "Category name is required" });
      return;
    }

    const updatedCategory = await prisma.category.update({
      where: { id: Number(id) },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || category.color,
        order: order !== undefined ? Number(order) : category.order
      },
      include: {
        _count: {
          select: {
            presentations: true,
            sections: true
          }
        }
      }
    });

    console.log(`[CATEGORY] Updated category ${id}: "${name}"`);
    res.json(updatedCategory);

  } catch (error: any) {
    console.error("Error updating category:", error);
    res.status(500).json({ 
      message: "Failed to update category", 
      error: error.message 
    });
  }
};

// DELETE /api/categories/:id - Delete category
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Verify category exists and user has permission
    const category = await prisma.category.findUnique({
      where: { id: Number(id) },
      include: {
        conference: {
          select: { createdById: true }
        },
        _count: {
          select: {
            presentations: true,
            sections: true
          }
        }
      }
    });

    if (!category) {
      res.status(404).json({ message: "Category not found" });
      return;
    }

    if (!isAdmin(req) && category.conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to delete this category" });
      return;
    }

    // Check if category has presentations or sections
    if (category._count.presentations > 0 || category._count.sections > 0) {
      res.status(400).json({ 
        message: "Cannot delete category that contains presentations or sections",
        presentationCount: category._count.presentations,
        sectionCount: category._count.sections
      });
      return;
    }

    await prisma.category.delete({
      where: { id: Number(id) }
    });

    console.log(`[CATEGORY] Deleted category ${id}`);
    res.json({ message: "Category deleted successfully" });

  } catch (error: any) {
    console.error("Error deleting category:", error);
    res.status(500).json({ 
      message: "Failed to delete category", 
      error: error.message 
    });
  }
};