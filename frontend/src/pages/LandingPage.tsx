import { useState } from 'react';
import {
    Mail,
    Brain,
    ChevronRight,
    ArrowRight,
    Sparkles,
    Target,
    BarChart3,
    Zap,
    CheckCircle2,
    Menu,
    X,
    Shield,
    Search,
    Clock,
    HelpCircle,
    Plus,
} from 'lucide-react';
import { SignInButton, SignUpButton } from '@clerk/clerk-react';
import Logo from '../components/Logo';

/* ─── Data ─── */
const platforms = [
    'LeetCode', 'HackerRank', 'Codeforces', 'CodeSignal',
    'AlgoExpert', 'NeetCode', 'GeeksforGeeks', 'TopCoder',
    'InterviewBit', 'Codewars', 'AtCoder', 'SPOJ',
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
        a: "Any platform with a URL! LeetCode, HackerRank, Codeforces, NeetCode, AlgoExpert — just paste the problem link and we'll track it for you.",
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
        a: 'When you feel confident about a problem, you can retire it. It moves to your archive — out of the daily rotation but always accessible if you want to bring it back.',
    },
];

/* ─── FAQ Accordion Item ─── */
function FaqItem({ icon: Icon, q, a }: { icon: React.FC<{ className?: string }>; q: string; a: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="border-b border-gray-200/80 last:border-0">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-4 py-5 text-left group"
            >
                <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <span className="flex-1 text-[15px] font-semibold text-gray-900 group-hover:text-gray-600 transition-colors">
                    {q}
                </span>
                <ChevronRight
                    className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform duration-300 ${open ? 'rotate-90' : ''}`}
                />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-48 pb-5' : 'max-h-0'}`}>
                <p className="text-sm text-gray-500 leading-relaxed pl-9">{a}</p>
            </div>
        </div>
    );
}

/* ─── Landing Page ─── */
export default function LandingPage() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-warm)' }}>

            {/* ═══ Glass Navbar ═══ */}
            <nav className="sticky top-0 z-50 glass border-b border-white/20">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4 md:gap-8">
                        <Logo textSize="text-lg" />

                        <div className="hidden md:flex items-center gap-8 text-[13px] font-bold text-gray-400">
                            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
                            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">Methodology</a>
                            <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
                        </div>
                    </div>

                    {/* Desktop Auth */}
                    <div className="hidden md:flex items-center gap-4">
                        <SignInButton mode="modal">
                            <button className="text-[13px] font-black text-gray-400 hover:text-gray-900 transition-colors px-3 py-2">
                                Sign In
                            </button>
                        </SignInButton>
                        <SignUpButton mode="modal">
                            <button className="text-[13px] font-black bg-gray-800 text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 uppercase tracking-widest">
                                Get Started
                            </button>
                        </SignUpButton>
                    </div>

                    {/* Mobile Toggle */}
                    <button
                        className="md:hidden p-2 text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Toggle Menu"
                    >
                        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile Overlay */}
                <div className={`
                    absolute top-full left-0 w-full glass-dark border-b border-white/10 overflow-hidden transition-all duration-300 md:hidden
                    ${isMenuOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}
                `}>
                    <div className="p-6 space-y-6">
                        <div className="flex flex-col gap-4">
                            <a
                                href="#features"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-lg font-bold text-white/70 hover:text-white transition-colors"
                            >
                                Features
                            </a>
                            <a
                                href="#how-it-works"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-lg font-bold text-white/70 hover:text-white transition-colors"
                            >
                                Methodology
                            </a>
                            <a
                                href="#faq"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-lg font-bold text-white/70 hover:text-white transition-colors"
                            >
                                FAQ
                            </a>
                        </div>
                        <div className="pt-6 border-t border-white/10 flex flex-col gap-4">
                            <SignInButton mode="modal">
                                <button className="w-full py-4 text-white font-black uppercase tracking-widest text-sm border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
                                    Sign In
                                </button>
                            </SignInButton>
                            <SignUpButton mode="modal">
                                <button className="w-full py-4 bg-green-500 text-white font-black uppercase tracking-widest text-sm rounded-xl hover:bg-green-600 transition-all">
                                    Get Started
                                </button>
                            </SignUpButton>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ═══ Hero Section ═══ */}
            <section className="relative pt-24 pb-32 px-6 overflow-hidden">
                {/* Background Decorations */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[600px] pointer-events-none">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-green-200/20 rounded-full blur-[120px] animate-pulse-soft" />
                    <div className="absolute top-40 right-10 w-96 h-96 bg-sage-200/30 rounded-full blur-[120px] animate-pulse-soft delay-1000" />
                </div>

                <div className="max-w-6xl mx-auto flex flex-col items-center">
                    <div className="text-center max-w-3xl mb-16">
                        {/* New Tagline */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border-gray-200 mb-8 animate-slideDown">
                            <span className="flex w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[11px] font-black text-gray-600 uppercase tracking-widest">Engineering grade retention engine</span>
                        </div>

                        {/* Title */}
                        <h1 className="text-5xl md:text-7xl font-black text-gray-900 leading-[0.9] tracking-tighter mb-8 animate-slideUp text-balance">
                            Stop forgetting.<br />
                            <span className="text-green-600">Start Mastering.</span>
                        </h1>

                        <p className="text-lg md:text-xl font-medium text-gray-500 mb-10 animate-slideUp delay-100 max-w-2xl mx-auto leading-relaxed">
                            The simple way to track your DSA journey and master every problem through smart daily reviews.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slideUp delay-200">
                            <SignUpButton mode="modal">
                                <button className="w-full sm:w-auto px-10 py-5 bg-gray-800 text-white text-sm font-black rounded-2xl hover:bg-gray-800 transition-all shadow-2xl shadow-gray-300 uppercase tracking-widest flex items-center justify-center gap-3">
                                    <Sparkles className="w-4 h-4 text-green-400" />
                                    Get Started for Free
                                </button>
                            </SignUpButton>
                            <a href="#how-it-works" className="w-full sm:w-auto px-10 py-5 glass text-gray-900 text-sm font-black rounded-2xl hover:bg-gray-50 transition-all uppercase tracking-widest text-center border-gray-200">
                                View Methodology
                            </a>
                        </div>
                    </div>

                    {/* ═══ App Mockup Visual ═══ */}
                    <div className="relative w-full max-w-5xl animate-slideUp delay-300">
                        <div className="bg-white rounded-[40px] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.1)] border-8 border-gray-900/5 overflow-hidden">
                            {/* Browser/System Bar */}
                            <div className="h-14 bg-gray-50 border-b border-gray-100 flex items-center px-8 justify-between">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-200" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-200" />
                                    <div className="w-3 h-3 rounded-full bg-green-200" />
                                </div>
                                <div className="bg-white border border-gray-100 px-4 py-1.5 rounded-lg text-[11px] font-bold text-gray-300 flex items-center gap-2">
                                    <Shield className="w-3 h-3" />
                                    restack.engineering/dashboard
                                </div>
                                <div className="w-16" />
                            </div>

                            {/* Mockup Dashboard Content */}
                            <div className="bg-[#F5F0EB] p-8 md:p-12">
                                <div className="max-w-4xl mx-auto">
                                    <div className="flex items-end justify-between mb-12">
                                        <div>
                                            <h3 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Build your ritual.</h3>
                                            <p className="text-sm font-medium text-gray-400">3 problems prioritized for current recall capacity.</p>
                                        </div>
                                        <div className="hidden md:flex gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                                                <Target className="w-5 h-5 text-green-500" />
                                            </div>
                                            <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                                                <Zap className="w-5 h-5 text-gray-300" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                                        {[
                                            { title: 'Merge K Lists', diff: 'Hard', weight: 'High' },
                                            { title: '3Sum', diff: 'Medium', weight: 'Med' },
                                            { title: 'Max Path Sum', diff: 'Hard', weight: 'Low' }
                                        ].map((p, i) => (
                                            <div key={i} className={`p-6 rounded-3xl bg-white border border-gray-200/80 shadow-sm ${i === 0 ? 'ring-2 ring-green-500 scale-[1.02]' : ''}`}>
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${p.diff === 'Hard' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'}`}>
                                                        {p.diff}
                                                    </span>
                                                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{p.weight} Weight</span>
                                                </div>
                                                <h4 className="text-lg font-black text-gray-900 mb-6 truncate">{p.title}</h4>
                                                <button className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${i === 0 ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-400'}`}>
                                                    {i === 0 ? 'Revisit Now' : 'Pending'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Stats snippet */}
                                    <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden flex items-center p-6 gap-8">
                                        <div className="flex-1 flex items-center gap-6">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Consistency</p>
                                                <p className="text-xl font-black text-gray-900">14 Days</p>
                                            </div>
                                            <div className="h-8 w-px bg-gray-100" />
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Mastered</p>
                                                <p className="text-xl font-black text-gray-900">128</p>
                                            </div>
                                        </div>
                                        <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="w-2/3 h-full bg-green-500 rounded-full" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating Decoration Cards */}
                        <div className="absolute -top-10 -right-12 hidden lg:block animate-floating">
                            <div className="glass p-5 rounded-2xl shadow-xl w-48">
                                <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2">Mastery Alert</p>
                                <p className="text-sm font-bold text-gray-900 leading-tight">LRU Cache is decaying. Revisit encouraged.</p>
                            </div>
                        </div>
                        <div className="absolute bottom-20 -left-16 hidden lg:block animate-floating delay-500">
                            <div className="glass p-5 rounded-2xl shadow-xl w-56">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                        <Mail className="w-4 h-4 text-green-600" />
                                    </div>
                                    <p className="text-xs font-black text-gray-900">Daily Digest Sent</p>
                                </div>
                                <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="w-full h-full bg-green-500 animate-slideX" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* ═══ Stats & Social Proof ═══ */}
            <section className="pb-32 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-12 border-y border-gray-200/60 py-16">
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-3">Built for the elite 1%.</h2>
                            <p className="text-base font-medium text-gray-400 max-w-sm">Trusted by engineers at top-tier tech firms to maintain their competitive edge.</p>
                        </div>
                        <div className="flex gap-16">
                            {[
                                { label: 'Active Users', value: '12k+' },
                                { label: 'Problems Solved', value: '1.2M' },
                                { label: 'Retention Lift', value: '3.4x' }
                            ].map((s, i) => (
                                <div key={i} className="text-center md:text-left">
                                    <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.2em] mb-2">{s.label}</p>
                                    <p className="text-3xl font-black text-gray-900 tracking-tighter">{s.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ How It Works ═══ */}
            <section id="how-it-works" className="py-32 px-6 relative overflow-hidden bg-white/30">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-24 animate-slideUp">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest mb-6">
                            The Workflow
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter mb-6 leading-[1.1]">
                            How it works.
                        </h2>
                        <p className="text-lg font-medium text-gray-500 max-w-2xl mx-auto">
                            Four simple steps to guarantee you never forget a technical problem again.
                        </p>
                    </div>

                    <div className="relative space-y-24 md:space-y-48">
                        {/* SVG Path Connectors (Desktop Only) */}
                        <svg className="hidden md:block absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-visible" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#22C55E" stopOpacity="0" />
                                    <stop offset="20%" stopColor="#22C55E" stopOpacity="0.2" />
                                    <stop offset="80%" stopColor="#22C55E" stopOpacity="0.2" />
                                    <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            {/* Path 1 -> 2 */}
                            <path d="M 75% 150 Q 75% 250, 50% 250 T 25% 350" fill="none" stroke="url(#lineGradient)" strokeWidth="2" strokeDasharray="8 8" className="animate-pulse-soft" />
                            {/* Path 2 -> 3 */}
                            <path d="M 25% 650 Q 25% 750, 50% 750 T 75% 850" fill="none" stroke="url(#lineGradient)" strokeWidth="2" strokeDasharray="8 8" className="animate-pulse-soft" />
                            {/* Path 3 -> 4 */}
                            <path d="M 75% 1150 Q 75% 1250, 50% 1250 T 25% 1350" fill="none" stroke="url(#lineGradient)" strokeWidth="2" strokeDasharray="8 8" className="animate-pulse-soft" />
                        </svg>

                        {[
                            {
                                step: '01',
                                title: 'Link Your Account',
                                desc: 'Sign in securely with Clerk. We keep your data private and scoped to you, so your mastery journey is yours alone.',
                                icon: Shield,
                                mockup: (
                                    <div className="relative w-full aspect-video bg-gray-800 rounded-[32px] overflow-hidden p-6 flex items-center justify-center border border-white/10 group-hover:scale-[1.02] transition-transform duration-500 shadow-2xl">
                                        <div className="glass p-8 rounded-2xl w-full max-w-xs text-center border-white/5">
                                            <div className="w-12 h-12 bg-green-500 rounded-xl mx-auto mb-6 flex items-center justify-center">
                                                <Target className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="h-2 w-full bg-white/10 rounded-full mb-3" />
                                            <div className="h-2 w-2/3 bg-white/5 rounded-full mx-auto" />
                                            <div className="mt-8 py-3 bg-white text-gray-900 text-[11px] font-black uppercase tracking-widest rounded-xl">
                                                Continue with Google
                                            </div>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                step: '02',
                                title: 'Build Your Library',
                                desc: 'Paste a link from LeetCode, NeetCode, or any site. We index the problem title and difficulty instantly.',
                                icon: Search,
                                mockup: (
                                    <div className="relative w-full aspect-video bg-[#F5F0EB] rounded-[32px] overflow-hidden p-6 flex items-center justify-center border border-gray-200 group-hover:scale-[1.02] transition-transform duration-500 shadow-2xl">
                                        <div className="w-full max-w-sm space-y-4">
                                            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Paste URL</p>
                                                <div className="flex gap-2">
                                                    <div className="h-10 flex-1 bg-gray-50 rounded-xl border border-gray-100 px-4 flex items-center">
                                                        <span className="text-[11px] font-medium text-gray-300">leetcode.com/problems/lru-cache</span>
                                                    </div>
                                                    <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center">
                                                        <Plus className="w-4 h-4 text-green-400" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="h-8 px-4 bg-white rounded-full border border-gray-200 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                                    <span className="text-[10px] font-bold text-gray-400">Hard</span>
                                                </div>
                                                <div className="h-8 px-4 bg-white rounded-full border border-gray-200 flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                        Index Successfully
                                                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                step: '03',
                                title: 'Daily Email Reminders',
                                desc: 'Our core feature. Wake up to a personalized set of 3-5 problems you need to revisit to maintain peak retention. No more planning.',
                                icon: Mail,
                                highlight: true,
                                mockup: (
                                    <div className="relative w-full aspect-video bg-[#EEF2ED] rounded-[32px] overflow-hidden p-6 flex flex-col items-center group-hover:scale-[1.02] transition-transform duration-500 shadow-2xl">
                                        <div className="w-full max-w-[240px] bg-white rounded-3xl shadow-2xl shadow-green-900/5 overflow-hidden border border-gray-100 mt-4">
                                            <div className="bg-green-600 p-4 text-center">
                                                <Logo variant="light" iconSize="w-5 h-5" textSize="text-xs" showText={false} />
                                            </div>
                                            <div className="p-5 space-y-4">
                                                <div className="text-center">
                                                    <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Your Daily Recall</p>
                                                    <h4 className="text-sm font-black text-gray-900 leading-tight">3 Problems for Today</h4>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                                                        <span className="text-[11px] font-bold text-gray-900">1. LRU Cache</span>
                                                        <ChevronRight className="w-3 h-3 text-gray-400" />
                                                    </div>
                                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between opacity-50">
                                                        <span className="text-[11px] font-bold text-gray-900">2. Merge K Lists</span>
                                                        <ChevronRight className="w-3 h-3 text-gray-400" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Floating Notification */}
                                        <div className="absolute top-4 right-4 bg-white p-3 rounded-2xl shadow-xl w-40 animate-floating border border-gray-100">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-green-50 rounded-lg flex items-center justify-center">
                                                    <Mail className="w-3 h-3 text-green-600" />
                                                </div>
                                                <p className="text-[9px] font-bold text-gray-900">New Daily Digest</p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                step: '04',
                                title: 'Track Your Mastery',
                                desc: 'Mark problems as revisited and watch your mastery curve grow. Our system knows exactly when to nudge you next.',
                                icon: Zap,
                                mockup: (
                                    <div className="relative w-full aspect-video bg-white rounded-[32px] overflow-hidden p-6 flex items-center justify-center border border-gray-100 group-hover:scale-[1.02] transition-transform duration-500 shadow-2xl">
                                        <div className="w-full max-w-sm">
                                            <div className="flex items-center justify-between mb-8">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Retention</p>
                                                    <p className="text-3xl font-black text-gray-900 tracking-tighter">84%</p>
                                                </div>
                                                <div className="w-16 h-16 rounded-full border-4 border-gray-100 border-t-green-500 flex items-center justify-center">
                                                    <Zap className="w-6 h-6 text-green-500" />
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} className="flex items-center gap-4">
                                                        <div className={`h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden`}>
                                                            <div className="h-full bg-green-500 rounded-full transition-all duration-1000" style={{ width: i === 1 ? '100%' : i === 2 ? '75%' : '40%' }} />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-gray-300 w-8">{i === 1 ? '100%' : i === 2 ? '75%' : '40%'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )
                            }
                        ].map((item, i) => (
                            <div key={i} className={`group relative grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 items-center z-10`}>
                                <div className={`space-y-8 ${i % 2 !== 0 ? 'md:order-2' : ''}`}>
                                    <div className="inline-flex items-center gap-4">
                                        <span className="text-8xl font-black text-gray-900/5 tracking-tighter transition-colors group-hover:text-green-500/10 leading-none">
                                            {item.step}
                                        </span>
                                        <div className={`h-1 w-12 rounded-full ${item.highlight ? 'bg-green-500' : 'bg-gray-200'}`} />
                                    </div>
                                    <div className="space-y-6">
                                        <h3 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-[1.1] group-hover:text-green-600 transition-colors">
                                            {item.title}
                                        </h3>
                                        <p className="text-lg font-medium text-gray-500 leading-relaxed max-w-md">
                                            {item.desc}
                                        </p>
                                        {i % 2 === 0 ? (
                                            <div className="flex items-center gap-2 text-green-600 font-bold text-sm tracking-wide">
                                                <span>Step {item.step} Complete</span>
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                <div className={`${i % 2 !== 0 ? 'md:order-1' : ''} relative`}>
                                    {/* Mobile Connector */}
                                    {i < 3 && (
                                        <div className="md:hidden absolute top-full left-1/2 -translate-x-1/2 h-24 w-px border-l-2 border-dashed border-gray-200 mt-4" />
                                    )}
                                    {item.mockup}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ The Bento Grid ═══ */}
            <section id="features" className="py-32 px-6 bg-white/50 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-50/20 to-transparent pointer-events-none" />
                <div className="max-w-6xl mx-auto relative z-10">
                    <div className="text-center mb-16 md:mb-24 px-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest mb-6">
                            Features
                        </div>
                        <h2 className="text-3xl sm:text-4xl md:text-6xl font-black text-gray-900 tracking-tighter mb-6 leading-[1.1] md:leading-none">The system for mastery.</h2>
                        <p className="text-base md:text-xl font-medium text-gray-500 max-w-2xl mx-auto">Everything you need to stay sharp and ready for any interview.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 auto-rows-[280px]">
                        {/* Big Card — Spaced Repetition */}
                        <div className="md:col-span-8 md:row-span-2 bg-gray-800 rounded-[32px] md:rounded-[48px] p-8 md:p-12 overflow-hidden relative group shadow-2xl shadow-gray-900/10">
                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div>
                                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6 md:mb-8 border border-white/10 group-hover:scale-110 transition-transform">
                                        <Brain className="w-6 h-6 md:w-7 md:h-7 text-green-400" />
                                    </div>
                                    <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4 md:mb-6 text-balance leading-[0.9]">Smart Scheduling Algorithm.</h3>
                                    <p className="text-gray-400 text-sm md:text-lg max-w-md leading-relaxed">We track how long it takes for you to start forgetting a problem and schedule your next review right before that happens.</p>
                                </div>
                                <div className="flex flex-wrap gap-2 md:gap-4 mt-6">
                                    <span className="px-3 md:px-4 py-1.5 bg-green-500/10 text-green-400 text-[9px] md:text-[11px] font-black uppercase tracking-widest rounded-full border border-green-500/20">Spaced Repetition</span>
                                </div>
                            </div>
                            {/* Decorative Background */}
                            <div className="absolute top-0 right-0 w-2/3 h-full overflow-hidden opacity-30 group-hover:opacity-50 transition-opacity">
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] transform -rotate-12 translate-x-20" />
                            </div>
                        </div>

                        {/* Med Card — Daily Digest */}
                        <div className="md:col-span-4 md:row-span-2 bg-white rounded-[32px] md:rounded-[48px] border border-gray-200/80 p-8 md:p-10 shadow-sm hover:shadow-2xl hover:shadow-gray-200/50 transition-all flex flex-col justify-between group">
                            <div>
                                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-green-50 flex items-center justify-center mb-6 md:mb-8 border border-green-100 group-hover:rotate-6 transition-transform">
                                    <Mail className="w-6 h-6 md:w-7 md:h-7 text-green-600" />
                                </div>
                                <h3 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mb-4 md:mb-6 leading-tight">Your Daily Focus Set.</h3>
                                <p className="text-gray-500 text-sm md:text-base leading-relaxed">Wake up to 3 problems waiting in your inbox. No more spending time deciding what to solve next.</p>
                            </div>
                            <div className="bg-gray-50 rounded-2xl md:rounded-3xl p-5 md:p-6 border border-gray-100 mt-6 md:mt-8">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Incoming 08:30 AM</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-2 w-full bg-white rounded-full border border-gray-100" />
                                </div>
                            </div>
                        </div>

                        {/* Wide Card — Universal Integration */}
                        <div className="md:col-span-6 md:row-span-1 bg-white rounded-[32px] md:rounded-[48px] border border-gray-200/80 p-8 md:p-10 shadow-sm hover:shadow-2xl hover:shadow-gray-200/50 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-6 md:gap-10 group">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-gray-800 group-hover:border-gray-900 transition-all flex-shrink-0">
                                <Search className="w-8 h-8 md:w-10 md:h-10 text-gray-400 group-hover:text-green-400 transition-colors" />
                            </div>
                            <div>
                                <h3 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight mb-2">Practice Anywhere.</h3>
                                <p className="text-gray-400 text-sm font-medium leading-relaxed">We support LeetCode, NeetCode, and custom URLs. We unify all your preparation in one place.</p>
                            </div>
                        </div>

                        {/* Small Card — AI */}
                        <div className="md:col-span-3 md:row-span-1 bg-[#D4DDD2] rounded-[32px] md:rounded-[48px] border border-[#C5CDC2] p-8 md:p-10 flex flex-col justify-between group overflow-hidden relative shadow-sm hover:shadow-xl hover:shadow-[#D4DDD2]/50 transition-all">
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-3">
                                    <h3 className="text-lg md:text-xl font-black text-gray-900">AI Nudges</h3>
                                    <span className="px-2 py-0.5 bg-white text-green-700 text-[9px] font-black rounded uppercase tracking-widest border border-green-100">Beta</span>
                                </div>
                                <p className="text-gray-600 text-xs md:text-[13px] font-medium leading-relaxed max-w-[140px] md:max-w-none">Smart hints that help you when you're stuck on a revisit.</p>
                            </div>
                            <Sparkles className="absolute -right-4 -bottom-4 md:-right-6 md:-bottom-6 w-24 h-24 md:w-32 md:h-32 text-white/50 rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-transform" />
                        </div>

                        {/* Small Card — Archive */}
                        <div className="md:col-span-3 md:row-span-1 bg-white rounded-[32px] md:rounded-[48px] border border-gray-200/80 p-8 md:p-10 shadow-sm hover:shadow-2xl hover:shadow-gray-200/50 transition-all flex flex-col justify-between group">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg md:text-xl font-black text-gray-900">The Vault.</h3>
                                <Shield className="w-5 h-5 md:w-6 md:h-6 text-gray-300 group-hover:text-gray-900 transition-colors" />
                            </div>
                            <p className="text-gray-400 text-xs md:text-[13px] font-medium leading-relaxed">Retire problems you've fully mastered and keep your daily rotation fresh.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ Company Marquee ═══ */}
            <section className="py-20 border-y border-gray-300/40 overflow-hidden bg-white/30 backdrop-blur-2xl">
                <div className="animate-marquee flex items-center gap-32 whitespace-nowrap w-max">
                    {[...platforms, ...platforms].map((name, i) => (
                        <span
                            key={i}
                            className="text-2xl font-black text-gray-200 select-none tracking-[0.3em] uppercase transition-colors hover:text-green-500/20"
                        >
                            {name}
                        </span>
                    ))}
                </div>
            </section>


            {/* ═══ FAQ Section ═══ */}
            <section id="faq" className="py-32 px-6 bg-gray-50">
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-col md:flex-row items-start gap-12">
                        <div className="w-full md:w-1/3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-gray-200 text-[10px] font-black uppercase tracking-widest mb-6">
                                Support
                            </div>
                            <h2 className="text-4xl font-black text-gray-900 tracking-tighter mb-4">FAQ</h2>
                            <p className="text-sm font-medium text-gray-500 leading-relaxed">
                                Quick answers to common questions about our system.
                            </p>
                            <div className="mt-8">
                                <a href="mailto:support@restack.engineering" className="text-xs font-black text-gray-900 uppercase tracking-widest hover:text-green-600 transition-colors">
                                    Ask a question →
                                </a>
                            </div>
                        </div>

                        <div className="w-full md:w-2/3 space-y-4">
                            {faqs.map((faq, i) => (
                                <div key={i} className="bg-white rounded-[24px] border border-gray-100 p-2 overflow-hidden hover:shadow-lg transition-all duration-300">
                                    <FaqItem icon={faq.icon} q={faq.q} a={faq.a} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ Call to Action ═══ */}
            <section className="relative py-32 px-6 overflow-hidden">
                <div className="absolute inset-0 bg-gray-800 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-[120px] animate-pulse-soft" />
                </div>

                <div className="relative max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8">
                        <span className="flex w-2 h-2 rounded-full bg-green-400" />
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Start Mastering Today</span>
                    </div>

                    <h2 className="text-4xl md:text-6xl font-black text-white leading-[0.9] tracking-tighter mb-8 text-balance">
                        Ready to build your<br />
                        <span className="text-green-400">mastery ritual?</span>
                    </h2>

                    <p className="text-lg md:text-xl font-medium text-gray-400 mb-12 max-w-xl mx-auto leading-relaxed">
                        Stop guessing what to solve next. Join engineers who've automated their retention and started mastering. No spreadsheets, just success.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <SignUpButton mode="modal">
                            <button className="w-full sm:w-auto px-10 py-5 bg-white text-gray-900 text-sm font-black rounded-2xl hover:bg-gray-100 transition-all shadow-2xl shadow-green-500/10 uppercase tracking-widest flex items-center justify-center gap-3">
                                Get Started Now
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </SignUpButton>
                    </div>

                    {/* Social proof badge */}
                    <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-center gap-8">
                        <div className="flex -space-x-3">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="w-10 h-10 rounded-full border-2 border-gray-900 bg-gray-800 flex items-center justify-center">
                                    <span className="text-[10px] font-black text-gray-500">ENG</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
                            Used by engineers at <span className="text-white">FAANG+</span>
                        </p>
                    </div>
                </div>
            </section>

            {/* ═══ Footer ═══ */}
            <footer className="bg-white border-t border-gray-100 pt-24 pb-12 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
                        {/* Brand */}
                        <div className="col-span-1 md:col-span-1">
                            <Logo className="mb-6" iconSize="w-7 h-7" textSize="text-lg" />
                            <p className="text-sm font-medium text-gray-400 leading-relaxed max-w-xs">
                                The highly-opinionated spaced repetition system for high-stakes interview preparation.
                            </p>
                        </div>

                        {/* Navigation Groups */}
                        <div>
                            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-6">Product</h4>
                            <ul className="space-y-4">
                                <li><a href="#features" className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">Mastery Engine</a></li>
                                <li><a href="#how-it-works" className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">Methodology</a></li>
                                <li><a href="#faq" className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">Engineering FAQ</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-6">Social</h4>
                            <ul className="space-y-4">
                                <li><a href="#" className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">Twitter (X)</a></li>
                                <li><a href="#" className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">LinkedIn</a></li>
                                <li><a href="#" className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">Instagram</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-6">Platform</h4>
                            <ul className="space-y-4">
                                <li><a href="#" className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">Status</a></li>
                                <li><a href="#" className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">Terms</a></li>
                                <li><a href="#" className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">Privacy</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-12 border-t border-gray-50">
                        <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest">
                            © {new Date().getFullYear()} RESTACK SYSTEMS. ALL RIGHTS RESERVED.
                        </p>
                        <div className="flex gap-8">
                            <span className="text-[10px] font-black text-gray-200">v1.2.0-STABLE</span>
                            <span className="text-[10px] font-black text-gray-200">BUILD ID: 494B-X82</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
