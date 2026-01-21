/**
 * API Routes.
 * REST endpoints for job management.
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { jobManager } from '../jobs/manager.js';
import { jobIdSchema } from '../security/validation.js';
import { logger } from '../utils/logger.js';

export const router = Router();

/**
 * Error handler wrapper.
 */
function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Create a new job.
 * POST /api/jobs
 */
router.post(
    '/jobs',
    asyncHandler(async (req: Request, res: Response) => {
        try {
            const job = jobManager.createJob(req.body);

            res.status(201).json({
                success: true,
                job: sanitizeJob(job),
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            res.status(400).json({
                success: false,
                error: message,
            });
        }
    })
);

/**
 * Get a job by ID.
 * GET /api/jobs/:id
 */
router.get(
    '/jobs/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        const parseResult = jobIdSchema.safeParse(id);
        if (!parseResult.success) {
            res.status(400).json({
                success: false,
                error: 'Invalid job ID format',
            });
            return;
        }

        const job = jobManager.getJob(id!);
        if (!job) {
            res.status(404).json({
                success: false,
                error: 'Job not found',
            });
            return;
        }

        res.json({
            success: true,
            job: sanitizeJob(job),
        });
    })
);

/**
 * Start a job.
 * POST /api/jobs/:id/start
 */
router.post(
    '/jobs/:id/start',
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        const parseResult = jobIdSchema.safeParse(id);
        if (!parseResult.success) {
            res.status(400).json({
                success: false,
                error: 'Invalid job ID format',
            });
            return;
        }

        try {
            await jobManager.startJob(id!);
            const job = jobManager.getJob(id!);

            res.json({
                success: true,
                job: job ? sanitizeJob(job) : null,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            res.status(400).json({
                success: false,
                error: message,
            });
        }
    })
);

/**
 * Pause a job.
 * POST /api/jobs/:id/pause
 */
router.post(
    '/jobs/:id/pause',
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        try {
            jobManager.pauseJob(id!);
            const job = jobManager.getJob(id!);

            res.json({
                success: true,
                job: job ? sanitizeJob(job) : null,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            res.status(400).json({
                success: false,
                error: message,
            });
        }
    })
);

/**
 * Resume a job.
 * POST /api/jobs/:id/resume
 */
router.post(
    '/jobs/:id/resume',
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        try {
            jobManager.resumeJob(id!);
            const job = jobManager.getJob(id!);

            res.json({
                success: true,
                job: job ? sanitizeJob(job) : null,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            res.status(400).json({
                success: false,
                error: message,
            });
        }
    })
);

/**
 * Cancel a job.
 * POST /api/jobs/:id/cancel
 */
router.post(
    '/jobs/:id/cancel',
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        try {
            jobManager.cancelJob(id!);
            const job = jobManager.getJob(id!);

            res.json({
                success: true,
                job: job ? sanitizeJob(job) : null,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            res.status(400).json({
                success: false,
                error: message,
            });
        }
    })
);

/**
 * Get job logs.
 * GET /api/jobs/:id/logs
 */
router.get(
    '/jobs/:id/logs',
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const since = req.query['since'] ? parseInt(req.query['since'] as string, 10) : undefined;

        const logs = jobManager.getJobLogs(id!, since);

        res.json({
            success: true,
            logs,
        });
    })
);

/**
 * Download job archive.
 * GET /api/jobs/:id/download
 */
router.get(
    '/jobs/:id/download',
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        const archivePath = jobManager.getArchivePath(id!);
        if (!archivePath) {
            res.status(404).json({
                success: false,
                error: 'Archive not available',
            });
            return;
        }

        try {
            await fs.access(archivePath);

            const job = jobManager.getJob(id!);
            const filename = job ?
                `website-copy-${new URL(job.url).hostname}-${id!.slice(0, 8)}.zip` :
                `website-copy-${id!.slice(0, 8)}.zip`;

            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

            const { createReadStream } = await import('fs');
            const stream = createReadStream(archivePath);
            stream.pipe(res);
        } catch {
            res.status(404).json({
                success: false,
                error: 'Archive file not found',
            });
        }
    })
);

/**
 * Preview a file from the job.
 * GET /api/jobs/:id/preview/*
 */
router.get(
    '/jobs/:id/preview/*',
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const filePath = req.params[0] || 'index.html';

        const storage = jobManager.getJobStorage(id!);
        if (!storage) {
            res.status(404).json({
                success: false,
                error: 'Job storage not available',
            });
            return;
        }

        try {
            const content = await storage.readFile(filePath);

            // Determine content type
            const ext = path.extname(filePath).toLowerCase();
            const contentTypes: Record<string, string> = {
                '.html': 'text/html',
                '.htm': 'text/html',
                '.css': 'text/css',
                '.js': 'application/javascript',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.webp': 'image/webp',
                '.ico': 'image/x-icon',
                '.woff': 'font/woff',
                '.woff2': 'font/woff2',
                '.ttf': 'font/ttf',
                '.pdf': 'application/pdf',
            };

            res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
            res.send(content);
        } catch {
            res.status(404).json({
                success: false,
                error: 'File not found',
            });
        }
    })
);

/**
 * Delete a job.
 * DELETE /api/jobs/:id
 */
router.delete(
    '/jobs/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        await jobManager.deleteJob(id!);

        res.json({
            success: true,
            message: 'Job deleted',
        });
    })
);

/**
 * List all jobs.
 * GET /api/jobs
 */
router.get(
    '/jobs',
    asyncHandler(async (_req: Request, res: Response) => {
        const jobs = jobManager.getAllJobs();

        res.json({
            success: true,
            jobs: jobs.map(sanitizeJob),
        });
    })
);

/**
 * Sanitize job object for API response.
 */
function sanitizeJob(job: ReturnType<typeof jobManager.getJob>) {
    if (!job) return null;

    return {
        id: job.id,
        url: job.url,
        status: job.status,
        progress: job.progress,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        hasArchive: !!job.archivePath,
        result: job.result ? {
            success: job.result.success,
            pagesProcessed: job.result.pagesProcessed,
            assetsProcessed: job.result.assetsProcessed,
            bytesDownloaded: job.result.bytesDownloaded,
            errorCount: job.result.errors.length,
            duration: job.result.duration,
        } : null,
    };
}

export default router;
