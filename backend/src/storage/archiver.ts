/**
 * ZIP archive generator.
 * Creates downloadable archives from crawled content.
 */

import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { logger } from '../utils/logger.js';

export interface ArchiveResult {
    path: string;
    size: number;
    fileCount: number;
}

export interface ArchiveProgress {
    processedBytes: number;
    processedFiles: number;
    totalBytes: number;
    totalFiles: number;
}

/**
 * Create a ZIP archive from a directory.
 */
export async function createArchive(
    sourceDir: string,
    outputPath: string,
    onProgress?: (progress: ArchiveProgress) => void
): Promise<ArchiveResult> {
    return new Promise((resolve, reject) => {
        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', {
            zlib: { level: 6 }, // Balanced compression
        });

        let processedBytes = 0;
        let processedFiles = 0;
        let totalFiles = 0;

        // Count total files first
        function countFiles(dir: string): void {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    countFiles(path.join(dir, entry.name));
                } else {
                    totalFiles++;
                }
            }
        }

        try {
            countFiles(sourceDir);
        } catch (error) {
            reject(new Error(`Failed to count source files: ${error}`));
            return;
        }

        output.on('close', () => {
            const size = archive.pointer();
            logger.info('Archive created', {
                path: outputPath,
                size,
                fileCount: processedFiles
            });

            resolve({
                path: outputPath,
                size,
                fileCount: processedFiles,
            });
        });

        output.on('error', (err) => {
            logger.error('Archive output error', { error: err.message });
            reject(err);
        });

        archive.on('error', (err) => {
            logger.error('Archive error', { error: err.message });
            reject(err);
        });

        archive.on('entry', (entry) => {
            processedFiles++;
            processedBytes += entry.stats?.size || 0;

            if (onProgress && totalFiles > 0) {
                onProgress({
                    processedBytes,
                    processedFiles,
                    totalBytes: 0, // Not easily available beforehand
                    totalFiles,
                });
            }
        });

        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                logger.warn('Archive warning: file not found', { error: err.message });
            } else {
                reject(err);
            }
        });

        // Pipe archive to output
        archive.pipe(output);

        // Add directory contents
        archive.directory(sourceDir, false);

        // Finalize
        archive.finalize();
    });
}

/**
 * Get the size of an archive.
 */
export async function getArchiveSize(archivePath: string): Promise<number> {
    const stats = await fs.promises.stat(archivePath);
    return stats.size;
}

/**
 * Delete an archive.
 */
export async function deleteArchive(archivePath: string): Promise<void> {
    try {
        await fs.promises.unlink(archivePath);
        logger.debug('Deleted archive', { path: archivePath });
    } catch (error) {
        logger.warn('Failed to delete archive', {
            path: archivePath,
            error: String(error)
        });
    }
}

export default {
    createArchive,
    getArchiveSize,
    deleteArchive,
};
