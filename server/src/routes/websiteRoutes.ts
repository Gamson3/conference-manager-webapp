import express from 'express';
import {
  listMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getVisibilitySettings,
  updateVisibilitySettings,
  getPublicPageContent,
  updatePublicPageContent,
} from '../controllers/websiteControllers';
import { authMiddleware } from '../middleware/authMiddleware';
import { optionalAuthMiddleware } from '../middleware/optionalAuthMiddleware';

const router = express.Router();

// ============================================================================
// MATERIALS ROUTES
// ============================================================================

// List materials - public can see public materials, organizer sees all
router.get('/conferences/:id/materials', optionalAuthMiddleware, listMaterials);

// CRUD for materials - organizer/admin only
router.post('/conferences/:id/materials', authMiddleware(['organizer', 'admin']), createMaterial);
router.put('/conferences/:id/materials/:materialId', authMiddleware(['organizer', 'admin']), updateMaterial);
router.delete('/conferences/:id/materials/:materialId', authMiddleware(['organizer', 'admin']), deleteMaterial);

// ============================================================================
// VISIBILITY ROUTES
// ============================================================================

// Get/Update visibility settings - organizer/admin only
router.get('/conferences/:id/visibility', authMiddleware(['organizer', 'admin']), getVisibilitySettings);
router.put('/conferences/:id/visibility', authMiddleware(['organizer', 'admin']), updateVisibilitySettings);

// ============================================================================
// PUBLIC PAGE ROUTES
// ============================================================================

// Get public page content - public access (for preview)
router.get('/conferences/:id/public-page', optionalAuthMiddleware, getPublicPageContent);

// Update public page content - organizer/admin only
router.put('/conferences/:id/public-page', authMiddleware(['organizer', 'admin']), updatePublicPageContent);

export default router;
