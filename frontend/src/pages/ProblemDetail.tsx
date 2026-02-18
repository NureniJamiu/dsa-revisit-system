import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ExternalLink, CheckSquare, CheckCircle, Archive } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { apiFetch } from '../lib/api';
import ConfirmDialog from '../components/ConfirmDialog';

interface RevisitEntry {
    id: string;
    revisited_at: string;
    notes?: string;
}

interface WeightInfo {
    problem_id: string;
    weight: number;
    days_since_added: number;
    days_since_last_revisit: number;
    times_revisited: number;
    revisit_decay: number;
    is_eligible: boolean;
    priority: 'high' | 'medium' | 'low';
}

interface Problem {
    id: string;
    title: string;
    link: string;
    times_revisited: number;
    last_revisited_at: string | null;
    tags?: string[];
    difficulty?: string;
    source?: string;
    revisited_today?: boolean;
    revisit_history?: RevisitEntry[];
    weight_info?: WeightInfo;
}

const ProblemDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const [problem, setProblem] = useState<Problem | null>(null);
    const [loading, setLoading] = useState(true);
    const [note, setNote] = useState('');
    const [showRevisitConfirm, setShowRevisitConfirm] = useState(false);
    const [showRetireConfirm, setShowRetireConfirm] = useState(false);
    const [isRevisiting, setIsRevisiting] = useState(false);
    const [isRetiring, setIsRetiring] = useState(false);

    useEffect(() => {
        fetchProblemDetail();
    }, [id]);

    const fetchProblemDetail = async () => {
        try {
            const res = await apiFetch(`/problems/${id}`, {}, getToken);
            if (res.ok) {
                const data = await res.json();
                setProblem(data);

                // [DSA] Debug: log weight info for this problem
                if (data.weight_info) {
                    console.group(`[DSA] Problem Detail — ${data.title}`);
                    console.table({
                        weight: data.weight_info.weight,
                        priority: data.weight_info.priority,
                        daysSinceAdded: data.weight_info.days_since_added,
                        daysSinceLastRevisit: data.weight_info.days_since_last_revisit,
                        timesRevisited: data.weight_info.times_revisited,
                        revisitDecay: data.weight_info.revisit_decay,
                        isEligible: data.weight_info.is_eligible,
                    });
                    console.groupEnd();
                }
            }
        } catch (error) {
            console.error('[DSA] Failed to fetch problem details', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkRevisited = async () => {
        setIsRevisiting(true);
        try {
            const res = await apiFetch(`/problems/${id}/revisit`, {
                method: 'POST',
                body: JSON.stringify({ notes: note })
            }, getToken);
            if (res.ok) {
                setNote('');
                fetchProblemDetail();
            } else if (res.status === 409) {
                fetchProblemDetail();
            }
        } catch (error) {
            console.error('Failed to mark revisited', error);
        } finally {
            setIsRevisiting(false);
            setShowRevisitConfirm(false);
        }
    };

    const handleRetire = async () => {
        setIsRetiring(true);
        try {
            const res = await apiFetch(`/problems/${id}/archive`, {
                method: 'POST'
            }, getToken);
            if (res.ok) {
                navigate('/');
            }
        } catch (error) {
            console.error('Failed to retire problem', error);
        } finally {
            setIsRetiring(false);
            setShowRetireConfirm(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const getTimeAgo = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return '1 day ago';
        if (diffInDays < 7) return `${diffInDays} days ago`;
        if (diffInDays < 14) return '1 week ago';
        if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
        if (diffInDays < 60) return '1 month ago';
        return `${Math.floor(diffInDays / 30)} months ago`;
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
            case 'medium': return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' };
            case 'low': return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
            default: return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="text-center py-20 text-gray-500">Loading problem details...</div>
            </div>
        );
    }

    if (!problem) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="text-center py-20">
                    <p className="text-gray-500 mb-4">Problem not found</p>
                    <Link to="/" className="text-emerald-600 hover:text-emerald-700">
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-8">
                <Link to="/" className="hover:text-gray-900 transition-colors">Library</Link>
                <span className="text-gray-300">/</span>
                <span className="text-gray-900 tracking-tight">{problem.title}</span>
            </nav>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        {problem.difficulty && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${problem.difficulty.toLowerCase() === 'hard'
                                ? 'bg-red-50 text-red-600'
                                : problem.difficulty.toLowerCase() === 'medium'
                                    ? 'bg-yellow-50 text-yellow-600'
                                    : 'bg-green-50 text-green-600'
                                }`}>
                                {problem.difficulty}
                            </span>
                        )}
                        <span className="text-[11px] font-black text-gray-300 uppercase tracking-tight">{problem.source || 'LeetCode'}</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">{problem.title}</h1>
                </div>

                <div className="flex items-center gap-3">
                    <a
                        href={problem.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-[13px] font-bold text-gray-900 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Solve on Source
                    </a>
                </div>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
                {/* Mark as Revisited Card */}
                <div className={`lg:col-span-7 rounded-2xl border p-8 transition-all ${problem.revisited_today
                    ? 'bg-green-50/50 border-green-200/50'
                    : 'bg-white border-gray-200/80 shadow-sm'
                    }`}>
                    {problem.revisited_today ? (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-2xl font-black text-green-900 mb-2">Mastered today!</h3>
                            <p className="text-sm font-medium text-green-700/70 mb-8 px-8">Great work. Your neural paths are strengthening. See you tomorrow.</p>

                            <div className="bg-white/50 border border-green-200/50 rounded-xl p-4 text-left">
                                <p className="text-[10px] font-black text-green-800 uppercase tracking-widest mb-1">Session Record</p>
                                <p className="text-sm font-bold text-green-900 leading-relaxed italic">
                                    {problem.revisit_history?.[0]?.notes || 'Fast completion, no notes recorded.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h3 className="text-lg font-black text-gray-900 mb-2">Daily Revisit</h3>
                            <p className="text-sm font-medium text-gray-400 mb-8">
                                Confirm your revisit session to update your mastery history and adjust the scheduling algorithm.
                            </p>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Session Notes</label>
                                    <textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="What did you learn? Any pitfalls to remember next time?"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white focus:border-transparent transition-all resize-none"
                                        rows={3}
                                    />
                                </div>

                                <button
                                    onClick={() => setShowRevisitConfirm(true)}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-all shadow-xl shadow-gray-200"
                                >
                                    <CheckSquare className="w-5 h-5 text-green-400" />
                                    Complete Revisit Session
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Stats Card */}
                <div className="lg:col-span-5 rounded-2xl border border-[#C5CDC2] p-8 flex flex-col justify-between" style={{ backgroundColor: '#D4DDD2' }}>
                    <div>
                        <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">Mastery Score</p>
                        <div className="flex items-baseline gap-2 mb-8">
                            <span className="text-5xl font-black text-gray-900">{problem.times_revisited}</span>
                            <span className="text-sm font-bold text-gray-600">revisits</span>
                        </div>

                        {problem.weight_info && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Priority</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${getPriorityColor(problem.weight_info.priority).bg} ${getPriorityColor(problem.weight_info.priority).text}`}>
                                        {problem.weight_info.priority}
                                    </span>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Recall Decay</span>
                                        <span className="text-[13px] font-black text-gray-900">{Math.round(problem.weight_info.revisit_decay * 100)}%</span>
                                    </div>
                                    <div className="w-full bg-[#C5CDC2] rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-gray-900 h-2 rounded-full transition-all duration-1000"
                                            style={{ width: `${Math.round(problem.weight_info.revisit_decay * 100)}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-[#C5CDC2]">
                                    <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">Next Revisit</p>
                                    <p className={`text-[13px] font-bold ${problem.weight_info.is_eligible ? 'text-green-700' : 'text-gray-600'}`}>
                                        {problem.weight_info.is_eligible
                                            ? 'Highly likely in tomorrow\'s email'
                                            : `Scheduled for cooldown (${problem.weight_info.days_since_last_revisit}d since last)`
                                        }
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8">
                        <button
                            onClick={() => setShowRetireConfirm(true)}
                            className="flex items-center gap-2 text-[11px] font-black text-gray-500 hover:text-red-600 transition-colors uppercase tracking-widest"
                        >
                            <Archive className="w-4 h-4" />
                            Retire from Active
                        </button>
                    </div>
                </div>
            </div>

            {/* Revisit History */}
            <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-8">Progress Timeline</h2>

                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-10">
                    <div className="space-y-10 relative">
                        {/* Vertical line through timeline */}
                        <div className="absolute left-[7.5px] top-2 bottom-8 w-[1px] bg-gray-100" />

                        {problem.revisit_history && problem.revisit_history.length > 0 ? (
                            problem.revisit_history.map((entry, index) => (
                                <div key={entry.id} className="relative flex gap-8">
                                    <div className={`w-4 h-4 rounded-full mt-1.5 z-10 border-2 border-white shadow-sm ${index === 0 ? 'bg-green-500 scale-125' : 'bg-gray-300'
                                        }`} />

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-base font-black text-gray-900">{formatDate(entry.revisited_at)}</h3>
                                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{getTimeAgo(entry.revisited_at)}</span>
                                        </div>
                                        {entry.notes ? (
                                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                                <p className="text-sm font-medium text-gray-600 leading-relaxed italic">"{entry.notes}"</p>
                                            </div>
                                        ) : (
                                            <p className="text-xs font-bold text-gray-300 uppercase italic">No session notes recorded.</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">No history recorded yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirmation Dialogs */}
            <ConfirmDialog
                isOpen={showRevisitConfirm}
                onClose={() => setShowRevisitConfirm(false)}
                onConfirm={handleMarkRevisited}
                title="Confirm Revisit Session"
                description={`You're marking "${problem.title}" as revisited. This will update your mastery data.`}
                confirmLabel="Confirm Session"
                cancelLabel="Cancel"
                variant="info"
                loading={isRevisiting}
            />

            <ConfirmDialog
                isOpen={showRetireConfirm}
                onClose={() => setShowRetireConfirm(false)}
                onConfirm={handleRetire}
                title="Retire Problem?"
                description={`Are you sure you want to retire "${problem.title}"? It will be moved to your archive and removed from daily reminders.`}
                confirmLabel="Retire Problem"
                cancelLabel="Keep Active"
                variant="danger"
                loading={isRetiring}
            />
        </div>
    );
};

export default ProblemDetail;
