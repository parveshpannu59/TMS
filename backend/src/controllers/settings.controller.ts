import { Request, Response } from 'express';
import Settings from '../models/Setting.model';
import { User } from '../models/User.model';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import bcrypt from 'bcryptjs';
// @ts-ignore - nodemailer types issue
import nodemailer from 'nodemailer';
// @ts-ignore - twilio types issue  
import twilio from 'twilio';
// @ts-ignore - speakeasy types issue
import speakeasy from 'speakeasy';
// @ts-ignore - qrcode types issue
import QRCode from 'qrcode';
import { createNotification } from '../utils/notificationHelper';
import { NotificationType, NotificationPriority } from '../models/Notification';
import { twoFactorStore } from '../utils/twoFactorStore';

/**
 * @desc Get user settings
 * @route GET /api/settings
 * @access Private
 */
export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const companyId = req.user?.companyId;

  if (!userId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  let settings = await Settings.findOne({ userId });

  // If no settings exist, create default settings
  if (!settings) {
    const defaultSettings: any = {
      userId,
      theme: 'light',
      language: 'en',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      loadUpdates: true,
      driverUpdates: true,
      maintenanceReminders: true,
      invoiceReminders: true,
      autoAssignment: false,
      requireLoadApproval: true,
      enableGPSTracking: false,
      defaultCurrency: 'USD',
      timezone: 'America/New_York',
      measurementUnit: 'imperial',
      twoFactorEnabled: false,
      sessionTimeout: 30,
      passwordExpiry: 90,
    };

    // Only include companyId if it exists
    if (companyId) {
      defaultSettings.companyId = companyId;
    }

    settings = new Settings(defaultSettings);
    await settings.save();
  }

  res.json({
    success: true,
    message: 'Settings retrieved successfully',
    data: settings,
  });
});

/**
 * @desc Update all settings
 * @route PUT /api/settings
 * @access Private
 */
export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const companyId = req.user?.companyId;

  // Get old settings for comparison
  const oldSettings = await Settings.findOne({ userId });

  const settings = await Settings.findOneAndUpdate(
    { userId },
    { $set: { ...req.body, companyId } },
    { new: true, upsert: true }
  );

  // Create notification for important setting changes
  if (companyId) {
    const changedSettings: string[] = [];
    
    if (oldSettings?.autoAssignment !== settings.autoAssignment) {
      changedSettings.push(`Auto Assignment ${settings.autoAssignment ? 'enabled' : 'disabled'}`);
    }
    if (oldSettings?.enableGPSTracking !== settings.enableGPSTracking) {
      changedSettings.push(`GPS Tracking ${settings.enableGPSTracking ? 'enabled' : 'disabled'}`);
    }
    if (oldSettings?.requireLoadApproval !== settings.requireLoadApproval) {
      changedSettings.push(`Load Approval ${settings.requireLoadApproval ? 'required' : 'not required'}`);
    }

    if (changedSettings.length > 0) {
      await createNotification({
        companyId,
        userId,
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Settings Updated',
        message: `System settings updated: ${changedSettings.join(', ')}`,
        metadata: {
          settingsChanged: changedSettings,
        },
      });
    }
  }

  res.json({
    success: true,
    message: 'Settings updated successfully',
    data: settings,
  });
});

/**
 * @desc Update specific section
 * @route PATCH /api/settings/:section
 * @access Private
 */
export const updateSection = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const companyId = req.user?.companyId;
  const { section } = req.params;

  if (!userId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  // Validate section
  const validSections = ['appearance', 'notifications', 'company', 'system', 'security'];
  const sectionStr = Array.isArray(section) ? section[0] : section;
  if (!sectionStr || !validSections.includes(sectionStr)) {
    throw ApiError.badRequest('Invalid section');
  }

  const settings = await Settings.findOneAndUpdate(
    { userId },
    { $set: { ...req.body, companyId } },
    { new: true, upsert: true }
  );

  // Send notification for critical section updates
  if (companyId && ['system', 'security'].includes(sectionStr)) {
    await createNotification({
      companyId,
      userId,
      type: NotificationType.INFO,
      priority: NotificationPriority.LOW,
      title: `${sectionStr.charAt(0).toUpperCase() + sectionStr.slice(1)} Settings Updated`,
      message: `Your ${sectionStr} settings have been updated successfully`,
      metadata: {
        section: sectionStr,
        updatedFields: Object.keys(req.body),
      },
    });
  }

  res.json({
    success: true,
    message: `${sectionStr.charAt(0).toUpperCase() + sectionStr.slice(1)} settings updated successfully`,
    data: settings,
  });
});

/**
 * @desc Change password
 * @route POST /api/settings/password
 * @access Private
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const companyId = req.user?.companyId;
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // Validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    throw ApiError.badRequest('All password fields are required');
  }

  if (newPassword.length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters');
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
    throw ApiError.badRequest('Password must contain uppercase, lowercase, and number');
  }

  if (newPassword !== confirmPassword) {
    throw ApiError.badRequest('Passwords do not match');
  }

  // Get user
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw ApiError.badRequest('Current password is incorrect');
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();

  // Send notification
  if (companyId) {
    await createNotification({
      companyId,
      userId,
      type: NotificationType.SUCCESS,
      priority: NotificationPriority.MEDIUM,
      title: 'Password Changed',
      message: 'Your password has been changed successfully. If this wasn\'t you, please contact support immediately.',
      metadata: {
        action: 'password_change',
        timestamp: new Date(),
      },
    });
  }

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
});

/**
 * @desc Upload profile picture
 * @route POST /api/settings/profile-picture
 * @access Private
 */
export const updateProfilePicture = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  if (!req.file) {
    throw ApiError.badRequest('No file uploaded');
  }

  const file = req.file;

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!file.mimetype || !allowedTypes.includes(file.mimetype)) {
    throw ApiError.badRequest('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed');
  }

  // Validate file size (5MB) - already handled by multer, but double-check
  if (file.size && file.size > 5 * 1024 * 1024) {
    throw ApiError.badRequest('File too large. Maximum size is 5MB');
  }

  // File is already saved to disk by multer
  // Get the filename from the saved file
  const uploadedUrl = `/uploads/profiles/${file.filename}`;

  // Update user profile
  await User.findByIdAndUpdate(userId, {
    profilePicture: uploadedUrl,
  });

  res.json({
    success: true,
    message: 'Profile picture updated successfully',
    data: { url: uploadedUrl },
  });
});

/**
 * @desc Test notification
 * @route POST /api/settings/test-notification
 * @access Private
 */
export const testNotification = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const companyId = req.user?.companyId;
  const { type } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  switch (type) {
    case 'email':
      // Send test email
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw ApiError.badRequest('Email service not configured. Please configure SMTP settings.');
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: user.email,
        subject: 'Test Email Notification - TMS',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1976d2;">Test Email Notification</h2>
            <p>Hi ${user.name},</p>
            <p>This is a test email notification from your Transportation Management System.</p>
            <p>If you received this email, your email notifications are working correctly.</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
            <p style="color: #666; font-size: 12px;">
              This is an automated message from TMS. Please do not reply to this email.
            </p>
          </div>
        `,
      });
      break;

    case 'sms':
      // Send test SMS (requires Twilio setup)
      if (user.phone && process.env.TWILIO_ACCOUNT_SID) {
        const twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );

        await twilioClient.messages.create({
          body: `Test SMS from TMS: Hi ${user.name}, your SMS notifications are working correctly!`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: user.phone,
        });
      } else {
        throw ApiError.badRequest('Phone number not configured or Twilio not set up');
      }
      break;

    case 'push':
      // Create in-app notification
      if (companyId) {
        await createNotification({
          companyId,
          userId,
          type: NotificationType.INFO,
          priority: NotificationPriority.LOW,
          title: 'Test Push Notification',
          message: 'This is a test push notification. Your push notifications are working correctly!',
          metadata: {
            testNotification: true,
          },
        });
      }
      break;

    default:
      throw ApiError.badRequest('Invalid notification type');
  }

  res.json({
    success: true,
    message: `Test ${type} notification sent successfully`,
  });
});

/**
 * @desc Enable 2FA
 * @route POST /api/settings/2fa/enable
 * @access Private
 */
export const enable2FA = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `TMS (${user.email})`,
    issuer: 'TMS',
  });

  // Generate QR code
  const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

  // Generate backup codes
  const backupCodes = Array.from({ length: 10 }, () =>
    Math.random().toString(36).substring(2, 10).toUpperCase()
  );

  // Store temporary secret (don't save to user until verified)
  twoFactorStore.set(userId, secret.base32, backupCodes);

  res.json({
    success: true,
    message: '2FA setup initiated. Please verify with authenticator app.',
    data: {
      secret: secret.base32,
      qrCode,
      backupCodes,
    },
  });
});

/**
 * @desc Verify and activate 2FA
 * @route POST /api/settings/2fa/verify
 * @access Private
 */
export const verify2FA = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const companyId = req.user?.companyId;

  if (!userId) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const { code } = req.body;

  const tempData = twoFactorStore.get(userId);
  if (!tempData) {
    throw ApiError.badRequest('No 2FA setup in progress or setup expired');
  }

  // Verify code
  const verified = speakeasy.totp.verify({
    secret: tempData.secret,
    encoding: 'base32',
    token: code,
    window: 2,
  });

  if (!verified) {
    throw ApiError.badRequest('Invalid verification code');
  }

  // Save to user
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  (user as any).twoFactorSecret = tempData.secret;
  (user as any).twoFactorEnabled = true;
  (user as any).twoFactorBackupCodes = tempData.backupCodes;
  await user.save();

  // Update settings
  await Settings.findOneAndUpdate(
    { userId },
    { twoFactorEnabled: true }
  );

  // Clear temporary data
  twoFactorStore.delete(userId);

  // Send notification
  if (companyId) {
    await createNotification({
      companyId,
      userId,
      type: NotificationType.SUCCESS,
      priority: NotificationPriority.HIGH,
      title: 'Two-Factor Authentication Enabled',
      message: '2FA has been enabled for your account. Your account security has been enhanced.',
      metadata: {
        action: '2fa_enabled',
        timestamp: new Date(),
      },
    });
  }

  res.json({
    success: true,
    message: '2FA enabled successfully',
  });
});

/**
 * @desc Disable 2FA
 * @route POST /api/settings/2fa/disable
 * @access Private
 */
export const disable2FA = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const companyId = req.user?.companyId;
  const { password } = req.body;

  if (!password) {
    throw ApiError.badRequest('Password is required to disable 2FA');
  }

  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Verify password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw ApiError.badRequest('Incorrect password');
  }

  (user as any).twoFactorEnabled = false;
  (user as any).twoFactorSecret = undefined;
  (user as any).twoFactorBackupCodes = [];
  await user.save();

  await Settings.findOneAndUpdate(
    { userId },
    { twoFactorEnabled: false }
  );

  // Send notification
  if (companyId) {
    await createNotification({
      companyId,
      userId,
      type: NotificationType.WARNING,
      priority: NotificationPriority.HIGH,
      title: 'Two-Factor Authentication Disabled',
      message: '2FA has been disabled for your account. If this wasn\'t you, please contact support immediately.',
      metadata: {
        action: '2fa_disabled',
        timestamp: new Date(),
      },
    });
  }

  res.json({
    success: true,
    message: '2FA disabled successfully',
  });
});

/**
 * @desc Get 2FA backup codes
 * @route GET /api/settings/2fa/backup-codes
 * @access Private
 */
export const get2FABackupCodes = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (!(user as any).twoFactorEnabled) {
    throw ApiError.badRequest('2FA is not enabled');
  }

  res.json({
    success: true,
    message: 'Backup codes retrieved successfully',
    data: { codes: (user as any).twoFactorBackupCodes || [] },
  });
});

/**
 * @desc Regenerate 2FA backup codes
 * @route POST /api/settings/2fa/regenerate-codes
 * @access Private
 */
export const regenerate2FABackupCodes = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const companyId = req.user?.companyId;
  const { password } = req.body;

  if (!password) {
    throw ApiError.badRequest('Password is required');
  }

  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (!(user as any).twoFactorEnabled) {
    throw ApiError.badRequest('2FA is not enabled');
  }

  // Verify password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw ApiError.badRequest('Incorrect password');
  }

  // Generate new backup codes
  const backupCodes = Array.from({ length: 10 }, () =>
    Math.random().toString(36).substring(2, 10).toUpperCase()
  );

  (user as any).twoFactorBackupCodes = backupCodes;
  await user.save();

  // Send notification
  if (companyId) {
    await createNotification({
      companyId,
      userId,
      type: NotificationType.INFO,
      priority: NotificationPriority.MEDIUM,
      title: '2FA Backup Codes Regenerated',
      message: 'New backup codes have been generated for your account. Old codes are no longer valid.',
      metadata: {
        action: '2fa_codes_regenerated',
        timestamp: new Date(),
      },
    });
  }

  res.json({
    success: true,
    message: 'Backup codes regenerated successfully',
    data: { codes: backupCodes },
  });
});