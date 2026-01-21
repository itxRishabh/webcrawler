/**
 * Website Copier Backend - Entry Point
 * Production-ready server with graceful shutdown.
 */

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import * as fs from 'fs';
import * as path from 'path';

import { config } from './config/index.js';
import { router as apiRouter } from './api/routes.js';
import { WebSocketHandler } from './api/websocket.js';
import { jobManager } from './jobs/manager.js';
import { logger } from './utils/logger.js';

// Create Express app
const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow preview of downloaded content
    crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
    origin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
    credentials: true,
}));

// Rate limiting - more lenient for development
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute (more lenient)
    message: {
        success: false,
        error: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for status checks and WebSocket
        return req.path.includes('/health') ||
            req.path.includes('/logs') ||
            req.path.includes('/preview');
    },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.debug(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
    });
    next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// API routes
app.use('/api', apiRouter);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });

    res.status(500).json({
        success: false,
        error: config.nodeEnv === 'development' ? err.message : 'Internal server error',
    });
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// 404 handler for API routes ONLY
app.use('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: 'Not found',
    });
});

// SPA Fallback - Serve index.html for all other routes
app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Create HTTP server
const server = createServer(app);

// Create WebSocket handler
const wsHandler = new WebSocketHandler(server);

// Ensure directories exist
function ensureDirectories(): void {
    const dirs = [config.jobsDir, config.tempDir];
    for (const dir of dirs) {
        const fullPath = path.resolve(dir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
            logger.info(`Created directory: ${fullPath}`);
        }
    }
}

// Graceful shutdown
let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`Received ${signal}, starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(() => {
        logger.info('HTTP server closed');
    });

    // Close WebSocket
    wsHandler.close();

    // Shutdown job manager
    await jobManager.shutdown();

    logger.info('Graceful shutdown complete');
    process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason: String(reason) });
});

// Start server
function start(): void {
    ensureDirectories();

    server.listen(config.port, () => {
        logger.info(`Server started`, {
            port: config.port,
            env: config.nodeEnv,
            pid: process.pid,
        });
        logger.info(`API: http://localhost:${config.port}/api`);
        logger.info(`WebSocket: ws://localhost:${config.port}/ws`);
    });
}

start();

export { app, server };
