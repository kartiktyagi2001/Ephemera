import type { Request, Response, NextFunction } from 'express'
import {Router} from 'express'
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import { v4 as uuid } from 'uuid';

const BACKEND_SECRET = process.env.BACKEND_SECRET!;
const TEMP_DIR = process.env.TEMP_DIR!;

const router = Router()

// multer file writer (to write file to temp dir)
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // generate jobId if not provided
    const jobId = req.header('jobId') || uuid();
    req.headers.jobId = jobId;  //store jobId back on request
    const jobDir = path.join(TEMP_DIR, jobId);
    await fs.mkdir(jobDir, { recursive: true });
    cb(null, jobDir);
  },
  filename: (req, file, cb) => {
    // preserve original extension
    cb(null, `input${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 mb max, edge server has 10mb limit already
});

// v1/jobs - accept jobId header + file upload, spawn Docker, send anonymized data

router.post('/', Authenticate, upload.single('file'), GetFile)


function Authenticate(req: Request, res: Response, next: NextFunction){
    const auth = req.header('Authorization') || ''

    if(auth !== `Bearer ${BACKEND_SECRET}`){
        return res.status(403).json({error: "Imposters not allowed. No! No!"})
    }

    next()
}

async function GetFile(req: Request, res: Response, next: NextFunction){
    
    const jobId = req.header('jobId')
    const file = req.file

    if(!file){
        return res.status(400).json({error: "No file uploaded!"})
    }

    //setting response header
    res.setHeader('Content-Type', file.mimetype)    //download type

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="anonymized${path.extname(file.originalname)}"`
    );  //download file name

    //secure ephemeral container :)
    const docker = spawn('docker', [
        'run',  //run
        '--rm', //remove auto when exited
        '-i',   //interactive
        '--memory=512m',    //RAM usage max
        '--cpus=0.5',   //max CPU usage(half cores)
        '--network=none',   //container cnnot make connections to internet or other devices
        '--read-only',  //read only main file (container's main file)
        '--tmpfs', '/tmp:rw,noexec,nosuid,size=128m',   //temporary in-memory file in /temp inside container
        'datavault/processor:latest'    //image to create container
    ]);

    //o/p collection
    docker.stdout.pipe(res, { end: false });    //after sending data, donot auto-end connection.

    //err output
    let errorOutput = '';
    docker.stderr.on('data', (chunk) => {
        errorOutput = errorOutput+chunk.toString();
    });

    //uploaded file go into container
    try {
      const inputStream = await fs.readFile(file.path)
      docker.stdin.write(inputStream)
      docker.stdin.end()
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to read input file' })
      }
      return
    }

    //closing response manually
    docker.on('close', async(code)=>{
        if(code !== 0){
            res.write(JSON.stringify({
                error: 'Processing error',
                details: errorOutput || `Exited with code ${code}`
            }));
        }

        res.end();

        //job dir removal after job is done
        try{
            await fs.rm(path.dirname(file.path), { recursive: true, force: true });
        } catch(cleanupErr){
            console.error('Cleanup failed for job', jobId, cleanupErr);
        }
    })

    // docker or container errr
    docker.on('error', (err) => {
      console.error('Docker failed to start', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to launch container', details: err.message });
      }
    });
    
}
export default router
