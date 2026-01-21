/**
 * API client for the Website Copier backend.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

export interface CrawlOptions {
    url: string;
    scope?: 'same-domain' | 'same-host' | 'subdomains' | 'custom';
    unlimitedMode?: boolean;
    maxDepth?: number;
    maxPages?: number;
    maxFileSize?: number;
    maxTotalSize?: number;
    concurrency?: number;
    delayMs?: number;
    timeoutMs?: number;
    userAgent?: string;
    cookies?: string;
    respectRobotsTxt?: boolean;
    fileTypes?: {
        html?: boolean;
        css?: boolean;
        js?: boolean;
        images?: boolean;
        fonts?: boolean;
        media?: boolean;
        documents?: boolean;
        other?: boolean;
    };
    includePaths?: string[];
    excludePaths?: string[];
}

export interface Job {
    id: string;
    url: string;
    status: 'pending' | 'running' | 'paused' | 'complete' | 'failed' | 'cancelled';
    progress: JobProgress | null;
    createdAt: number;
    startedAt: number | null;
    completedAt: number | null;
    hasArchive: boolean;
    result: JobResult | null;
}

export interface JobProgress {
    status: string;
    pagesProcessed: number;
    totalPages: number;
    assetsProcessed: number;
    bytesDownloaded: number;
    currentUrl: string | null;
    errors: number;
    startedAt: number;
    elapsedMs: number;
    queueStats: {
        total: number;
        pending: number;
        inProgress: number;
        complete: number;
        failed: number;
        skipped: number;
    };
    storageStats: {
        filesWritten: number;
        totalBytes: number;
        directories: number;
    };
}

export interface JobResult {
    success: boolean;
    pagesProcessed: number;
    assetsProcessed: number;
    bytesDownloaded: number;
    errorCount: number;
    duration: number;
}

export interface JobLog {
    level: string;
    message: string;
    context?: Record<string, unknown>;
    timestamp: number;
}

export interface ApiResponse<T> {
    success: boolean;
    error?: string;
    job?: T;
    jobs?: T[];
    logs?: JobLog[];
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = API_URL) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    }

    async createJob(options: CrawlOptions): Promise<Job> {
        const response = await this.request<ApiResponse<Job>>('/api/jobs', {
            method: 'POST',
            body: JSON.stringify(options),
        });
        return response.job!;
    }

    async getJob(jobId: string): Promise<Job> {
        const response = await this.request<ApiResponse<Job>>(`/api/jobs/${jobId}`);
        return response.job!;
    }

    async startJob(jobId: string): Promise<Job> {
        const response = await this.request<ApiResponse<Job>>(
            `/api/jobs/${jobId}/start`,
            { method: 'POST' }
        );
        return response.job!;
    }

    async pauseJob(jobId: string): Promise<Job> {
        const response = await this.request<ApiResponse<Job>>(
            `/api/jobs/${jobId}/pause`,
            { method: 'POST' }
        );
        return response.job!;
    }

    async resumeJob(jobId: string): Promise<Job> {
        const response = await this.request<ApiResponse<Job>>(
            `/api/jobs/${jobId}/resume`,
            { method: 'POST' }
        );
        return response.job!;
    }

    async cancelJob(jobId: string): Promise<Job> {
        const response = await this.request<ApiResponse<Job>>(
            `/api/jobs/${jobId}/cancel`,
            { method: 'POST' }
        );
        return response.job!;
    }

    async deleteJob(jobId: string): Promise<void> {
        await this.request(`/api/jobs/${jobId}`, { method: 'DELETE' });
    }

    async getJobLogs(jobId: string, since?: number): Promise<JobLog[]> {
        const query = since ? `?since=${since}` : '';
        const response = await this.request<ApiResponse<Job>>(
            `/api/jobs/${jobId}/logs${query}`
        );
        return response.logs || [];
    }

    async getAllJobs(): Promise<Job[]> {
        const response = await this.request<ApiResponse<Job>>('/api/jobs');
        return response.jobs || [];
    }

    getDownloadUrl(jobId: string): string {
        return `${this.baseUrl}/api/jobs/${jobId}/download`;
    }

    getPreviewUrl(jobId: string, filePath: string = ''): string {
        return `${this.baseUrl}/api/jobs/${jobId}/preview/${filePath}`;
    }
}

export const api = new ApiClient();

// WebSocket connection helper
export class JobWebSocket {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private jobId: string;
    private onProgress: (progress: JobProgress) => void;
    private onComplete: (result: JobResult) => void;
    private onError: (error: string) => void;
    private onConnectionFailed?: () => void;

    constructor(
        jobId: string,
        callbacks: {
            onProgress: (progress: JobProgress) => void;
            onComplete: (result: JobResult) => void;
            onError: (error: string) => void;
            onConnectionFailed?: () => void;
        }
    ) {
        this.jobId = jobId;
        this.onProgress = callbacks.onProgress;
        this.onComplete = callbacks.onComplete;
        this.onError = callbacks.onError;
        this.onConnectionFailed = callbacks.onConnectionFailed;
    }

    connect(): void {
        this.ws = new WebSocket(`${WS_URL}/ws`);

        this.ws.onopen = () => {
            this.reconnectAttempts = 0;
            this.ws?.send(JSON.stringify({ type: 'subscribe', jobId: this.jobId }));
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                switch (message.type) {
                    case 'job:progress':
                        this.onProgress(message.progress);
                        break;
                    case 'job:complete':
                        this.onComplete(message.result);
                        break;
                    case 'job:failed':
                        this.onError(message.error);
                        break;
                    case 'job:cancelled':
                        this.onError('Job was cancelled');
                        break;
                }
            } catch {
                // Ignore parse errors
            }
        };

        this.ws.onclose = () => {
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
            } else {
                // WebSocket failed, trigger fallback
                this.onConnectionFailed?.();
            }
        };

        this.ws.onerror = () => {
            // Will trigger onclose
        };
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

// HTTP Polling fallback for when WebSocket doesn't work (shared hosting)
export class JobPoller {
    private intervalId: NodeJS.Timeout | null = null;
    private jobId: string;
    private onProgress: (progress: JobProgress) => void;
    private onComplete: (result: JobResult) => void;
    private onError: (error: string) => void;
    private pollInterval: number;

    constructor(
        jobId: string,
        callbacks: {
            onProgress: (progress: JobProgress) => void;
            onComplete: (result: JobResult) => void;
            onError: (error: string) => void;
        },
        pollInterval: number = 1500
    ) {
        this.jobId = jobId;
        this.onProgress = callbacks.onProgress;
        this.onComplete = callbacks.onComplete;
        this.onError = callbacks.onError;
        this.pollInterval = pollInterval;
    }

    start(): void {
        this.poll(); // Initial poll
        this.intervalId = setInterval(() => this.poll(), this.pollInterval);
    }

    private async poll(): Promise<void> {
        try {
            const job = await api.getJob(this.jobId);

            if (job.progress) {
                this.onProgress(job.progress);
            }

            if (job.status === 'complete' && job.result) {
                this.stop();
                this.onComplete(job.result);
            } else if (job.status === 'failed') {
                this.stop();
                this.onError('Job failed');
            } else if (job.status === 'cancelled') {
                this.stop();
                this.onError('Job was cancelled');
            }
        } catch (err) {
            // Don't stop on polling errors, just log
            console.error('Poll error:', err);
        }
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}

export default api;

