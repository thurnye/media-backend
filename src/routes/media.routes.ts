import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import mediaService from '../services/media.service';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve('uploads'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB hard cap
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
      const status = err.code === 'VALIDATION_ERROR' ? 400 : 500;
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
