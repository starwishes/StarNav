import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { systemController } from '../controllers/systemController.js';
import { toolController } from '../controllers/toolController.js';

const router = express.Router();

// System & Settings
router.get('/health', systemController.getHealth);
router.get('/settings', systemController.getPublicSettings);

// Admin Settings (Protected)
router.get('/admin/settings', authenticate, requireAdmin, systemController.getAdminSettings);
router.post('/admin/settings', authenticate, requireAdmin, systemController.updateAdminSettings);

// Background Management (Protected)
router.post('/set-background', authenticate, requireAdmin, systemController.setBackground);
router.post('/upload-background', authenticate, requireAdmin, systemController.uploadBackground);
router.get('/uploads', authenticate, requireAdmin, systemController.getUploads);
router.delete('/uploads/:filename', authenticate, requireAdmin, systemController.deleteUpload);

// Tools
router.get('/favicon', toolController.getFavicon);
router.get('/suggest', toolController.getSuggestions);
// Check Links requires Login but not necessarily Admin? Assuming just Authenticate for now as per original.
router.post('/check-links', authenticate, toolController.checkLinks);

export default router;
