'use client';

import { useRef, useEffect } from 'react';
import { Info, AlertTriangle, AlertCircle, Bug, Terminal } from 'lucide-react';
import type { JobLog } from '@/lib/api';

interface LogViewerProps {
    logs: JobLog[];
    maxHeight?: string;
}

function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString();
}

const levelIcons = {
    debug: Bug,
    info: Info,
    warn: AlertTriangle,
    error: AlertCircle,
};

const levelColors = {
    debug: 'text-gray-500',
    info: 'text-emerald-400',
    warn: 'text-amber-400',
    error: 'text-red-400',
};

export default function LogViewer({ logs, maxHeight = '300px' }: LogViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const shouldAutoScroll = useRef(true);

    useEffect(() => {
        if (shouldAutoScroll.current && containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [logs]);

    const handleScroll = () => {
        if (containerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
            shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 50;
        }
    };

    if (logs.length === 0) {
        return (
            <div className="w-full max-w-3xl mx-auto mt-4">
                <div className="glass-card rounded-2xl p-8 text-center">
                    <Terminal className="w-8 h-8 mx-auto mb-3 text-gray-600" />
                    <p className="text-sm text-gray-500">No logs yet</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-3xl mx-auto mt-4">
            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-gray-500" />
                        <h3 className="text-sm font-medium text-gray-300">Logs</h3>
                    </div>
                    <span className="text-xs text-gray-600">{logs.length} entries</span>
                </div>

                <div
                    ref={containerRef}
                    onScroll={handleScroll}
                    className="overflow-y-auto font-mono text-xs bg-[#050505]"
                    style={{ maxHeight }}
                >
                    {logs.map((log, index) => {
                        const Icon = levelIcons[log.level as keyof typeof levelIcons] || Info;
                        const colorClass = levelColors[log.level as keyof typeof levelColors] || 'text-gray-400';

                        return (
                            <div
                                key={index}
                                className="flex items-start gap-2 px-4 py-2 hover:bg-white/5 border-b border-white/5 last:border-0"
                            >
                                <span className="text-gray-600 shrink-0">
                                    {formatTime(log.timestamp)}
                                </span>
                                <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${colorClass}`} />
                                <span className={`${colorClass} shrink-0 uppercase w-12`}>
                                    {log.level}
                                </span>
                                <span className="text-gray-400 break-all">
                                    {log.message}
                                    {typeof log.context?.url === 'string' && (
                                        <span className="text-gray-600 ml-2">
                                            {log.context.url.length > 60
                                                ? log.context.url.substring(0, 60) + '...'
                                                : log.context.url}
                                        </span>
                                    )}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
