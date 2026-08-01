import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ExternalLink, CheckSquare, CheckCircle, Archive } from 'lucide-react';
import { useProblem, useRevisitProblemMutation, useArchiveProblemMutation } from '../hooks/useProblems';
import ConfirmDialog from '../components/ConfirmDialog';
import CustomLoader from '../components/CustomLoader';

const ProblemDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: problem, isLoading: loading, isError } = useProblem(id);
    const revisitMutation = useRevisitProblemMutation();
    const archiveMutation = useArchiveProblemMutation();

    const [note, setNote] = useState('');
    const [showRevisitConfirm, setShowRevisitConfirm] = useState(false);
    const [showRetireConfirm, setShowRetireConfirm] = useState(false);

    const handleMarkRevisited = async () => {
        try {
            if (!id) return;
            await revisitMutation.mutateAsync({ id, notes: note });
            setNote('');
        } catch (error) {
            console.error('Failed to mark revisited', error);
        } finally {
            setShowRevisitConfirm(false);
        }
    };

    const handleRetire = async () => {
        try {
            if (!id) return;
            await archiveMutation.mutateAsync(id);
            navigate('/');
        } catch (error) {
            console.error('Failed to retire problem', error);
        } finally {
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
            case 'high': return { bg: 'bg-[var(--status-hard-bg)]', text: 'text-[var(--status-hard-text)]' };
            case 'medium': return { bg: 'bg-[var(--status-medium-bg)]', text: 'text-[var(--status-medium-text)]' };
            case 'low': return { bg: 'bg-[var(--status-easy-bg)]', text: 'text-[var(--status-easy-text)]' };
            default: return { bg: 'bg-[var(--bg-elevated)]', text: 'text-[var(--text-secondary)]' };
        }
    };

    const getDifficultyStyle = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case 'hard': return 'bg-[var(--status-hard-bg)] text-[var(--status-hard-text)]';
            case 'medium': return 'bg-[var(--status-medium-bg)] text-[var(--status-medium-text)]';
            default: return 'bg-[var(--status-easy-bg)] text-[var(--status-easy-text)]';
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-32">
                <CustomLoader text="Fetching problem details..." size="w-20 h-20" />
            </div>
        );
    }

    if (isError || !problem) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="text-center py-20">
                    <p className="text-red-400 mb-4 text-[14px]">{isError ? 'Failed to load problem' : 'Problem not found'}</p>
                    <Link to="/" className="text-green-400 hover:text-green-300 text-[13px] font-medium">
                        Back to dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-secondary)] mb-6">
                <Link to="/" className="hover:text-[var(--text-primary)] transition-colors">Library</Link>
                <span className="text-[var(--text-tertiary)]">/</span>
                <span className="text-[var(--text-primary)]">{problem.title}</span>
            </nav>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <div className="flex items-center gap-2.5 mb-3">
                        {problem.difficulty && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getDifficultyStyle(problem.difficulty)}`}>
                                {problem.difficulty}
                            </span>
                        )}
                        <span className="text-[11px] font-medium text-[var(--text-tertiary)]">{problem.source || 'LeetCode'}</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-semibold text-[var(--text-primary)] tracking-tight leading-tight">{problem.title}</h1>
                </div>

                <div className="flex items-center gap-3">
                    <a
                        href={problem.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[var(--border-default)] text-[13px] font-medium text-[var(--text-primary)] rounded-md hover:border-[var(--border-strong)] transition-colors"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View problem source
                    </a>
                </div>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
                {/* Mark as Revisited Card */}
                <div className={`lg:col-span-7 rounded-lg border p-7 transition-colors ${problem.revisited_today
                    ? 'bg-green-500/[0.04] border-green-500/15'
                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)]'
                    }`}>
                    {problem.revisited_today ? (
                        <div className="text-center py-4">
                            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-5">
                                <CheckCircle className="w-7 h-7 text-green-400" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-xl font-semibold text-green-300 mb-1.5">Revisited today!</h3>
                            <p className="text-[13px] text-green-400/70 mb-7 px-8">Great work. Your neural paths are strengthening. See you tomorrow.</p>

                            <div className="bg-[var(--bg-surface-raised)] border border-green-500/10 rounded-md p-4 text-left">
                                <p className="text-[11px] font-medium text-green-400 mb-1">Session record</p>
                                <p className="text-[13px] font-medium text-[var(--text-primary)] leading-relaxed italic">
                                    {problem.revisit_history?.[0]?.notes || 'Fast completion, no notes recorded.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">Daily revisit</h3>
                            <p className="text-[13px] text-[var(--text-secondary)] mb-6">
                                Confirm your revisit session to update your mastery history and adjust the scheduling algorithm.
                            </p>

                            <div className="space-y-5">
                                <div>
                                    <label className="text-[11px] font-medium text-[var(--text-secondary)] block mb-2">Session notes</label>
                                    <textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="What did you learn? Any pitfalls to remember next time?"
                                        className="w-full px-3.5 py-2.5 bg-[var(--bg-surface-raised)] border border-[var(--border-default)] rounded-md text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-green-500/40 focus:border-green-500/40 transition-all resize-none"
                                        rows={3}
                                    />
                                </div>

                                <button
                                    onClick={() => setShowRevisitConfirm(true)}
                                    disabled={revisitMutation.isPending}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-[13px] font-medium rounded-md hover:bg-[var(--btn-primary-hover-bg)] transition-colors disabled:opacity-50"
                                >
                                    {revisitMutation.isPending ? (
                                        <div className="animate-spin w-4 h-4 border-2 border-[var(--btn-primary-text)]/20 border-t-[var(--btn-primary-text)] rounded-full" />
                                    ) : (
                                        <CheckSquare className="w-4 h-4" />
                                    )}
                                    {revisitMutation.isPending ? 'Processing...' : 'Mark as revisited'}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Stats Card */}
                <div className="lg:col-span-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-7 flex flex-col justify-between">
                    <div>
                        <p className="text-[11px] font-medium text-[var(--text-secondary)] mb-1">Mastery score</p>
                        <div className="flex items-baseline gap-2 mb-7">
                            <span className="text-4xl font-semibold text-[var(--text-primary)]">{problem.times_revisited}</span>
                            <span className="text-[13px] font-medium text-[var(--text-secondary)]">revisits</span>
                        </div>

                        {problem.weight_info && (
                            <div className="space-y-5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-medium text-[var(--text-secondary)]">Priority</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getPriorityColor(problem.weight_info.priority).bg} ${getPriorityColor(problem.weight_info.priority).text}`}>
                                        {problem.weight_info.priority}
                                    </span>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-medium text-[var(--text-secondary)]">Retention decay</span>
                                        <span className="text-[12px] font-semibold text-[var(--text-primary)]">{Math.round(problem.weight_info.revisit_decay * 100)}%</span>
                                    </div>
                                    <div className="w-full bg-[var(--bg-elevated)] rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-green-500 h-1.5 rounded-full transition-all duration-1000"
                                            style={{ width: `${Math.round(problem.weight_info.revisit_decay * 100)}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-[var(--border-subtle)]">
                                    <p className="text-[11px] font-medium text-[var(--text-secondary)] mb-1">Next revisit</p>
                                    <p className={`text-[12px] font-medium ${problem.weight_info.is_eligible ? 'text-green-400' : 'text-[var(--text-secondary)]'}`}>
                                        {problem.weight_info.is_eligible
                                            ? 'Highly likely in tomorrow\'s email'
                                            : `Scheduled for cooldown (${problem.weight_info.days_since_last_revisit}d since last)`
                                        }
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-7">
                        <button
                            onClick={() => setShowRetireConfirm(true)}
                            className="flex items-center gap-2 text-[11px] font-medium text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                        >
                            <Archive className="w-3.5 h-3.5" />
                            Retire from active
                        </button>
                    </div>
                </div>
            </div>

            {/* Problem Notes/Context */}
            {problem.notes && (
                <div className="mb-10">
                    <h2 className="text-[11px] font-medium text-[var(--text-secondary)] mb-3">Problem context</h2>
                    <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-subtle)] p-7">
                        <p className="text-[var(--text-primary)] text-[14px] leading-relaxed whitespace-pre-wrap">{problem.notes}</p>
                    </div>
                </div>
            )}

            {/* Revisit History */}
            <div>
                <h2 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight mb-6">Progress timeline</h2>

                <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-subtle)] p-8">
                    <div className="space-y-8 relative">
                        {/* Vertical line through timeline */}
                        <div className="absolute left-[7.5px] top-2 bottom-8 w-px bg-[var(--bg-elevated)]" />

                        {problem.revisit_history && problem.revisit_history.length > 0 ? (
                            problem.revisit_history.map((entry, index) => (
                                <div key={entry.id} className="relative flex gap-7">
                                    <div className={`w-3.5 h-3.5 rounded-full mt-1.5 z-10 border-2 border-[var(--bg-surface)] ${index === 0 ? 'bg-green-500 scale-125' : 'bg-[var(--text-tertiary)]'
                                        }`} />

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">{formatDate(entry.revisited_at)}</h3>
                                            <span className="text-[11px] font-medium text-[var(--text-secondary)]">{getTimeAgo(entry.revisited_at)}</span>
                                        </div>
                                        {entry.notes ? (
                                            <div className="bg-[var(--bg-surface-raised)] rounded-md p-3.5 border border-[var(--border-subtle)]">
                                                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed italic">"{entry.notes}"</p>
                                            </div>
                                        ) : (
                                            <p className="text-[12px] text-[var(--text-tertiary)] italic">No session notes recorded.</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-[13px] text-[var(--text-tertiary)]">No history recorded yet.</p>
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
                title="Confirm revisit session"
                description={`You're marking "${problem.title}" as revisited. This will update your mastery data.`}
                confirmLabel={revisitMutation.isPending ? "Confirming..." : "Confirm session"}
                cancelLabel="Cancel"
                variant="info"
                loading={revisitMutation.isPending}
            />

            <ConfirmDialog
                isOpen={showRetireConfirm}
                onClose={() => setShowRetireConfirm(false)}
                onConfirm={handleRetire}
                title="Retire problem?"
                description={`Are you sure you want to retire "${problem.title}"? It will be moved to your archive and removed from daily reminders.`}
                confirmLabel={archiveMutation.isPending ? "Retiring..." : "Retire problem"}
                cancelLabel="Keep active"
                variant="danger"
                loading={archiveMutation.isPending}
            />
        </div>
    );
};

export default ProblemDetail;
