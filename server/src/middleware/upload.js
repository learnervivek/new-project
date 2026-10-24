import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Helper to ensure target upload directory exists safely
function ensureDirectory(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err) {
    // Non-blocking in serverless environments where root filesystem is read-only
    console.warn(`[Upload] Notice: Could not create upload directory ${dirPath} (${err.message}).`);
  }
}

// Base upload directory (configurable via UPLOAD_DIR or defaults to ./uploads)
const baseUploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

const receiptsDir = path.join(baseUploadDir, 'receipts');
const avatarsDir = path.join(baseUploadDir, 'avatars');
const bannersDir = path.join(baseUploadDir, 'banners');

ensureDirectory(receiptsDir);
ensureDirectory(avatarsDir);
ensureDirectory(bannersDir);

// 1. Storage & filter for expense receipts
const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, receiptsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `receipt-${uniqueSuffix}${ext}`);
  },
});

const receiptFileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP, GIF) or PDFs are allowed for receipts'), false);
  }
};

export const receiptUpload = multer({
  storage: receiptStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: receiptFileFilter,
});

// 2. Storage & filter for user profile avatars
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

const imageOnlyFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed'), false);
  }
};

export const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageOnlyFilter,
});

// 3. Storage & filter for trip cover banners
const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, bannersDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `banner-${uniqueSuffix}${ext}`);
  },
});

export const bannerUpload = multer({
  storage: bannerStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: imageOnlyFilter,
});

export default {
  receiptUpload,
  avatarUpload,
  bannerUpload,
};
