'use client';

import { useState, FormEvent } from 'react';
import { Globe, ArrowRight, Loader2 } from 'lucide-react';

interface UrlInputProps {
    onSubmit: (url: string) => void;
    disabled?: boolean;
    loading?: boolean;
}

export default function UrlInput({ onSubmit, disabled, loading }: UrlInputProps) {
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');
    const [focused, setFocused] = useState(false);

    const validateUrl = (value: string): boolean => {
        if (!value.trim()) {
            setError('Please enter a URL');
            return false;
        }

        try {
            let urlToValidate = value.trim();
            if (!urlToValidate.match(/^https?:\/\//i)) {
                urlToValidate = 'https://' + urlToValidate;
            }

            const parsed = new URL(urlToValidate);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                setError('Only HTTP and HTTPS URLs are supported');
                return false;
            }

            setError('');
            return true;
        } catch {
            setError('Please enter a valid URL');
            return false;
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        let urlToSubmit = url.trim();
        if (!urlToSubmit.match(/^https?:\/\//i)) {
            urlToSubmit = 'https://' + urlToSubmit;
        }

        if (validateUrl(urlToSubmit)) {
            onSubmit(urlToSubmit);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
            <div className="relative group">
                {/* Glow effect */}
                <div
                    className={`absolute -inset-1 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl blur-lg transition-opacity duration-500 ${focused ? 'opacity-40' : 'opacity-20 group-hover:opacity-30'
                        }`}
                />

                {/* Input container */}
                <div className={`relative flex items-center bg-[#0a0a0a] rounded-2xl border transition-colors duration-300 ${focused ? 'border-emerald-500/50' : 'border-white/10 hover:border-white/20'
                    }`}>
                    <div className="flex items-center justify-center w-14 h-16 text-gray-500">
                        <Globe className="w-5 h-5" />
                    </div>

                    <input
                        type="text"
                        value={url}
                        onChange={(e) => {
                            setUrl(e.target.value);
                            if (error) setError('');
                        }}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        placeholder="Enter website URL (e.g., example.com)"
                        disabled={disabled || loading}
                        className="flex-1 bg-transparent text-white text-lg placeholder-gray-600 outline-none py-5 pr-4 disabled:opacity-50"
                    />

                    <button
                        type="submit"
                        disabled={disabled || loading || !url.trim()}
                        className="flex items-center justify-center h-12 px-7 mr-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <span className="mr-2">Clone</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <p className="mt-3 text-red-400 text-sm text-center">{error}</p>
            )}

            {/* Helper text */}
            {!error && (
                <p className="mt-3 text-gray-600 text-xs text-center">
                    We&apos;ll automatically add https:// if not provided
                </p>
            )}
        </form>
    );
}
