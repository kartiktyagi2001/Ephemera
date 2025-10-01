import { Router,type Request,type Response } from 'express';
import path from 'path';
import fs from 'fs/promises';

const BACKEND_SECRET = process.env.BACKEND_SECRET!;
const TEMP_DIR = process.env.TEMP_DIR!;

const router = Router();

// /v1/jobs/:jobId/output
router.get(
  '/:jobId/output',
  (req: Request, res: Response) => {
    //auth
    const auth = req.header('Authorization') || '';
    if (auth !== `Bearer ${BACKEND_SECRET}`) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // resolve output file path
    const jobId = req.params.jobId || '';
    const jobDir = path.join(TEMP_DIR, jobId);
    const outputFileCsv = path.join(jobDir, 'output.csv');
    const outputFileJson = path.join(jobDir, 'output.json');

    //serve whichever exist
    fs.access(outputFileCsv)
      .then(() => {
        res.setHeader('Content-Type', 'text/csv');
        res.sendFile(outputFileCsv);
      })
      .catch(() =>
        fs.access(outputFileJson)
          .then(() => {
            res.setHeader('Content-Type', 'application/json');
            res.sendFile(outputFileJson);
          })
          .catch(() => {
            res.status(404).json({ error: 'Output not found' });
          })
      );
  }
);

export default router;
