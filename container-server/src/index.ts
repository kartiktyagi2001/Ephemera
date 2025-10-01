import express from 'express';
import  type { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from  'helmet'
import morgan from "morgan"
import dotenv from "dotenv"
import path from 'path'

import jobRoutes from './routes/jobs';
import outputRoutes from './routes/output';
import deleteRoutes from './routes/delete';

dotenv.config()

const app = express()

const port = process.env.PORT;

app.use(helmet())   //someone suggested to use it
app.use(cors({
  origin: '*',
  methods: ['GET','POST','DELETE'],
}))
app.use(morgan('dev'))  //to log requests
app.use(express.json());

const { PORT, BACKEND_SECRET, TEMP_DIR } = process.env;

//test log
if (!PORT) throw new Error('Missing PORT in .env');
if (!BACKEND_SECRET) throw new Error('Missing BACKEND_SECRET in .env');
if (!TEMP_DIR) throw new Error('Missing TEMP_DIR in .env');

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

//health route
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    port: PORT,
  });
});

app.use('/v1/jobs', jobRoutes);
app.use('/v1/jobs', outputRoutes);
app.use('/v1/jobs', deleteRoutes);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(port, () => {
  console.log(`Container server listening on port ${port}`);
  console.log(`Temporary directory: ${path.resolve(TEMP_DIR)}`);
});
