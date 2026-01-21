'use client';

import {
    Download,
    ExternalLink,
    FileText,
    Image,
    Code,
    File,
    CheckCircle2,
    Clock,
    HardDrive,
    Sparkles
} from 'lucide-react';
import type { JobResult } from '@/lib/api';

interface DownloadPanelProps {
    jobId: string;
    result: JobResult;
    downloadUrl: string;
    previewUrl: string;
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
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
}

export default function DownloadPanel({
    result,
    downloadUrl,
    previewUrl
}: DownloadPanelProps) {
    return (
        <div className="w-full max-w-3xl mx-auto">
            <div className="glass-card rounded-2xl overflow-hidden">
                {/* Success header */}
                <div className="relative bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 p-6 border-b border-white/5">
                    <div className="absolute inset-0 hero-gradient opacity-30" />
                    <div className="relative flex items-center gap-4">
                        <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center glow-green-sm">
                            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-bold text-white">
                                    Clone Complete!
                                </h3>
                                <Sparkles className="w-5 h-5 text-emerald-400" />
                            </div>
                            <p className="text-sm text-gray-400">
                                Your website copy is ready for download
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Stats grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { icon: FileText, label: 'Pages', value: result.pagesProcessed },
                            { icon: Image, label: 'Assets', value: result.assetsProcessed },
                            { icon: HardDrive, label: 'Size', value: formatBytes(result.bytesDownloaded) },
                            { icon: Clock, label: 'Duration', value: formatDuration(result.duration) },
                        ].map((stat, i) => (
                            <div key={i} className="text-center p-4 bg-white/5 rounded-xl">
                                <stat.icon className="w-5 h-5 text-gray-500 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-white">{stat.value}</p>
                                <p className="text-xs text-gray-500">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Error warning */}
                    {result.errorCount > 0 && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                            <p className="text-sm text-amber-300">
                                ⚠️ {result.errorCount} files could not be downloaded. The copy may be incomplete.
                            </p>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <a
                            href={downloadUrl}
                            download
                            className="flex-1 flex items-center justify-center gap-2 py-4 px-6 btn-primary"
                        >
                            <Download className="w-5 h-5" />
                            Download ZIP
                        </a>

                        <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 py-4 px-6 btn-secondary"
                        >
                            <ExternalLink className="w-5 h-5" />
                            Preview Online
                        </a>
                    </div>

                    {/* File types */}
                    <div className="pt-4 border-t border-white/5">
                        <p className="text-sm text-gray-500 mb-3">Included files:</p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { icon: FileText, label: 'HTML', color: 'text-orange-400' },
                                { icon: Code, label: 'CSS/JS', color: 'text-blue-400' },
                                { icon: Image, label: 'Images', color: 'text-emerald-400' },
                                { icon: File, label: 'Other', color: 'text-gray-400' },
                            ].map((type) => (
                                <span
                                    key={type.label}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full text-sm"
                                >
                                    <type.icon className={`w-3.5 h-3.5 ${type.color}`} />
                                    <span className="text-gray-300">{type.label}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
