import type{ Request, Response } from 'express';
import {Router} from 'express'
import path from 'path';
import fs from 'fs/promises';
import { spawnSync } from 'child_process';

const BACKEND_SECRET = process.env.BACKEND_SECRET!;
const TEMP_DIR = process.env.TEMP_DIR!;

const router = Router();

// /v1/jobs/:jobId
router.delete(
  '/:jobId',
  async (req: Request, res: Response) => {
    //auth
    const auth = req.header('Authorization') || '';
    if (auth !== `Bearer ${BACKEND_SECRET}`) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const jobId = req.params.jobId || '';
    const jobDir = path.join(TEMP_DIR, jobId);

    //delete the temp directory
    try {
      await fs.rm(jobDir, { recursive: true, force: true });
      return res.status(204).send();
    } catch (err) {
      console.error('Failed to delete job folder', jobId, err);
      return res.status(500).json({ error: 'Failed to delete job' });
    }
  }
);

export default router;
