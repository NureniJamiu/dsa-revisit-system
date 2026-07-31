import { useState } from 'react';
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
} from 'lucide-react';
import { SignInButton, SignUpButton } from '@clerk/clerk-react';
import Logo from '../components/Logo';

/* ─── Data ─── */
const platforms = [
    'LeetCode', 'HackerRank', 'Codeforces', 'NeetCode', 'AlgoExpert', 'Codewars',
];

const steps = [
    {
        step: '01',
        title: 'Link your account',
        desc: 'Sign in securely with Clerk. Your problem list, history, and settings are scoped to you alone.',
        icon: Shield,
    },
    {
        step: '02',
        title: 'Build your library',
        desc: 'Paste a link from LeetCode, NeetCode, or anywhere else. We track the title and difficulty for you.',
        icon: Search,
    },
    {
        step: '03',
        title: 'Get a daily focus set',
        desc: 'Each morning we surface a handful of problems chosen by a weighted spaced-repetition algorithm — right before you\'d start forgetting them.',
        icon: Mail,
    },
    {
        step: '04',
        title: 'Track your mastery',
        desc: 'Mark problems as revisited and retire the ones you\'ve mastered. The rotation adjusts automatically.',
        icon: CheckCircle2,
    },
];

const features = [
    {
        icon: Brain,
        title: 'Weighted spaced repetition',
        desc: 'Problems resurface based on age, days since your last revisit, and how many times you\'ve solved them — never fully random, never forgotten.',
        span: 'md:col-span-7',
    },
    {
        icon: Mail,
        title: 'Daily focus set',
        desc: 'The same deterministic selection shows up on your dashboard and in your inbox, all day.',
        span: 'md:col-span-5',
    },
    {
        icon: Search,
        title: 'Practice anywhere',
        desc: 'LeetCode, HackerRank, Codeforces, or any custom URL — one place to track it all.',
        span: 'md:col-span-4',
    },
    {
        icon: BarChart3,
        title: 'Revisit history',
        desc: 'Every review is logged, so you can see exactly how a problem\'s mastery has progressed.',
        span: 'md:col-span-4',
    },
    {
        icon: Shield,
        title: 'The archive',
        desc: 'Retire problems you\'ve fully mastered. Out of rotation, never deleted.',
        span: 'md:col-span-4',
    },
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
        <div className="border-b border-white/[0.06] last:border-0">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-4 py-5 text-left group"
            >
                <Icon className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                <span className="flex-1 text-[14px] font-medium text-zinc-100 group-hover:text-zinc-300 transition-colors">
                    {q}
                </span>
                <ChevronRight
                    className={`w-4 h-4 flex-shrink-0 text-zinc-600 transition-transform duration-300 ${open ? 'rotate-90' : ''}`}
                />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-48 pb-5' : 'max-h-0'}`}>
                <p className="text-[13px] text-zinc-500 leading-relaxed pl-8">{a}</p>
            </div>
        </div>
    );
}

/* ─── Landing Page ─── */
export default function LandingPage() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">

            {/* ═══ Navbar ═══ */}
            <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-white/[0.06]">
                <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-4 md:gap-10">
                        <Logo textSize="text-[15px]" iconSize="w-6 h-6" variant="light" />

                        <div className="hidden md:flex items-center gap-7 text-[13px] font-medium text-zinc-500">
                            <a href="#features" className="hover:text-zinc-100 transition-colors">Features</a>
                            <a href="#how-it-works" className="hover:text-zinc-100 transition-colors">How it works</a>
                            <a href="#faq" className="hover:text-zinc-100 transition-colors">FAQ</a>
                        </div>
                    </div>

                    {/* Desktop Auth */}
                    <div className="hidden md:flex items-center gap-1">
                        <SignInButton mode="modal">
                            <button className="text-[13px] font-medium text-zinc-400 hover:text-zinc-100 transition-colors px-3 py-1.5">
                                Sign in
                            </button>
                        </SignInButton>
                        <SignUpButton mode="modal">
                            <button className="text-[13px] font-medium bg-zinc-100 text-zinc-900 px-3.5 py-1.5 rounded-md hover:bg-white transition-colors ml-2">
                                Get started
                            </button>
                        </SignUpButton>
                    </div>

                    {/* Mobile Toggle */}
                    <button
                        className="md:hidden p-2 text-zinc-100 hover:bg-white/[0.06] rounded-md transition-colors"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Toggle Menu"
                    >
                        {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>

                {/* Mobile Overlay */}
                <div className={`
                    absolute top-full left-0 w-full bg-zinc-950 border-b border-white/[0.06] overflow-hidden transition-all duration-300 md:hidden
                    ${isMenuOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}
                `}>
                    <div className="p-6 space-y-6">
                        <div className="flex flex-col gap-4">
                            <a
                                href="#features"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-[15px] font-medium text-zinc-300 hover:text-zinc-100 transition-colors"
                            >
                                Features
                            </a>
                            <a
                                href="#how-it-works"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-[15px] font-medium text-zinc-300 hover:text-zinc-100 transition-colors"
                            >
                                How it works
                            </a>
                            <a
                                href="#faq"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-[15px] font-medium text-zinc-300 hover:text-zinc-100 transition-colors"
                            >
                                FAQ
                            </a>
                        </div>
                        <div className="pt-6 border-t border-white/[0.06] flex flex-col gap-3">
                            <SignInButton mode="modal">
                                <button className="w-full py-3 text-zinc-100 font-medium text-[13px] border border-white/[0.08] rounded-md hover:bg-white/[0.04] transition-colors">
                                    Sign in
                                </button>
                            </SignInButton>
                            <SignUpButton mode="modal">
                                <button className="w-full py-3 bg-zinc-100 text-zinc-900 font-medium text-[13px] rounded-md hover:bg-white transition-colors">
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

                <div className="max-w-5xl mx-auto flex flex-col items-center relative">
                    <div className="text-center max-w-2xl mb-14">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.02] mb-7 animate-slideDown">
                            <span className="flex w-1.5 h-1.5 rounded-full bg-green-500" />
                            <span className="text-[12px] font-medium text-zinc-400">Spaced repetition for DSA practice</span>
                        </div>

                        <h1 className="text-4xl md:text-6xl font-semibold text-zinc-50 leading-[1.05] tracking-tight mb-6 animate-slideUp text-balance">
                            Stop forgetting the<br />problems you've solved.
                        </h1>

                        <p className="text-lg text-zinc-400 mb-9 animate-slideUp delay-100 max-w-xl mx-auto leading-relaxed">
                            ReStack tracks every DSA problem you practice and resurfaces it right before you'd
                            start to forget — with a daily focus set on your dashboard and in your inbox.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-slideUp delay-200">
                            <SignUpButton mode="modal">
                                <button className="w-full sm:w-auto px-5 py-2.5 bg-zinc-100 text-zinc-900 text-[13px] font-medium rounded-md hover:bg-white transition-colors flex items-center justify-center gap-2">
                                    Get started for free
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </SignUpButton>
                            <a href="#how-it-works" className="w-full sm:w-auto px-5 py-2.5 text-zinc-300 text-[13px] font-medium rounded-md hover:bg-white/[0.04] transition-colors text-center border border-white/[0.08]">
                                See how it works
                            </a>
                        </div>
                    </div>

                    {/* ═══ App Mockup Visual ═══ */}
                    <div className="relative w-full max-w-4xl animate-slideUp delay-300">
                        <div className="bg-zinc-900 rounded-xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.6)] border border-white/[0.08] overflow-hidden">
                            <div className="h-10 bg-white/[0.02] border-b border-white/[0.06] flex items-center px-5 justify-between">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
                                </div>
                                <div className="bg-white/[0.03] border border-white/[0.06] px-4 py-1 rounded text-[11px] font-medium text-zinc-500">
                                    app.restack.dev/dashboard
                                </div>
                                <div className="w-14" />
                            </div>

                            <div className="bg-zinc-950 p-6 md:p-10">
                                <div className="max-w-3xl mx-auto">
                                    <div className="flex items-end justify-between mb-7">
                                        <div>
                                            <h3 className="text-xl font-semibold text-zinc-100 tracking-tight mb-1">Today's focus</h3>
                                            <p className="text-[13px] text-zinc-500">3 problems prioritized for you today.</p>
                                        </div>
                                        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
                                            <span className="text-[12px] font-medium text-zinc-400">14 day streak</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                                        {[
                                            { title: 'Merge K Lists', diff: 'Hard' },
                                            { title: '3Sum', diff: 'Medium' },
                                            { title: 'Max Path Sum', diff: 'Hard' }
                                        ].map((p, i) => (
                                            <div key={i} className={`p-4 rounded-lg bg-white/[0.02] border ${i === 0 ? 'border-green-500/30' : 'border-white/[0.06]'}`}>
                                                <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mb-3 ${p.diff === 'Hard' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                    {p.diff}
                                                </span>
                                                <h4 className="text-[13px] font-semibold text-zinc-100 mb-4 truncate">{p.title}</h4>
                                                <button className={`w-full py-2 rounded-md text-[11px] font-medium transition-colors ${i === 0 ? 'bg-zinc-100 text-zinc-900' : 'bg-white/[0.03] text-zinc-600'}`}>
                                                    {i === 0 ? 'Revisit now' : 'Pending'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-white/[0.02] rounded-lg border border-white/[0.06] flex items-center p-4 gap-8">
                                        <div className="flex-1 flex items-center gap-6">
                                            <div>
                                                <p className="text-[11px] font-medium text-zinc-500 mb-1">Consistency</p>
                                                <p className="text-[15px] font-semibold text-zinc-100">14 days</p>
                                            </div>
                                            <div className="h-7 w-px bg-white/[0.06]" />
                                            <div>
                                                <p className="text-[11px] font-medium text-zinc-500 mb-1">Mastered</p>
                                                <p className="text-[15px] font-semibold text-zinc-100">128</p>
                                            </div>
                                        </div>
                                        <div className="w-28 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                            <div className="w-2/3 h-full bg-green-500 rounded-full" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ How It Works ═══ */}
            <section id="how-it-works" className="py-24 px-6 border-t border-white/[0.06]">
                <div className="max-w-5xl mx-auto">
                    <div className="max-w-xl mb-16">
                        <p className="text-[12px] font-medium text-green-400 mb-3">How it works</p>
                        <h2 className="text-2xl md:text-3xl font-semibold text-zinc-50 tracking-tight mb-3 leading-tight">
                            Four steps to never forget a problem again.
                        </h2>
                        <p className="text-[15px] text-zinc-500 leading-relaxed">
                            No planning, no spreadsheets — just a rotation that keeps itself fresh.
                        </p>
                    </div>

                    <div className="space-y-10">
                        {steps.map((item, i) => (
                            <div key={i} className="flex flex-col md:flex-row gap-4 md:gap-10 md:items-start">
                                <div className="flex items-center gap-4 md:w-64 flex-shrink-0">
                                    <span className="text-[13px] font-mono font-medium text-zinc-700">{item.step}</span>
                                    <div className="w-8 h-8 rounded-md bg-white/[0.03] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                                        <item.icon className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                                    </div>
                                    <h3 className="text-[14px] font-semibold text-zinc-100">{item.title}</h3>
                                </div>
                                <p className="text-[14px] text-zinc-500 leading-relaxed max-w-xl">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ Features Grid ═══ */}
            <section id="features" className="py-24 px-6 border-t border-white/[0.06]">
                <div className="max-w-5xl mx-auto">
                    <div className="max-w-xl mb-14">
                        <p className="text-[12px] font-medium text-green-400 mb-3">Features</p>
                        <h2 className="text-2xl md:text-3xl font-semibold text-zinc-50 tracking-tight mb-3 leading-tight">
                            Everything you need to stay sharp.
                        </h2>
                        <p className="text-[15px] text-zinc-500 leading-relaxed">
                            Built around one core loop: practice, track, revisit.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        {features.map((f, i) => (
                            <div key={i} className={`${f.span} bg-white/[0.02] rounded-xl border border-white/[0.06] p-6 hover:border-white/[0.12] transition-colors`}>
                                <div className="w-8 h-8 rounded-md bg-green-500/10 flex items-center justify-center mb-5">
                                    <f.icon className="w-3.5 h-3.5 text-green-400" strokeWidth={1.75} />
                                </div>
                                <h3 className="text-[14px] font-semibold text-zinc-100 mb-1.5">{f.title}</h3>
                                <p className="text-[13px] text-zinc-500 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ Platform strip ═══ */}
            <section className="py-14 px-6 border-t border-white/[0.06]">
                <div className="max-w-5xl mx-auto">
                    <p className="text-center text-[12px] font-medium text-zinc-600 mb-7">Works with problems from any platform</p>
                    <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
                        {platforms.map((name) => (
                            <span key={name} className="text-[13px] font-medium text-zinc-700">
                                {name}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ FAQ Section ═══ */}
            <section id="faq" className="py-24 px-6 border-t border-white/[0.06]">
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-col md:flex-row items-start gap-12">
                        <div className="w-full md:w-1/3">
                            <p className="text-[12px] font-medium text-green-400 mb-3">Support</p>
                            <h2 className="text-2xl font-semibold text-zinc-50 tracking-tight mb-3">FAQ</h2>
                            <p className="text-[13px] text-zinc-500 leading-relaxed">
                                Quick answers to common questions about the system.
                            </p>
                            <div className="mt-7">
                                <a href="mailto:support@restack.engineering" className="text-[13px] font-medium text-zinc-100 hover:text-green-400 transition-colors">
                                    Ask a question →
                                </a>
                            </div>
                        </div>

                        <div className="w-full md:w-2/3">
                            {faqs.map((faq, i) => (
                                <FaqItem key={i} icon={faq.icon} q={faq.q} a={faq.a} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ Call to Action ═══ */}
            <section className="relative py-24 px-6 border-t border-white/[0.06] overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] pointer-events-none bg-glow" />
                <div className="relative max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl md:text-5xl font-semibold text-zinc-50 leading-[1.05] tracking-tight mb-6 text-balance">
                        Ready to build your<br />
                        <span className="text-green-400">mastery ritual?</span>
                    </h2>

                    <p className="text-lg text-zinc-400 mb-9 max-w-lg mx-auto leading-relaxed">
                        Stop guessing what to solve next. Add your first problem and let the rotation take it from here.
                    </p>

                    <SignUpButton mode="modal">
                        <button className="px-6 py-3 bg-zinc-100 text-zinc-900 text-[13px] font-medium rounded-md hover:bg-white transition-colors inline-flex items-center justify-center gap-2">
                            Get started for free
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </SignUpButton>
                </div>
            </section>

            {/* ═══ Footer ═══ */}
            <footer className="border-t border-white/[0.06] pt-16 pb-10 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-14">
                        <div className="col-span-1 md:col-span-1">
                            <Logo className="mb-4" iconSize="w-6 h-6" textSize="text-[15px]" variant="light" />
                            <p className="text-[13px] text-zinc-500 leading-relaxed max-w-xs">
                                A spaced repetition system for DSA interview preparation.
                            </p>
                        </div>

                        <div>
                            <h4 className="text-[12px] font-medium text-zinc-100 mb-4">Product</h4>
                            <ul className="space-y-2.5">
                                <li><a href="#features" className="text-[13px] text-zinc-500 hover:text-zinc-100 transition-colors">Features</a></li>
                                <li><a href="#how-it-works" className="text-[13px] text-zinc-500 hover:text-zinc-100 transition-colors">How it works</a></li>
                                <li><a href="#faq" className="text-[13px] text-zinc-500 hover:text-zinc-100 transition-colors">FAQ</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-[12px] font-medium text-zinc-100 mb-4">Social</h4>
                            <ul className="space-y-2.5">
                                <li><a href="#" className="text-[13px] text-zinc-500 hover:text-zinc-100 transition-colors">Twitter (X)</a></li>
                                <li><a href="#" className="text-[13px] text-zinc-500 hover:text-zinc-100 transition-colors">LinkedIn</a></li>
                                <li><a href="#" className="text-[13px] text-zinc-500 hover:text-zinc-100 transition-colors">Instagram</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-[12px] font-medium text-zinc-100 mb-4">Platform</h4>
                            <ul className="space-y-2.5">
                                <li><a href="#" className="text-[13px] text-zinc-500 hover:text-zinc-100 transition-colors">Status</a></li>
                                <li><a href="#" className="text-[13px] text-zinc-500 hover:text-zinc-100 transition-colors">Terms</a></li>
                                <li><a href="#" className="text-[13px] text-zinc-500 hover:text-zinc-100 transition-colors">Privacy</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/[0.06]">
                        <p className="text-[12px] text-zinc-600">
                            © {new Date().getFullYear()} ReStack. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
