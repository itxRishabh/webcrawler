'use client';

import { useState } from 'react';
import {
    ChevronDown,
    ChevronUp,
    Settings2,
    Shield,
    Gauge,
    FileType,
    SlidersHorizontal,
    Zap,
    AlertTriangle
} from 'lucide-react';
import type { CrawlOptions } from '@/lib/api';

interface AdvancedOptionsProps {
    options: Partial<CrawlOptions>;
    onChange: (options: Partial<CrawlOptions>) => void;
    disabled?: boolean;
}

export default function AdvancedOptions({ options, onChange, disabled }: AdvancedOptionsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'scope' | 'limits' | 'files' | 'advanced'>('scope');

    const updateOption = <K extends keyof CrawlOptions>(key: K, value: CrawlOptions[K]) => {
        onChange({ ...options, [key]: value });
    };

    const updateFileType = (type: string, value: boolean) => {
        onChange({
            ...options,
            fileTypes: {
                ...options.fileTypes,
                [type]: value,
            },
        });
    };

    const tabs = [
        { id: 'scope', label: 'Scope', icon: Shield },
        { id: 'limits', label: 'Limits', icon: Gauge },
        { id: 'files', label: 'File Types', icon: FileType },
        { id: 'advanced', label: 'Advanced', icon: Settings2 },
    ];

    return (
        <div className="w-full max-w-3xl mx-auto mt-6">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className="flex items-center justify-center gap-2 w-full py-3 text-gray-500 hover:text-white transition-colors disabled:opacity-50"
            >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="text-sm font-medium">Advanced Options</span>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4" />
                ) : (
                    <ChevronDown className="w-4 h-4" />
                )}
            </button>

            {isOpen && (
                <div className="mt-3 glass-card rounded-2xl overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-white/5">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${activeTab === tab.id
                                    ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-400/5'
                                    : 'text-gray-500 hover:text-white'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {/* Unlimited Mode Banner */}
                        <div className="mb-6 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-emerald-500/10">
                                        <Zap className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-emerald-300">
                                            Unlimited Mode
                                        </label>
                                        <p className="text-xs text-emerald-200/60">
                                            No depth or page limits
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => updateOption('unlimitedMode', !options.unlimitedMode)}
                                    disabled={disabled}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${options.unlimitedMode ? 'bg-emerald-500' : 'bg-gray-700'
                                        }`}
                                >
                                    <span
                                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${options.unlimitedMode ? 'translate-x-6' : ''
                                            }`}
                                    />
                                </button>
                            </div>
                            {options.unlimitedMode && (
                                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-200/80">
                                        Large sites may take hours and use significant disk space.
                                    </p>
                                </div>
                            )}
                        </div>

                        {activeTab === 'scope' && (
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Crawl Scope
                                    </label>
                                    <select
                                        value={options.scope || 'same-domain'}
                                        onChange={(e) => updateOption('scope', e.target.value as CrawlOptions['scope'])}
                                        disabled={disabled}
                                        className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all"
                                    >
                                        <option value="same-domain">Same Domain</option>
                                        <option value="same-host">Same Host (exact)</option>
                                        <option value="subdomains">Include Subdomains</option>
                                    </select>
                                    <p className="mt-2 text-xs text-gray-500">
                                        Controls which pages will be included
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Maximum Depth {options.unlimitedMode && <span className="text-emerald-400 text-xs">(Unlimited)</span>}
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="1000"
                                        value={options.unlimitedMode ? 999 : (options.maxDepth || 50)}
                                        onChange={(e) => updateOption('maxDepth', parseInt(e.target.value))}
                                        disabled={disabled || options.unlimitedMode}
                                        className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none disabled:opacity-40 transition-all"
                                    />
                                    <p className="mt-2 text-xs text-gray-500">
                                        How many links deep to follow
                                    </p>
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                                    <div>
                                        <label className="text-sm font-medium text-gray-300">
                                            Respect robots.txt
                                        </label>
                                        <p className="text-xs text-gray-500">
                                            Follow website crawling rules
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => updateOption('respectRobotsTxt', !options.respectRobotsTxt)}
                                        disabled={disabled}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${options.respectRobotsTxt ? 'bg-emerald-500' : 'bg-gray-700'
                                            }`}
                                    >
                                        <span
                                            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${options.respectRobotsTxt ? 'translate-x-6' : ''
                                                }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'limits' && (
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Maximum Pages {options.unlimitedMode && <span className="text-emerald-400 text-xs">(Unlimited)</span>}
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="1000000"
                                        value={options.unlimitedMode ? 999999 : (options.maxPages || 10000)}
                                        onChange={(e) => updateOption('maxPages', parseInt(e.target.value))}
                                        disabled={disabled || options.unlimitedMode}
                                        className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none disabled:opacity-40 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Maximum File Size (MB)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="500"
                                        value={(options.maxFileSize || 52428800) / 1048576}
                                        onChange={(e) => updateOption('maxFileSize', parseInt(e.target.value) * 1048576)}
                                        disabled={disabled}
                                        className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Concurrent Requests
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={options.concurrency || 5}
                                        onChange={(e) => updateOption('concurrency', parseInt(e.target.value))}
                                        disabled={disabled}
                                        className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all"
                                    />
                                    <p className="mt-2 text-xs text-gray-500">
                                        Higher = faster but may trigger rate limits
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Delay Between Requests (ms)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="5000"
                                        step="100"
                                        value={options.delayMs || 100}
                                        onChange={(e) => updateOption('delayMs', parseInt(e.target.value))}
                                        disabled={disabled}
                                        className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'files' && (
                            <div className="space-y-2">
                                <p className="text-sm text-gray-400 mb-4">
                                    Select which file types to download
                                </p>
                                {[
                                    { id: 'html', label: 'HTML Pages', default: true },
                                    { id: 'css', label: 'Stylesheets (CSS)', default: true },
                                    { id: 'js', label: 'JavaScript', default: true },
                                    { id: 'images', label: 'Images (PNG, JPG, SVG, etc.)', default: true },
                                    { id: 'fonts', label: 'Fonts (WOFF, TTF, etc.)', default: true },
                                    { id: 'media', label: 'Media (Video, Audio)', default: true },
                                    { id: 'documents', label: 'Documents (PDF, etc.)', default: true },
                                    { id: 'other', label: 'Other files', default: false },
                                ].map((type) => (
                                    <label
                                        key={type.id}
                                        className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                                    >
                                        <span className="text-sm text-gray-300">{type.label}</span>
                                        <input
                                            type="checkbox"
                                            checked={options.fileTypes?.[type.id as keyof typeof options.fileTypes] ?? type.default}
                                            onChange={(e) => updateFileType(type.id, e.target.checked)}
                                            disabled={disabled}
                                            className="w-5 h-5 rounded border-gray-600 bg-[#111] text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                                        />
                                    </label>
                                ))}
                            </div>
                        )}

                        {activeTab === 'advanced' && (
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Custom User-Agent
                                    </label>
                                    <input
                                        type="text"
                                        value={options.userAgent || ''}
                                        onChange={(e) => updateOption('userAgent', e.target.value)}
                                        placeholder="Leave empty for default (Chrome)"
                                        disabled={disabled}
                                        className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Cookies
                                    </label>
                                    <textarea
                                        value={options.cookies || ''}
                                        onChange={(e) => updateOption('cookies', e.target.value)}
                                        placeholder="session=abc123; token=xyz789"
                                        disabled={disabled}
                                        rows={2}
                                        className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none resize-none transition-all"
                                    />
                                    <p className="mt-2 text-xs text-gray-500">
                                        For authenticated pages
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Request Timeout (seconds)
                                    </label>
                                    <input
                                        type="number"
                                        min="5"
                                        max="300"
                                        step="5"
                                        value={(options.timeoutMs || 60000) / 1000}
                                        onChange={(e) => updateOption('timeoutMs', parseInt(e.target.value) * 1000)}
                                        disabled={disabled}
                                        className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
