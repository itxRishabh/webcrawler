'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
    Globe,
    Shield,
    Zap,
    Target,
    Layers,
    FileText,
    Download,
    Link2,
    Image,
    Code,
    ChevronDown,
    ChevronRight,
    Check,
    X,
    AlertTriangle,
    ExternalLink,
    ArrowRight,
    Sparkles,
    Info
} from 'lucide-react';
import UrlInput from '@/components/UrlInput';
import AdvancedOptions from '@/components/AdvancedOptions';
import CrawlProgress from '@/components/CrawlProgress';
import DownloadPanel from '@/components/DownloadPanel';
import LogViewer from '@/components/LogViewer';
import {
    api,
    JobPoller,
    type CrawlOptions,
    type Job,
    type JobProgress,
    type JobResult,
    type JobLog
} from '@/lib/api';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import FlipCard from '@/components/FlipCard';

gsap.registerPlugin(ScrollTrigger);

type AppState = 'idle' | 'configuring' | 'crawling' | 'complete' | 'error';
type CloneMode = 'full' | 'single';

// FAQ data
const faqs = [
    {
        question: "What is Website Copier?",
        answer: "Website Copier is a powerful tool that downloads complete websites for offline browsing. It preserves all HTML, CSS, JavaScript, images, and other assets while rewriting links to work locally."
    },
    {
        question: "Is it legal to copy websites?",
        answer: "You should only copy websites you own or have explicit permission to copy. Copying without authorization may violate copyright laws. Always respect intellectual property rights."
    },
    {
        question: "What file types are downloaded?",
        answer: "We download HTML pages, CSS stylesheets, JavaScript files, images (PNG, JPG, SVG, WebP, etc.), fonts, videos, PDFs, and other media files. You can customize which types to include."
    },
    {
        question: "Are there any limits?",
        answer: "By default, we crawl up to 10,000 pages with a depth of 50 levels. You can enable 'Unlimited Mode' to remove these restrictions, or use 'Single Page' mode for quick single-page downloads."
    },
    {
        question: "How long does it take?",
        answer: "Speed depends on the website size and server response time. A typical 100-page website takes about 2-5 minutes. Our concurrent downloading and smart caching make it as fast as possible."
    }
];

export default function Home() {
    const [state, setState] = useState<AppState>('idle');
    const [cloneMode, setCloneMode] = useState<CloneMode>('full');
    const [options, setOptions] = useState<Partial<CrawlOptions>>({});
    const [job, setJob] = useState<Job | null>(null);
    const [progress, setProgress] = useState<JobProgress | null>(null);
    const [result, setResult] = useState<JobResult | null>(null);
    const [logs, setLogs] = useState<JobLog[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [showDisclaimer, setShowDisclaimer] = useState(true);
    const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [poller, setPoller] = useState<JobPoller | null>(null);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    // Cleanup poller on unmount
    useEffect(() => {
        return () => {
            poller?.stop();
        };
    }, [poller]);

    // Poll for logs during crawl
    useEffect(() => {
        if (!job || state !== 'crawling') return;

        const pollLogs = async () => {
            try {
                const lastTimestamp = logs.length > 0 ? logs[logs.length - 1]!.timestamp : undefined;
                const newLogs = await api.getJobLogs(job.id, lastTimestamp);
                if (newLogs.length > 0) {
                    setLogs(prev => [...prev, ...newLogs].slice(-500));
                }
            } catch {
                // Ignore log polling errors
            }
        };

        const interval = setInterval(pollLogs, 2000);
        return () => clearInterval(interval);
    }, [job, state, logs]);

    // GSAP Animations
    useEffect(() => {
        const ctx = gsap.context(() => {
            // Hero Animations
            const tl = gsap.timeline();

            tl.fromTo('.hero-badge',
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
            )
                .fromTo('.hero-title',
                    { y: 30, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.1 },
                    '-=0.4'
                )
                .fromTo('.hero-desc',
                    { y: 20, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
                    '-=0.6'
                )
                .fromTo('.hero-mockup',
                    { y: 50, opacity: 0, scale: 0.95 },
                    { y: 0, opacity: 1, scale: 1, duration: 1, ease: 'power3.out' },
                    '-=0.6'
                )
                .fromTo('.hero-features > div',
                    { y: 20, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'back.out(1.7)' },
                    '-=0.4'
                );

            // Scroll Triggers
            gsap.utils.toArray<HTMLElement>('.section-title').forEach(title => {
                gsap.fromTo(title,
                    { y: 30, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.8,
                        scrollTrigger: {
                            trigger: title,
                            start: 'top 80%',
                            toggleActions: 'play none none reverse'
                        }
                    }
                );
            });
        });

        return () => ctx.revert();
    }, []);

    const handleSubmit = useCallback(async (url: string) => {
        setLoading(true);
        setError(null);

        try {
            let crawlOptions: CrawlOptions = {
                url,
                ...options,
            };

            if (cloneMode === 'single') {
                crawlOptions = {
                    ...crawlOptions,
                    maxDepth: 1,
                    maxPages: 1,
                    unlimitedMode: false,
                };
            }

            const newJob = await api.createJob(crawlOptions);
            setJob(newJob);
            setLogs([]);

            await api.startJob(newJob.id);
            setState('crawling');

            // Use HTTP polling for progress (works on shared hosting)
            const jobPoller = new JobPoller(newJob.id, {
                onProgress: (p) => {
                    setProgress(p);
                },
                onComplete: (r) => {
                    setResult(r);
                    setState('complete');
                    jobPoller.stop();
                },
                onError: (err) => {
                    setError(err);
                    setState('error');
                    jobPoller.stop();
                },
            });

            jobPoller.start();
            setPoller(jobPoller);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start crawl');
            setState('error');
        } finally {
            setLoading(false);
        }
    }, [options, cloneMode]);

    const handlePause = useCallback(async () => {
        if (!job) return;
        try {
            await api.pauseJob(job.id);
        } catch (err) {
            console.error('Failed to pause:', err);
        }
    }, [job]);

    const handleResume = useCallback(async () => {
        if (!job) return;
        try {
            await api.resumeJob(job.id);
        } catch (err) {
            console.error('Failed to resume:', err);
        }
    }, [job]);

    const handleCancel = useCallback(async () => {
        if (!job) return;
        try {
            await api.cancelJob(job.id);
            poller?.stop();
            setState('idle');
            setJob(null);
            setProgress(null);
        } catch (err) {
            console.error('Failed to cancel:', err);
        }
    }, [job, poller]);

    const handleReset = useCallback(() => {
        poller?.stop();
        setState('idle');
        setJob(null);
        setProgress(null);
        setResult(null);
        setLogs([]);
        setError(null);
        setOptions({});
    }, [poller]);

    return (
        <main className="min-h-screen">
            {/* Disclaimer Modal */}
            {showDisclaimer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                    <div className="max-w-lg w-full glass-elevated rounded-3xl p-8 space-y-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">
                                    Legal Agreement
                                </h2>
                                <p className="text-sm text-gray-400 mt-1">
                                    Please read and accept before continuing
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 text-sm text-gray-300">
                            <p className="font-medium text-white">By using this service, you confirm:</p>
                            <ul className="space-y-3">
                                {[
                                    "You own or have permission to copy the target website",
                                    "You will not use copied content for illegal purposes",
                                    "You will respect copyright and intellectual property laws",
                                    "You accept full responsibility for legal consequences"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <label className="flex items-start gap-3 cursor-pointer group p-4 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-colors">
                            <input
                                type="checkbox"
                                checked={disclaimerAccepted}
                                onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                                className="w-5 h-5 mt-0.5 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                            />
                            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                                I agree to the <Link href="/terms" className="text-emerald-400 underline">Terms of Service</Link> and accept full legal responsibility
                            </span>
                        </label>

                        <button
                            onClick={() => setShowDisclaimer(false)}
                            disabled={!disclaimerAccepted}
                            className="w-full py-4 btn-primary disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                        >
                            {disclaimerAccepted ? 'Continue to Website Copier' : 'Please accept the terms above'}
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 group cursor-pointer hover:scale-105 transition-transform duration-300">
                        <img
                            src="/images/logo.png"
                            alt="WebCopier Logo"
                            className="w-10 h-10 object-contain drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                        />
                    </div>
                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
                        <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
                        <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">How it Works</a>
                        <a href="#faq" className="hover:text-emerald-400 transition-colors">FAQ</a>
                    </nav>
                    <a href="#clone" className="btn-primary text-sm py-2.5 px-5 hidden sm:flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                        Get Started
                        <ArrowRight className="w-4 h-4" />
                    </a>
                </div>
            </header>

            {/* Hero Section */}
            <section className="hero-gradient pt-32 pb-20 px-4 overflow-hidden">
                <div className="max-w-5xl mx-auto text-center relative z-10">
                    {/* Badge */}
                    <div className="hero-badge inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8 border-emerald-500/20 opacity-0 transform translate-y-4">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm text-emerald-100/80">The Ultimate Website Archival Tool</span>
                    </div>

                    {/* Headline */}
                    <h1 className="hero-title text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight tracking-tight opacity-0 transform translate-y-8">
                        <span className="text-white">Clone Any Website,</span>
                        <br />
                        <span className="gradient-text-hero">Instantly</span>
                    </h1>

                    {/* Subheadline */}
                    <p className="hero-desc text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 opacity-0 transform translate-y-4">
                        Download complete websites for offline browsing. Full link rewriting,
                        asset preservation, and ZIP packaging — specifically designed for the modern web.
                    </p>

                    {/* Dashboard Mockup */}
                    <div className="hero-mockup relative max-w-4xl mx-auto mb-16 opacity-0 transform translate-y-8 scale-95">
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-20 pointer-events-none"></div>
                        <img
                            src="/images/dashboard-mockup.png"
                            alt="WebCopier Dashboard Interface"
                            className="relative rounded-xl border border-white/10 shadow-2xl shadow-emerald-900/50 w-full"
                        />
                    </div>

                    {/* Trust indicators */}
                    <div className="hero-features flex flex-wrap justify-center gap-8 mb-16">
                        {[
                            { icon: Shield, label: 'Secure & Safe' },
                            { icon: Zap, label: 'Lightning Fast' },
                            { icon: Target, label: 'Pixel Perfect' },
                        ].map((item) => (
                            <div key={item.label} className="flex items-center gap-2 text-gray-400">
                                <div className="p-1.5 rounded-full bg-emerald-500/10">
                                    <item.icon className="w-4 h-4 text-emerald-400" />
                                </div>
                                <span className="text-sm font-medium">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Clone Section */}
            <section id="clone" className="py-12 px-4 relative z-20">
                <div className="max-w-4xl mx-auto space-y-6">
                    {(state === 'idle' || state === 'configuring') && (
                        <>
                            {/* Mode Tabs */}
                            <div className="glass-card rounded-2xl p-2 flex gap-2">
                                <button
                                    onClick={() => setCloneMode('full')}
                                    className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-xl transition-all ${cloneMode === 'full'
                                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-white shadow-lg shadow-emerald-900/20'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <Layers className="w-5 h-5" />
                                    <div className="text-left">
                                        <div className="font-semibold">Full Website</div>
                                        <div className="text-xs opacity-70">Clone all pages & assets</div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setCloneMode('single')}
                                    className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-xl transition-all ${cloneMode === 'single'
                                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-white shadow-lg shadow-emerald-900/20'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <FileText className="w-5 h-5" />
                                    <div className="text-left">
                                        <div className="font-semibold">Single Page</div>
                                        <div className="text-xs opacity-70">Just this page + assets</div>
                                    </div>
                                </button>
                            </div>

                            {cloneMode === 'single' && (
                                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center flex items-center justify-center gap-2 animate-fade-in-up">
                                    <Info className="w-4 h-4 text-emerald-400" />
                                    <p className="text-sm text-emerald-200">
                                        <strong>Single Page Mode:</strong> Downloads only the URL you enter with all assets. No crawling.
                                    </p>
                                </div>
                            )}

                            <UrlInput
                                onSubmit={handleSubmit}
                                disabled={loading}
                                loading={loading}
                            />

                            {cloneMode === 'full' && (
                                <AdvancedOptions
                                    options={options}
                                    onChange={setOptions}
                                    disabled={loading}
                                />
                            )}
                        </>
                    )}

                    {state === 'crawling' && progress && (
                        <>
                            <CrawlProgress
                                progress={progress}
                                onPause={handlePause}
                                onResume={handleResume}
                                onCancel={handleCancel}
                            />
                            <LogViewer logs={logs} />
                        </>
                    )}

                    {state === 'complete' && result && job && (
                        <>
                            <DownloadPanel
                                jobId={job.id}
                                result={result}
                                downloadUrl={api.getDownloadUrl(job.id)}
                                previewUrl={api.getPreviewUrl(job.id)}
                            />
                            <LogViewer logs={logs} />
                            <div className="flex justify-center pt-6">
                                <button
                                    onClick={handleReset}
                                    className="btn-secondary flex items-center gap-2"
                                >
                                    <Layers className="w-4 h-4" />
                                    Clone Another Website
                                </button>
                            </div>
                        </>
                    )}

                    {state === 'error' && (
                        <div className="glass-card rounded-2xl p-8 border border-red-500/20 bg-red-500/5">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-red-500/10">
                                    <X className="w-6 h-6 text-red-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-white mb-1">
                                        Clone Failed
                                    </h3>
                                    <p className="text-sm text-gray-400">
                                        {error || 'An unknown error occurred'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleReset}
                                className="mt-6 w-full btn-secondary text-red-300 hover:text-red-200 hover:bg-red-500/10 border-red-500/20"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 px-4 section-gradient relative overflow-hidden">
                <div className="absolute top-1/4 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

                <div className="max-w-6xl mx-auto relative z-10">
                    <div className="text-center mb-16 section-title opacity-0">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                            Why Choose <span className="gradient-text-green">WebCopier</span>?
                        </h2>
                        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                            The most advanced tool for developers, designers, and archivists who need reliable website cloning.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                icon: Shield,
                                title: "Maximum Security",
                                description: "Advanced SSRF protection, safe inputs, and isolated processing for secure downloads.",
                                image: "/images/feature-security.png"
                            },
                            {
                                icon: Zap,
                                title: "Lightning Fast",
                                description: "Optimized concurrent crawling engine with smart caching and rate limiting.",
                                image: "/images/feature-speed.png"
                            },
                            {
                                icon: Target,
                                title: "Pixel Perfect",
                                description: "Intelligent asset capture preserves layout, fonts, images, and responsive behaviors.",
                                image: null
                            },
                            {
                                icon: Globe,
                                title: "Works Anywhere",
                                description: "Clone any public website, from simple landing pages to complex web applications.",
                                image: null
                            }
                        ].map((feature, i) => (
                            <FlipCard key={i} {...feature} />
                        ))}
                    </div>
                </div>
            </section>

            {/* What's Included */}
            <section className="py-24 px-4 bg-[#080808]/50 backdrop-blur-sm border-y border-white/5">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                        <div className="md:w-1/2">
                            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                                Everything Included <br />
                                <span className="gradient-text-green">In Every Download</span>
                            </h2>
                            <p className="text-gray-400 mb-8 text-lg">
                                We don't just save the HTML. WebCopier meticulously captures every asset linked to the page to ensure a complete offline experience.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { icon: Code, label: "Clean HTML Structure" },
                                    { icon: FileText, label: "All CSS Stylesheets" },
                                    { icon: Zap, label: "JavaScript Files" },
                                    { icon: Image, label: "High-Res Images" },
                                    { icon: Link2, label: "Web Fonts (WOFF/TTF)" },
                                    { icon: Download, label: "Media & Documents" },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        <span className="text-gray-300 font-medium">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="md:w-1/2 relative">
                            <div className="absolute -inset-10 bg-emerald-500/10 rounded-full blur-3xl"></div>
                            <div className="relative glass-card p-8 rounded-3xl border border-white/10">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                        <div className="p-2 bg-orange-500/20 rounded-lg"><FileText className="w-5 h-5 text-orange-400" /></div>
                                        <div>
                                            <div className="text-white font-mono text-sm">index.html</div>
                                            <div className="text-xs text-gray-500">24KB • HTML Document</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 ml-8 border-emerald-500/30">
                                        <div className="p-2 bg-blue-500/20 rounded-lg"><Code className="w-5 h-5 text-blue-400" /></div>
                                        <div>
                                            <div className="text-white font-mono text-sm">styles.css</div>
                                            <div className="text-xs text-gray-500">142KB • Stylesheet</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 ml-4">
                                        <div className="p-2 bg-yellow-500/20 rounded-lg"><Zap className="w-5 h-5 text-yellow-400" /></div>
                                        <div>
                                            <div className="text-white font-mono text-sm">app.bundle.js</div>
                                            <div className="text-xs text-gray-500">2.1MB • JavaScript</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="py-24 px-4 section-gradient">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                            How It Works
                        </h2>
                        <p className="text-gray-400 text-lg">Clone virtually any website in three simple steps</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 relative">
                        {/* Connecting line for desktop */}
                        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-emerald-500/0 via-emerald-500/30 to-emerald-500/0"></div>

                        {[
                            {
                                step: "1",
                                title: "Paste URL",
                                description: "Enter the website URL you want to clone. We support both HTTP and HTTPS protocols."
                            },
                            {
                                step: "2",
                                title: "Configure",
                                description: "Choose 'Single Page' for a quick snapshot or 'Full Website' for deep crawling."
                            },
                            {
                                step: "3",
                                title: "Download",
                                description: "We package everything into a neat ZIP file. Extract and open index.html to browse."
                            }
                        ].map((item, i) => (
                            <div key={i} className="step-card text-center relative bg-[#0a0a0a]">
                                <div className="step-number mx-auto relative z-10 shadow-lg shadow-emerald-900/40">{item.step}</div>
                                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                                <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">{item.description}</p>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-12">
                        <a href="#clone" className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-3">
                            Start Cloning Now
                            <ArrowRight className="w-5 h-5" />
                        </a>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="py-24 px-4">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                            Your Questions, <span className="gradient-text-green">Answered</span>
                        </h2>
                        <p className="text-gray-400">Everything you need to know about WebCopier</p>
                    </div>

                    <div className="space-y-4">
                        {faqs.map((faq, i) => (
                            <div
                                key={i}
                                className={`faq-item ${openFaq === i ? 'active bg-white/5' : ''}`}
                            >
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between p-6 text-left"
                                >
                                    <span className={`font-semibold text-lg ${openFaq === i ? 'text-white' : 'text-gray-300'}`}>
                                        {faq.question}
                                    </span>
                                    <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${openFaq === i ? 'rotate-180 text-emerald-400' : ''}`} />
                                </button>
                                <div
                                    className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}
                                >
                                    <div className="px-6 pb-6 text-gray-400 leading-relaxed">
                                        {faq.answer}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="glass-elevated rounded-3xl p-12 text-center relative overflow-hidden group">
                        <div className="absolute inset-0 hero-gradient opacity-30 group-hover:opacity-50 transition-opacity duration-700"></div>
                        <div className="relative z-10">
                            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                                Ready to clone your first website?
                            </h2>
                            <p className="text-gray-400 mb-8 max-w-xl mx-auto text-lg">
                                Join thousands of developers and designers who trust WebCopier for reliable website archival. No registration required.
                            </p>
                            <a href="#clone" className="btn-primary inline-flex items-center gap-2 animate-pulse-glow text-lg px-8 py-4">
                                Get Started Free
                                <ArrowRight className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-4 border-t border-white/5 bg-[#030303]">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        {/* Logo & Description */}
                        <div className="md:col-span-2 space-y-4">
                            <div className="flex items-center gap-2">
                                <img src="/images/logo.png" alt="WebCopier Logo" className="w-8 h-8 object-contain opacity-90" />
                                <span className="font-bold text-xl text-white tracking-tight">WebCopier</span>
                            </div>
                            <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
                                The modern website cloning tool. Download complete websites for offline browsing with preserved assets, link rewriting, and intelligent parsing.
                            </p>
                            <div className="flex gap-4 pt-2">
                                <a href="https://x.com/itxrishabh" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-emerald-500/20 cursor-pointer transition-colors text-gray-400 hover:text-emerald-400">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                </a>
                                <a href="https://linkedin.com/in/itxrishabh" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-emerald-500/20 cursor-pointer transition-colors text-gray-400 hover:text-emerald-400">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                                </a>
                                <a href="https://github.com/itxrishabh" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-emerald-500/20 cursor-pointer transition-colors text-gray-400 hover:text-emerald-400">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                                </a>
                            </div>
                            <p className="text-xs text-gray-500 pt-2 font-mono">
                                Developed by <a href="https://x.com/itxrishabh" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-400 transition-colors">@itxrishabh</a>
                            </p>
                        </div>

                        {/* Navigation */}
                        <div>
                            <h4 className="font-bold text-white mb-6">Navigation</h4>
                            <ul className="space-y-3 text-sm text-gray-400">
                                <li><a href="#features" className="hover:text-emerald-400 transition-colors">Features</a></li>
                                <li><a href="#how-it-works" className="hover:text-emerald-400 transition-colors">How it Works</a></li>
                                <li><a href="#faq" className="hover:text-emerald-400 transition-colors">FAQ</a></li>
                            </ul>
                        </div>

                        {/* Legal */}
                        <div>
                            <h4 className="font-bold text-white mb-6">Legal</h4>
                            <ul className="space-y-3 text-sm text-gray-400">
                                <li><Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms of Service</Link></li>
                                <li><Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link></li>
                                <li><Link href="/dmca" className="hover:text-emerald-400 transition-colors">DMCA Policy</Link></li>
                                <li><Link href="/disclaimer" className="hover:text-emerald-400 transition-colors">Disclaimer</Link></li>
                            </ul>
                        </div>
                    </div>

                    {/* Bottom */}
                    <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-gray-500">
                            © {new Date().getFullYear()} WebCopier. All rights reserved.
                        </p>
                        <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                            <p className="text-xs text-emerald-400/80 flex items-center gap-2">
                                <AlertTriangle className="w-3 h-3" />
                                Only copy websites you own or have explicit permission to copy.
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </main>
    );
}

