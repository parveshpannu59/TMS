import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage to save files to disk
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `profile-${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Single file upload middleware for profile pictures
export const uploadProfilePicture = upload.single('profilePicture');

// Document upload (BOL, POD, odometer) - images and PDFs
const documentsDir = path.join(process.cwd(), 'uploads', 'documents');
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
}

const documentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, documentsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg');
    cb(null, `doc-${uniqueSuffix}${ext}`);
  },
});

const documentFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
  if (file.mimetype && allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images (JPEG, PNG, GIF, WebP) and PDF are allowed'));
  }
};

export const uploadDocument = multer({
  storage: documentStorage,
  fileFilter: documentFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB (compress PDFs if larger)
}).single('file');

// Driver documents upload (photo, license, aadhar, pan, etc)
const driverDocsDir = path.join(process.cwd(), 'uploads', 'drivers');
if (!fs.existsSync(driverDocsDir)) {
  fs.mkdirSync(driverDocsDir, { recursive: true });
}

const driverDocStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, driverDocsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg');
    cb(null, `driver-${uniqueSuffix}${ext}`);
  },
});

export const uploadDriverDocument = multer({
  storage: driverDocStorage,
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single('file');

// Vehicle images upload
const vehicleImagesDir = path.join(process.cwd(), 'uploads', 'vehicles');
if (!fs.existsSync(vehicleImagesDir)) {
  fs.mkdirSync(vehicleImagesDir, { recursive: true });
}

const vehicleImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, vehicleImagesDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `vehicle-${uniqueSuffix}${ext}`);
  },
});

export const uploadVehicleImage = multer({
  storage: vehicleImageStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single('image');

export const uploadVehicleDocument = multer({
  storage: vehicleImageStorage,
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single('file');

// Load/Cargo images upload
const loadImagesDir = path.join(process.cwd(), 'uploads', 'loads');
if (!fs.existsSync(loadImagesDir)) {
  fs.mkdirSync(loadImagesDir, { recursive: true });
}

const loadImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, loadImagesDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `load-${uniqueSuffix}${ext}`);
  },
});

export const uploadLoadImage = multer({
  storage: loadImageStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single('image');
