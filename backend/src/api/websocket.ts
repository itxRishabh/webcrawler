/**
 * WebSocket handler for real-time job progress updates.
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { jobManager, Job } from '../jobs/manager.js';
import { logger } from '../utils/logger.js';

interface WSClient {
    ws: WebSocket;
    subscribedJobs: Set<string>;
}

export class WebSocketHandler {
    private wss: WebSocketServer;
    private clients: Set<WSClient> = new Set();

    constructor(server: Server) {
        this.wss = new WebSocketServer({
            server,
            path: '/ws',
        });

        this.setupEventHandlers();
        this.setupJobManagerListeners();

        logger.info('WebSocket server initialized');
    }

    private setupEventHandlers(): void {
        this.wss.on('connection', (ws) => {
            const client: WSClient = {
                ws,
                subscribedJobs: new Set(),
            };

            this.clients.add(client);
            logger.debug('WebSocket client connected', { clients: this.clients.size });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleMessage(client, message);
                } catch (error) {
                    logger.warn('Invalid WebSocket message', { error: String(error) });
                }
            });

            ws.on('close', () => {
                this.clients.delete(client);
                logger.debug('WebSocket client disconnected', { clients: this.clients.size });
            });

            ws.on('error', (error) => {
                logger.error('WebSocket error', { error: error.message });
                this.clients.delete(client);
            });

            // Send initial connection acknowledgment
            this.send(ws, {
                type: 'connected',
                timestamp: Date.now(),
            });
        });
    }

    private handleMessage(client: WSClient, message: { type: string; jobId?: string }): void {
        switch (message.type) {
            case 'subscribe':
                if (message.jobId) {
                    client.subscribedJobs.add(message.jobId);
                    logger.debug('Client subscribed to job', { jobId: message.jobId });

                    // Send current job state
                    const job = jobManager.getJob(message.jobId);
                    if (job) {
                        this.send(client.ws, {
                            type: 'job:status',
                            jobId: job.id,
                            status: job.status,
                            progress: job.progress,
                        });
                    }
                }
                break;

            case 'unsubscribe':
                if (message.jobId) {
                    client.subscribedJobs.delete(message.jobId);
                    logger.debug('Client unsubscribed from job', { jobId: message.jobId });
                }
                break;

            case 'ping':
                this.send(client.ws, { type: 'pong', timestamp: Date.now() });
                break;
        }
    }

    private setupJobManagerListeners(): void {
        jobManager.on('jobProgress', (job: Job) => {
            this.broadcast(job.id, {
                type: 'job:progress',
                jobId: job.id,
                progress: job.progress,
            });
        });

        jobManager.on('jobComplete', (job: Job) => {
            this.broadcast(job.id, {
                type: 'job:complete',
                jobId: job.id,
                result: job.result ? {
                    success: job.result.success,
                    pagesProcessed: job.result.pagesProcessed,
                    assetsProcessed: job.result.assetsProcessed,
                    bytesDownloaded: job.result.bytesDownloaded,
                    errorCount: job.result.errors.length,
                    duration: job.result.duration,
                    hasArchive: !!job.archivePath,
                } : null,
            });
        });

        jobManager.on('jobFailed', (job: Job, error: Error) => {
            this.broadcast(job.id, {
                type: 'job:failed',
                jobId: job.id,
                error: error.message,
            });
        });

        jobManager.on('jobCancelled', (job: Job) => {
            this.broadcast(job.id, {
                type: 'job:cancelled',
                jobId: job.id,
            });
        });
    }

    private broadcast(jobId: string, message: object): void {
        for (const client of this.clients) {
            if (client.subscribedJobs.has(jobId) && client.ws.readyState === WebSocket.OPEN) {
                this.send(client.ws, message);
            }
        }
    }

    private send(ws: WebSocket, message: object): void {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    /**
     * Close all connections.
     */
    close(): void {
        for (const client of this.clients) {
            client.ws.close();
        }
        this.wss.close();
        logger.info('WebSocket server closed');
    }
}

export default WebSocketHandler;
