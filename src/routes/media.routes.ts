import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import mediaService from '../services/media.service';

const router = Router();
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);
const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.mp4',
  '.mov',
  '.webm',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeAllowed = ALLOWED_MIME_TYPES.has(file.mimetype);
    const extAllowed = ALLOWED_EXTENSIONS.has(ext);
    if (!mimeAllowed || !extAllowed) {
      cb(new Error('Unsupported file type'));
      return;
    }
    cb(null, true);
  },
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB per file
});

/**
 * POST /api/media/upload
 * multipart/form-data: files (multiple), workspaceId
 */
router.post(
  '/upload',
  upload.array('files', 10),
  async (req: Request, res: Response) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { workspaceId } = req.body;
      if (!workspaceId) {
        return res.status(400).json({ error: 'workspaceId is required' });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
      }

      const results = await Promise.all(
        files.map(file => mediaService.uploadMedia(file, workspaceId, req.userId!)),
      );

      return res.status(201).json({ media: results });
    } catch (err: any) {
      const status =
        err.code === 'VALIDATION_ERROR' || err.message === 'Unsupported file type' ? 400 : 500;
      return res.status(status).json({ error: err.message || 'Upload failed' });
    }
  },
);

/**
 * DELETE /api/media/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await mediaService.deleteMedia(req.params.id, req.userId);
    return res.status(200).json({ success: true });
  } catch (err: any) {
    const statusMap: Record<string, number> = {
      NOT_FOUND: 404,
      FORBIDDEN: 403,
    };
    const status = statusMap[err.code] || 500;
    return res.status(status).json({ error: err.message || 'Delete failed' });
  }
});

export default router;
