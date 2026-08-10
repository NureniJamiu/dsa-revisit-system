import { useState, useEffect, useRef } from 'react';
import {
    Mail,
    Brain,
    ChevronRight,
    ArrowRight,
    BarChart3,
    CheckCircle2,
    Menu,
    X,
    Shield,
    Search,
    Clock,
    HelpCircle,
    Zap,
    Plus,
    Archive as ArchiveIcon,
    Chrome,
    Puzzle,
} from 'lucide-react';
import { SignInButton, SignUpButton } from '@clerk/clerk-react';
import { toast } from 'react-toastify';
import Logo from '../components/Logo';
import PlatformIcon from '../components/PlatformIcon';
import ThemeToggle from '../components/ThemeToggle';
import { platformMarks, type PlatformMark } from '../data/platformMarks';
import dashboardPreview from '../assets/dashboard-preview-cropped.png';

/* ─── Shared styles ─── */
const btnPrimary =
    'bg-[linear-gradient(to_bottom,var(--btn-cta-from),var(--btn-cta-to))] text-[var(--btn-cta-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.35)] hover:brightness-105 transition-all';
const btnGhost =
    'text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--bg-surface-hover)] hover:border-[var(--border-strong)] transition-colors';

function useSpotlight() {
    const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--x', `${e.clientX - rect.left}px`);
        e.currentTarget.style.setProperty('--y', `${e.clientY - rect.top}px`);
    };
    return onMouseMove;
}

/* ─── Data ─── */
const showcaseTabs = [
    {
        label: 'Build your library',
        icon: Search,
        desc: 'Paste a link from LeetCode, NeetCode, or anywhere else. We track the title and difficulty for you.',
    },
    {
        label: 'Get a daily focus set',
        icon: Mail,
        desc: 'Each morning we surface a handful of problems chosen by a weighted spaced-repetition algorithm, right before you\'d start forgetting them.',
    },
    {
        label: 'Track your mastery',
        icon: Zap,
        desc: 'Mark problems as revisited and retire the ones you\'ve mastered. The rotation adjusts automatically.',
    },
];

const features = [
    {
        icon: Brain,
        title: 'Weighted spaced repetition',
        desc: 'Problems resurface based on age, days since your last revisit, and how many times you\'ve solved them: never fully random, never forgotten.',
        span: 'md:col-span-7',
        visual: 'weights',
    },
    {
        icon: Mail,
        title: 'Daily focus set',
        desc: 'The same deterministic selection shows up on your dashboard and in your inbox, all day.',
        span: 'md:col-span-5',
        visual: 'inbox',
    },
    {
        icon: Search,
        title: 'Practice anywhere',
        desc: 'LeetCode, HackerRank, Codeforces, or any custom URL: one place to track it all.',
        span: 'md:col-span-4',
        visual: 'chips',
    },
    {
        icon: BarChart3,
        title: 'Revisit history',
        desc: 'Every review is logged, so you can see exactly how a problem\'s mastery has progressed.',
        span: 'md:col-span-4',
        visual: 'timeline',
    },
    {
        icon: ArchiveIcon,
        title: 'The archive',
        desc: 'Retire problems you\'ve fully mastered. Out of rotation, never deleted.',
        span: 'md:col-span-4',
        visual: 'stack',
    },
];

const extensionPlatforms: PlatformMark[] = [
    platformMarks.find((m) => m.name === 'LeetCode')!,
    { name: 'GeeksforGeeks' },
    platformMarks.find((m) => m.name === 'HackerRank')!,
    platformMarks.find((m) => m.name === 'NeetCode')!,
];

const stats = [
    { label: 'Age curve', value: '√days', hint: 'Older problems gently gain weight' },
    { label: 'Revisit urgency', value: 'linear(Δt)', hint: 'Longer since last touch, more urgent' },
    { label: 'Newness cooldown', value: '2 days', hint: 'Fresh adds sit out the first rotation' },
    { label: 'Weight floor', value: '1.0', hint: 'No problem ever fully disappears' },
];

const faqs = [
    {
        icon: CheckCircle2,
        q: 'How does the spaced repetition algorithm work?',
        a: "We assign each problem a weight based on how long ago you last revisited it, how many times you've solved it, and a controlled randomness factor. Higher-weight problems appear more frequently. As you master them, they gradually fade from your daily set.",
    },
    {
        icon: Search,
        q: 'What platforms can I add problems from?',
        a: "Any platform with a URL! LeetCode, HackerRank, Codeforces, NeetCode, AlgoExpert. Just paste the problem link and we'll track it for you.",
    },
    {
        icon: Shield,
        q: 'Is my data private?',
        a: 'Absolutely. Your problem list, revisit history, and settings are scoped to your account and never shared. We use Clerk for authentication and follow industry best practices.',
    },
    {
        icon: HelpCircle,
        q: 'Can I use this without email notifications?',
        a: 'Yes! Email is optional. You can use the dashboard directly to see your daily focus set and mark problems as revisited.',
    },
    {
        icon: Clock,
        q: 'How often are new problems added to my rotation?',
        a: 'Every time you add a problem, it enters your rotation immediately. Our algorithm balances new additions with existing review items.',
    },
    {
        icon: BarChart3,
        q: 'What does "retire" a problem mean?',
        a: 'When you feel confident about a problem, you can retire it. It moves to your archive, out of the daily rotation but always accessible if you want to bring it back.',
    },
];

/* ─── Feature card mini-visuals ─── */
function FeatureVisual({ type }: { type: string }) {
    if (type === 'weights') {
        const bars = [92, 74, 58, 41, 27, 18];
        return (
            <div className="flex items-end gap-1.5 h-12 mt-5">
                {bars.map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-green-500" style={{ height: `${h}%`, opacity: 1 - i * 0.13 }} />
                ))}
            </div>
        );
    }
    if (type === 'inbox') {
        return (
            <div className="mt-5 space-y-1.5">
                {[100, 85, 60].map((w, i) => (
                    <div key={i} className={`h-2 rounded-full bg-[var(--bg-elevated)] ${i === 0 ? 'border border-green-500/30' : ''}`} style={{ width: `${w}%` }} />
                ))}
            </div>
        );
    }
    if (type === 'chips') {
        return (
            <div className="flex flex-wrap gap-1.5 mt-5">
                {['LeetCode', 'Codeforces', 'NeetCode', '+3'].map((c) => (
                    <span key={c} className="px-2 py-0.5 rounded-full bg-[var(--bg-surface-hover)] border border-[var(--border-default)] text-[10px] font-medium text-[var(--text-secondary)]">{c}</span>
                ))}
            </div>
        );
    }
    if (type === 'timeline') {
        return (
            <div className="flex items-center gap-0 mt-5">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center flex-1 last:flex-none">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${i === 3 ? 'bg-green-500' : 'bg-[var(--bg-elevated)]'}`} />
                        {i < 3 && <div className="h-px flex-1 bg-[var(--bg-elevated)]" />}
                    </div>
                ))}
            </div>
        );
    }
    if (type === 'stack') {
        return (
            <div className="relative h-12 mt-5 ml-1">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="absolute inset-x-0 h-7 rounded-md bg-[var(--bg-surface-hover)] border border-[var(--border-default)]"
                        style={{ top: `${i * 8}px`, left: `${i * 6}px`, right: `${-i * 6}px`, opacity: 1 - i * 0.28 }}
                    />
                ))}
            </div>
        );
    }
    return null;
}

/* ─── Showcase mockups (right-hand panel per tab) ─── */
function ShowcaseMockup({ index }: { index: number }) {
    if (index === 0) {
        return (
            <div className="w-full max-w-sm space-y-3">
                <div className="bg-[var(--bg-surface-raised)] p-4 rounded-lg border border-[var(--border-default)]">
                    <p className="text-[10px] font-medium text-[var(--text-secondary)] mb-2">Paste URL</p>
                    <div className="flex gap-2">
                        <div className="h-9 flex-1 bg-[var(--bg-surface-raised)] rounded-md border border-[var(--border-default)] px-3 flex items-center">
                            <span className="text-[11px] font-mono-tabular text-[var(--text-tertiary)] truncate">leetcode.com/problems/lru-cache</span>
                        </div>
                        <div className="w-9 h-9 bg-[var(--btn-primary-bg)] rounded-md flex items-center justify-center flex-shrink-0">
                            <Plus className="w-4 h-4 text-[var(--btn-primary-text)]" />
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="h-7 px-3 bg-[var(--bg-surface-raised)] rounded-full border border-[var(--border-default)] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        <span className="text-[10px] font-medium text-[var(--text-secondary)]">Hard</span>
                    </div>
                    <div className="h-7 px-3 bg-green-500/10 rounded-full border border-green-500/20 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                        <span className="text-[10px] font-medium text-green-400">Indexed</span>
                    </div>
                </div>
            </div>
        );
    }
    if (index === 1) {
        return (
            <div className="w-full max-w-[220px] bg-[var(--bg-surface-raised)] rounded-xl shadow-xl overflow-hidden border border-[var(--border-default)]">
                <div className="bg-green-600 p-3 text-center">
                    <span className="text-[11px] font-semibold text-white">Today's daily recall</span>
                </div>
                <div className="p-4 space-y-2">
                    {['1. LRU Cache', '2. Merge K Lists', '3. 3Sum'].map((t, i) => (
                        <div key={t} className={`p-2.5 bg-[var(--bg-surface-raised)] rounded-md border border-[var(--border-subtle)] flex items-center justify-between ${i > 0 ? 'opacity-50' : ''}`}>
                            <span className="text-[11px] font-medium text-[var(--text-primary)]">{t}</span>
                            <ChevronRight className="w-3 h-3 text-[var(--text-tertiary)]" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return (
        <div className="w-full max-w-sm">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-[10px] font-medium text-[var(--text-secondary)] mb-1">Global retention</p>
                    <p className="text-3xl font-mono-tabular font-semibold text-[var(--text-primary)]">84%</p>
                </div>
                <div className="w-14 h-14 rounded-full border-[3px] border-[var(--border-default)] border-t-green-500 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-green-400" />
                </div>
            </div>
            <div className="space-y-2.5">
                {[100, 75, 40].map((w, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="h-1.5 flex-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${w}%` }} />
                        </div>
                        <span className="text-[10px] font-mono-tabular text-[var(--text-tertiary)] w-8">{w}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─── Extension mockup: browser chrome + side panel ─── */
function ExtensionMockup() {
    return (
        <div className="w-full bg-[var(--bg-surface-raised)] rounded-xl border border-[var(--border-default)] overflow-hidden shadow-[0_24px_80px_-24px_rgba(0,0,0,0.5)]">
            <div className="h-10 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] flex items-center px-4 gap-3">
                <div className="flex gap-1.5 flex-shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--bg-elevated)]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--bg-elevated)]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--bg-elevated)]" />
                </div>
                <div className="flex-1 h-6 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-md px-3 flex items-center max-w-md">
                    <span className="text-[10px] font-mono-tabular text-[var(--text-tertiary)] truncate">leetcode.com/problems/two-sum</span>
                </div>
            </div>
            <div className="flex">
                <div className="flex-1 p-6 space-y-3 hidden sm:block">
                    <div className="h-3 w-2/3 rounded bg-[var(--bg-elevated)]" />
                    <div className="h-2 w-full rounded bg-[var(--bg-elevated)] opacity-70" />
                    <div className="h-2 w-5/6 rounded bg-[var(--bg-elevated)] opacity-70" />
                    <div className="h-2 w-4/6 rounded bg-[var(--bg-elevated)] opacity-70" />
                    <div className="mt-6 h-24 rounded-lg bg-[var(--bg-elevated)] opacity-40" />
                </div>
                <div className="w-full sm:w-[240px] flex-shrink-0 border-l border-[var(--border-subtle)] bg-[var(--bg-app)] p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-5 h-5 rounded bg-green-500/10 flex items-center justify-center flex-shrink-0">
                            <Puzzle className="w-3 h-3 text-green-400" strokeWidth={1.75} />
                        </div>
                        <span className="text-[11px] font-semibold text-[var(--text-primary)]">ReStack</span>
                        <span className="ml-auto flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                            <span className="text-[9px] text-[var(--text-tertiary)]">Detected</span>
                        </span>
                    </div>
                    <p className="text-[9px] font-medium text-[var(--text-tertiary)] mb-1.5">Title</p>
                    <div className="h-7 rounded-md bg-[var(--bg-surface-raised)] border border-[var(--border-default)] px-2.5 flex items-center mb-3">
                        <span className="text-[10px] text-[var(--text-primary)] truncate">Two Sum</span>
                    </div>
                    <div className="flex gap-1.5 mb-4">
                        <span className="h-6 px-2.5 rounded-full bg-[var(--bg-surface-raised)] border border-[var(--border-default)] flex items-center text-[9px] font-medium text-[var(--text-secondary)]">Easy</span>
                        <span className="h-6 px-2.5 rounded-full bg-[var(--bg-surface-raised)] border border-[var(--border-default)] flex items-center text-[9px] font-medium text-[var(--text-secondary)]">LeetCode</span>
                    </div>
                    <div className={`w-full py-2 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 ${btnPrimary}`}>
                        <Plus className="w-3 h-3" />
                        Add to ReStack
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── FAQ Accordion Item ─── */
function FaqItem({ icon: Icon, q, a }: { icon: React.FC<{ className?: string }>; q: string; a: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="border-b border-[var(--border-subtle)] last:border-0">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-4 px-6 py-5 text-left group"
            >
                <Icon className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
                <span className="flex-1 text-[14px] font-medium text-[var(--text-primary)] group-hover:text-[var(--text-primary)] transition-colors">
                    {q}
                </span>
                <ChevronRight
                    className={`w-4 h-4 flex-shrink-0 text-[var(--text-tertiary)] transition-transform duration-300 ${open ? 'rotate-90' : ''}`}
                />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-48 pb-5' : 'max-h-0'}`}>
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed px-6 pl-14">{a}</p>
            </div>
        </div>
    );
}

/* ─── Landing Page ─── */
export default function LandingPage() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const spotlight = useSpotlight();
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('from') === 'email' || params.get('auth_warning') === '1' || params.get('redirect') === 'dashboard') {
            toast.warn('Please log in first to view your dashboard.', {
                toastId: 'email-auth-warning',
            });
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    }, []);

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            setActiveTab((prev) => (prev + 1) % showcaseTabs.length);
        }, 5000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [activeTab]);

    return (
        <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)]">

            {/* ═══ Navbar ═══ */}
            <nav className="sticky top-0 z-50 bg-[var(--bg-app)]/80 backdrop-blur-md border-b border-[var(--border-subtle)]">
                <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-4 md:gap-10">
                        <Logo textSize="text-[15px]" iconSize="w-6 h-6" variant="light" />

                        <div className="hidden md:flex items-center gap-7 text-[13px] font-medium text-[var(--text-secondary)]">
                            <a href="#features" className="hover:text-[var(--text-primary)] transition-colors">Features</a>
                            <a href="#how-it-works" className="hover:text-[var(--text-primary)] transition-colors">How it works</a>
                            <a href="#extension" className="hover:text-[var(--text-primary)] transition-colors">Extension</a>
                            <a href="#faq" className="hover:text-[var(--text-primary)] transition-colors">FAQ</a>
                        </div>
                    </div>

                    {/* Desktop Auth */}
                    <div className="hidden md:flex items-center gap-1">
                        <ThemeToggle className="p-2 mr-1" iconSize={16} />
                        <SignInButton mode="modal">
                            <button className="text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 py-1.5">
                                Sign in
                            </button>
                        </SignInButton>
                        <SignUpButton mode="modal">
                            <button className={`text-[13px] font-medium px-3.5 py-1.5 rounded-md ml-2 ${btnPrimary}`}>
                                Get started
                            </button>
                        </SignUpButton>
                    </div>

                    {/* Mobile Toggle */}
                    <div className="md:hidden flex items-center gap-1">
                        <ThemeToggle className="p-2" iconSize={16} />
                        <button
                            className="p-2 text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-md transition-colors"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            aria-label="Toggle Menu"
                        >
                            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Overlay */}
                <div className={`
                    absolute top-full left-0 w-full bg-[var(--bg-app)] border-b border-[var(--border-subtle)] overflow-hidden transition-all duration-300 md:hidden
                    ${isMenuOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}
                `}>
                    <div className="p-6 space-y-6">
                        <div className="flex flex-col gap-4">
                            <a
                                href="#features"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-[15px] font-medium text-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                Features
                            </a>
                            <a
                                href="#how-it-works"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-[15px] font-medium text-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                How it works
                            </a>
                            <a
                                href="#extension"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-[15px] font-medium text-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                Extension
                            </a>
                            <a
                                href="#faq"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-[15px] font-medium text-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                FAQ
                            </a>
                        </div>
                        <div className="pt-6 border-t border-[var(--border-subtle)] flex flex-col gap-3">
                            <SignInButton mode="modal">
                                <button className={`w-full py-3 font-medium text-[13px] rounded-md ${btnGhost}`}>
                                    Sign in
                                </button>
                            </SignInButton>
                            <SignUpButton mode="modal">
                                <button className={`w-full py-3 font-medium text-[13px] rounded-md ${btnPrimary}`}>
                                    Get started
                                </button>
                            </SignUpButton>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ═══ Hero Section ═══ */}
            <section className="relative pt-20 pb-24 px-6 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] pointer-events-none bg-glow" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[500px] pointer-events-none bg-dot-grid" />

                <div className="max-w-5xl mx-auto flex flex-col items-center relative">
                    <div className="text-center max-w-2xl mb-14">
                        <h1 className="text-4xl md:text-6xl font-semibold text-[var(--text-primary)] leading-[1.05] tracking-tight mb-6 animate-slideUp text-balance">
                            Stop forgetting the<br />problems you've solved.
                        </h1>

                        <p className="text-lg text-[var(--text-secondary)] mb-9 animate-slideUp delay-100 max-w-xl mx-auto leading-relaxed">
                            ReStack resurfaces what you've practiced right before you'd forget it, delivered
                            daily to your dashboard and inbox.
                        </p>

                        <div className="flex items-center justify-center animate-slideUp delay-200">
                            <SignUpButton mode="modal">
                                <button className={`w-full sm:w-auto px-5 py-2.5 text-[13px] font-medium rounded-md flex items-center justify-center gap-2 ${btnPrimary}`}>
                                    Get started for free
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </SignUpButton>
                        </div>
                    </div>
                </div>

                {/* ═══ App Screenshot — wider than every other section on the page, but not full-bleed ═══ */}
                <div className="w-full max-w-7xl mx-auto relative animate-slideUp delay-300">
                    <div className="bg-[var(--bg-surface-raised)] rounded-xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.07)] border border-[var(--border-default)] overflow-hidden">
                        <div className="h-10 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] flex items-center px-5 justify-between">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-[var(--bg-elevated)]" />
                                <div className="w-2.5 h-2.5 rounded-full bg-[var(--bg-elevated)]" />
                                <div className="w-2.5 h-2.5 rounded-full bg-[var(--bg-elevated)]" />
                            </div>
                            <div className="bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] px-4 py-1 rounded text-[11px] font-mono-tabular text-[var(--text-secondary)]">
                                app.restack.dev/dashboard
                            </div>
                            <div className="w-14" />
                        </div>
                        <img
                            src={dashboardPreview}
                            alt="ReStack dashboard showing today's focus and all tracked problems"
                            className="w-full h-auto block"
                        />
                    </div>
                </div>
            </section>

            {/* ═══ Tabbed Feature Showcase ═══ */}
            <section id="how-it-works" className="py-24 px-6 border-t border-[var(--border-subtle)]">
                <div className="max-w-6xl mx-auto">
                    <div className="max-w-xl mb-16">
                        <p className="text-[12px] font-medium text-green-400 mb-3">How it works</p>
                        <h2 className="text-2xl md:text-3xl font-semibold text-[var(--text-primary)] tracking-tight mb-3 leading-tight">
                            Purpose-built for one loop: practice, track, revisit.
                        </h2>
                        <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
                            No planning, no spreadsheets, just a rotation that keeps itself fresh.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
                        {/* Tab list */}
                        <div className="md:col-span-5 space-y-1">
                            {showcaseTabs.map((tab, i) => (
                                <button
                                    key={tab.label}
                                    onClick={() => setActiveTab(i)}
                                    className={`w-full text-left p-4 rounded-lg border transition-colors relative overflow-hidden ${activeTab === i
                                        ? 'bg-[var(--bg-surface-raised)] border-[var(--border-default)]'
                                        : 'bg-transparent border-transparent hover:bg-[var(--bg-surface)]'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 mb-1.5">
                                        <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${activeTab === i ? 'bg-green-500/10' : 'bg-[var(--bg-surface-raised)]'}`}>
                                            <tab.icon className={`w-3.5 h-3.5 ${activeTab === i ? 'text-green-400' : 'text-[var(--text-secondary)]'}`} strokeWidth={1.75} />
                                        </div>
                                        <span className={`text-[14px] font-semibold ${activeTab === i ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                                            {tab.label}
                                        </span>
                                    </div>
                                    {activeTab === i && (
                                        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed pl-10 pr-2">{tab.desc}</p>
                                    )}
                                    {activeTab === i && (
                                        <div className="mt-3 ml-10 h-[2px] bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                                            <div key={activeTab} className="h-full bg-green-500 animate-fillBar" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Mockup panel */}
                        <div className="md:col-span-7">
                            <div className="bg-[var(--bg-surface-raised)] rounded-xl border border-[var(--border-default)] overflow-hidden shadow-[0_24px_80px_-24px_rgba(0,0,0,0.5)]">
                                <div className="h-10 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] flex items-center px-5 gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--bg-elevated)]" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--bg-elevated)]" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--bg-elevated)]" />
                                </div>
                                <div className="bg-[var(--bg-app)] p-8 md:p-10 min-h-[280px] flex items-center justify-center">
                                    <ShowcaseMockup index={activeTab} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ Chrome extension ═══ */}
            <section id="extension" className="py-24 px-6 border-t border-[var(--border-subtle)]">
                <div className="max-w-6xl mx-auto">
                    <div className="relative rounded-2xl border border-green-500/25 bg-[linear-gradient(180deg,rgba(34,197,94,0.09),rgba(34,197,94,0.015)_55%,transparent)] overflow-hidden px-6 py-14 md:px-12 md:py-16 shadow-[0_0_0_1px_rgba(34,197,94,0.04),0_30px_90px_-40px_rgba(34,197,94,0.35)]">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[380px] pointer-events-none bg-glow opacity-80" />
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[380px] pointer-events-none bg-dot-grid opacity-40" />

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center relative">
                            <div className="md:col-span-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full bg-green-500 text-black">
                                        <Zap className="w-3 h-3" strokeWidth={2.5} />
                                        NEW
                                    </span>
                                    <p className="text-[12px] font-medium text-green-400 flex items-center gap-1.5">
                                        <Puzzle className="w-3.5 h-3.5" strokeWidth={2} />
                                        Chrome extension
                                    </p>
                                </div>
                                <h2 className="text-2xl md:text-3xl font-semibold text-[var(--text-primary)] tracking-tight mb-3 leading-tight">
                                    Add problems without leaving the tab.
                                </h2>
                                <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed mb-7">
                                    Open a problem on LeetCode, GeeksforGeeks, HackerRank, or NeetCode and click the ReStack icon.
                                    The side panel prefills the title, link, and difficulty straight off the page, so getting a problem
                                    into your rotation takes one click instead of a tab switch.
                                </p>

                                <div className="flex items-center gap-3 mb-8">
                                    {extensionPlatforms.map((mark) => (
                                        <div
                                            key={mark.name}
                                            className="platform-mark flex items-center justify-center w-8 h-8 rounded-md bg-[var(--bg-surface-raised)] border border-[var(--border-default)]"
                                            style={{ '--brand-hex': mark.hex } as React.CSSProperties}
                                            title={mark.name}
                                        >
                                            <PlatformIcon mark={mark} className="w-4 h-4 text-[var(--text-tertiary)]" />
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <div
                                        aria-disabled="true"
                                        className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold rounded-md border border-green-500/40 bg-green-500/10 text-green-300 cursor-not-allowed select-none"
                                    >
                                        <Chrome className="w-4 h-4" strokeWidth={1.75} />
                                        Get it on Chrome Web Store
                                    </div>
                                    <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-[var(--bg-surface-raised)] text-[var(--text-secondary)] border border-[var(--border-default)]">
                                        Coming soon
                                    </span>
                                </div>
                            </div>

                            <div className="md:col-span-7">
                                <ExtensionMockup />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ Under the hood: real algorithm, not vibes ═══ */}
            <section className="py-20 px-6 border-t border-[var(--border-subtle)] relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[300px] pointer-events-none bg-dot-grid opacity-60" />
                <div className="max-w-6xl mx-auto relative">
                    <div className="max-w-xl mb-10">
                        <p className="text-[12px] font-medium text-green-400 mb-3">Under the hood</p>
                        <h2 className="text-2xl md:text-3xl font-semibold text-[var(--text-primary)] tracking-tight leading-tight">
                            Real math, not vibes.
                        </h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] divide-x divide-y md:divide-y-0 divide-[var(--border-subtle)]">
                        {stats.map((s) => (
                            <div key={s.label} className="p-6">
                                <p className="text-[11px] font-medium text-[var(--text-secondary)] mb-2">{s.label}</p>
                                <p className="text-2xl font-mono-tabular font-semibold text-[var(--text-primary)] mb-1.5">{s.value}</p>
                                <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed">{s.hint}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ Features Grid ═══ */}
            <section id="features" className="py-24 px-6 border-t border-[var(--border-subtle)]">
                <div className="max-w-6xl mx-auto">
                    <div className="max-w-xl mb-14">
                        <p className="text-[12px] font-medium text-green-400 mb-3">Features</p>
                        <h2 className="text-2xl md:text-3xl font-semibold text-[var(--text-primary)] tracking-tight mb-3 leading-tight">
                            Everything you need to stay sharp.
                        </h2>
                        <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
                            Built around one core loop: practice, track, revisit.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        {features.map((f) => (
                            <div
                                key={f.title}
                                onMouseMove={spotlight}
                                className={`${f.span} spotlight-card bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] p-6 hover:border-[var(--border-strong)] transition-colors`}
                            >
                                <div className="w-8 h-8 rounded-md bg-green-500/10 flex items-center justify-center">
                                    <f.icon className="w-3.5 h-3.5 text-green-400" strokeWidth={1.75} />
                                </div>
                                <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mt-5 mb-1.5">{f.title}</h3>
                                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
                                <FeatureVisual type={f.visual} />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ Platform strip ═══ */}
            <section className="py-16 px-6 border-t border-[var(--border-subtle)]">
                <p className="text-center text-[12px] font-medium text-[var(--text-tertiary)] mb-9">Works with problems from any platform</p>
                <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
                    {platformMarks.map((mark) => (
                        <div
                            key={mark.name}
                            className="platform-mark group flex items-center gap-2.5"
                            style={{ '--brand-hex': mark.hex } as React.CSSProperties}
                        >
                            <PlatformIcon mark={mark} className="w-5 h-5 text-[var(--text-tertiary)] transition-colors duration-200" />
                            <span className="text-[14px] font-medium text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors duration-200">
                                {mark.name}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══ FAQ Section ═══ */}
            <section id="faq" className="py-24 px-6 border-t border-[var(--border-subtle)]">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row items-start gap-12">
                        <div className="w-full md:w-1/3">
                            <p className="text-[12px] font-medium text-green-400 mb-3">Support</p>
                            <h2 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight mb-3">FAQ</h2>
                            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                                Quick answers to common questions about the system.
                            </p>
                            <div className="mt-7">
                                <a href="mailto:support@restack.engineering" className="text-[13px] font-medium text-[var(--text-primary)] hover:text-green-400 transition-colors">
                                    Ask a question →
                                </a>
                            </div>
                        </div>

                        <div className="w-full md:w-2/3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                            {faqs.map((faq, i) => (
                                <FaqItem key={i} icon={faq.icon} q={faq.q} a={faq.a} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ Call to Action ═══ */}
            <section className="relative py-24 px-6 border-t border-[var(--border-subtle)] overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] pointer-events-none bg-glow" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] pointer-events-none bg-dot-grid" />
                <div className="relative max-w-6xl mx-auto text-center">
                    <h2 className="text-3xl md:text-5xl font-semibold text-[var(--text-primary)] leading-[1.05] tracking-tight mb-6 text-balance">
                        Ready to build your<br />
                        <span className="text-green-400">mastery ritual?</span>
                    </h2>

                    <p className="text-lg text-[var(--text-secondary)] mb-9 max-w-lg mx-auto leading-relaxed">
                        Stop guessing what to solve next. Add your first problem and let the rotation take it from here.
                    </p>

                    <SignUpButton mode="modal">
                        <button className={`px-6 py-3 text-[13px] font-medium rounded-md inline-flex items-center justify-center gap-2 ${btnPrimary}`}>
                            Get started for free
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </SignUpButton>
                </div>
            </section>

            {/* ═══ Footer ═══ */}
            <footer className="border-t border-[var(--border-subtle)] pt-16 pb-10 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-14">
                        <div className="col-span-1 md:col-span-1">
                            <Logo className="mb-4" iconSize="w-6 h-6" textSize="text-[15px]" variant="light" />
                            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed max-w-xs">
                                A spaced repetition system for DSA interview preparation.
                            </p>
                        </div>

                        <div>
                            <h4 className="text-[12px] font-medium text-[var(--text-primary)] mb-4">Product</h4>
                            <ul className="space-y-2.5">
                                <li><a href="#features" className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Features</a></li>
                                <li><a href="#how-it-works" className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">How it works</a></li>
                                <li><a href="#extension" className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Extension</a></li>
                                <li><a href="#faq" className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">FAQ</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-[12px] font-medium text-[var(--text-primary)] mb-4">Social</h4>
                            <ul className="space-y-2.5">
                                <li><a href="#" className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Twitter (X)</a></li>
                                <li><a href="#" className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">LinkedIn</a></li>
                                <li><a href="#" className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Instagram</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-[12px] font-medium text-[var(--text-primary)] mb-4">Platform</h4>
                            <ul className="space-y-2.5">
                                <li><a href="#" className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Status</a></li>
                                <li><a href="#" className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Terms</a></li>
                                <li><a href="#" className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Privacy</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-[var(--border-subtle)]">
                        <p className="text-[12px] text-[var(--text-tertiary)]">
                            © {new Date().getFullYear()} ReStack. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
