import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { uploadProfilePicture } from '../middleware/upload.middleware';
import {
  getSettings,
  updateSettings,
  updateSection,
  changePassword,
  updateProfilePicture,
  testNotification,
  enable2FA,
  verify2FA,
  disable2FA,
  get2FABackupCodes,
  regenerate2FABackupCodes,
} from '../controllers/settings.controller';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Settings CRUD
router.get('/', getSettings);
router.put('/', updateSettings);
router.patch('/:section', updateSection);

// Security
router.post('/password', changePassword);
router.post('/profile-picture', uploadProfilePicture, updateProfilePicture);
router.post('/test-notification', testNotification);

// Two-Factor Authentication
router.post('/2fa/enable', enable2FA);
router.post('/2fa/verify', verify2FA);
router.post('/2fa/disable', disable2FA);
router.get('/2fa/backup-codes', get2FABackupCodes);
router.post('/2fa/regenerate-codes', regenerate2FABackupCodes);

export default router;