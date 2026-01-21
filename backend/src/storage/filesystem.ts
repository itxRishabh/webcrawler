/**
 * Filesystem storage manager.
 * Handles writing crawled content to disk with proper structure.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { config } from '../config/index.js';
import { isPathWithinBase } from '../security/validation.js';
import { logger } from '../utils/logger.js';

export interface StorageStats {
    filesWritten: number;
    totalBytes: number;
    directories: number;
}

export class FileStorage {
    private baseDir: string;
    private stats: StorageStats = {
        filesWritten: 0,
        totalBytes: 0,
        directories: 0,
    };
    private createdDirs: Set<string> = new Set();

    constructor(jobId: string) {
        this.baseDir = path.resolve(config.jobsDir, jobId);
    }

    /**
     * Initialize the storage directory.
     */
    async init(): Promise<void> {
        try {
            await fs.mkdir(this.baseDir, { recursive: true });
            this.createdDirs.add(this.baseDir);
            logger.debug('Created job directory', { dir: this.baseDir });
        } catch (error) {
            throw new Error(`Failed to create job directory: ${error}`);
        }
    }

    /**
     * Write content to a file.
     */
    async writeFile(relativePath: string, content: Buffer | string): Promise<void> {
        const fullPath = path.join(this.baseDir, relativePath);

        // Security check: ensure path is within base directory
        if (!isPathWithinBase(this.baseDir, fullPath)) {
            throw new Error(`Path traversal attempt detected: ${relativePath}`);
        }

        // Check total size limit
        const contentSize = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content);
        if (this.stats.totalBytes + contentSize > config.maxTotalSizeBytes) {
            throw new Error(`Total size limit exceeded (${config.maxTotalSizeBytes} bytes)`);
        }

        // Create directory if needed
        const dir = path.dirname(fullPath);
        if (!this.createdDirs.has(dir)) {
            await fs.mkdir(dir, { recursive: true });
            this.createdDirs.add(dir);
            this.stats.directories++;
        }

        // Write file
        await fs.writeFile(fullPath, content);

        this.stats.filesWritten++;
        this.stats.totalBytes += contentSize;

        logger.debug('Wrote file', {
            path: relativePath,
            size: contentSize,
            totalSize: this.stats.totalBytes,
        });
    }

    /**
     * Read a file.
     */
    async readFile(relativePath: string): Promise<Buffer> {
        const fullPath = path.join(this.baseDir, relativePath);

        if (!isPathWithinBase(this.baseDir, fullPath)) {
            throw new Error(`Path traversal attempt detected: ${relativePath}`);
        }

        return fs.readFile(fullPath);
    }

    /**
     * Check if a file exists.
     */
    async exists(relativePath: string): Promise<boolean> {
        const fullPath = path.join(this.baseDir, relativePath);

        if (!isPathWithinBase(this.baseDir, fullPath)) {
            return false;
        }

        try {
            await fs.access(fullPath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get the base directory path.
     */
    getBaseDir(): string {
        return this.baseDir;
    }

    /**
     * Get storage statistics.
     */
    getStats(): StorageStats {
        return { ...this.stats };
    }

    /**
     * Get all files in the storage.
     */
    async listFiles(): Promise<string[]> {
        const files: string[] = [];

        async function walkDir(dir: string, basePath: string): Promise<void> {
            const entries = await fs.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                const relativePath = path.join(basePath, entry.name);

                if (entry.isDirectory()) {
                    await walkDir(fullPath, relativePath);
                } else {
                    files.push(relativePath);
                }
            }
        }

        await walkDir(this.baseDir, '');
        return files;
    }

    /**
     * Delete all files in the storage.
     */
    async cleanup(): Promise<void> {
        try {
            await fs.rm(this.baseDir, { recursive: true, force: true });
            logger.info('Cleaned up job directory', { dir: this.baseDir });
        } catch (error) {
            logger.error('Failed to cleanup job directory', {
                dir: this.baseDir,
                error: String(error)
            });
        }
    }
}

export default FileStorage;
