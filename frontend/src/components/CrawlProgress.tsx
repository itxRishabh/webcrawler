'use client';

import {
    Pause,
    Play,
    X,
    Clock,
    FileText,
    Image,
    HardDrive,
    AlertCircle,
    Loader2
} from 'lucide-react';
import type { JobProgress } from '@/lib/api';

interface CrawlProgressProps {
    progress: JobProgress;
    onPause?: () => void;
    onResume?: () => void;
    onCancel?: () => void;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
}

export default function CrawlProgress({
    progress,
    onPause,
    onResume,
    onCancel
}: CrawlProgressProps) {
    const isPaused = progress.status === 'paused';
    const isRunning = progress.status === 'running';

    const totalProcessed = progress.queueStats.complete + progress.queueStats.failed;
    const progressPercent = progress.queueStats.total > 0
        ? Math.round((totalProcessed / progress.queueStats.total) * 100)
        : 0;

    return (
        <div className="w-full max-w-3xl mx-auto">
            <div className="glass-card rounded-2xl p-6 space-y-6">
                {/* Header with controls */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className={`w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center`}>
                                <Loader2 className={`w-5 h-5 text-emerald-400 ${isRunning ? 'animate-spin' : ''}`} />
                            </div>
                            {isPaused && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-[#111]" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">
                                {isPaused ? 'Paused' : 'Cloning...'}
                            </h3>
                            <p className="text-sm text-gray-500 truncate max-w-xs">
                                {progress.currentUrl || 'Initializing...'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isRunning && onPause && (
                            <button
                                onClick={onPause}
                                className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                                title="Pause"
                            >
                                <Pause className="w-5 h-5" />
                            </button>
                        )}
                        {isPaused && onResume && (
                            <button
                                onClick={onResume}
                                className="p-2.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-colors"
                                title="Resume"
                            >
                                <Play className="w-5 h-5" />
                            </button>
                        )}
                        {(isRunning || isPaused) && onCancel && (
                            <button
                                onClick={onCancel}
                                className="p-2.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                                title="Cancel"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Progress</span>
                        <span className="text-white font-medium">{progressPercent}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { icon: FileText, label: 'Pages', value: progress.pagesProcessed },
                        { icon: Image, label: 'Assets', value: progress.assetsProcessed },
                        { icon: HardDrive, label: 'Size', value: formatBytes(progress.bytesDownloaded) },
                        { icon: Clock, label: 'Time', value: formatDuration(progress.elapsedMs) },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white/5 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-gray-500 mb-1">
                                <stat.icon className="w-4 h-4" />
                                <span className="text-xs">{stat.label}</span>
                            </div>
                            <p className="text-xl font-bold text-white">{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Queue stats */}
                <div className="flex flex-wrap gap-4 text-sm pt-2 border-t border-white/5">
                    <span className="text-gray-500">
                        Queue: <span className="text-white">{progress.queueStats.pending}</span> pending
                    </span>
                    <span className="text-gray-500">
                        <span className="text-emerald-400">{progress.queueStats.inProgress}</span> processing
                    </span>
                    <span className="text-gray-500">
                        <span className="text-emerald-400">{progress.queueStats.complete}</span> complete
                    </span>
                    {progress.errors > 0 && (
                        <span className="flex items-center gap-1 text-red-400">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {progress.errors} errors
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
