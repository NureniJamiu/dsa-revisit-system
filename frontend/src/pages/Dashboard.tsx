import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Filter, CheckCircle, Zap, Plus, Edit2, Trash2 } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { useProblems, useTodaysFocus, useRevisitProblemMutation, useDeleteProblemMutation, type Problem } from '../hooks/useProblems';
import AddProblemModal from '../components/AddProblemModal';
import ConfirmDialog from '../components/ConfirmDialog';

const Dashboard: React.FC = () => {
    const { data: problems = [], isLoading: loading, isError: problemsError } = useProblems();
    const { data: todaysFocus, isLoading: focusLoading, isError: focusError } = useTodaysFocus();
    const { user } = useUser();
    const revisitMutation = useRevisitProblemMutation();
    const deleteMutation = useDeleteProblemMutation();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
    const [deletingProblemId, setDeletingProblemId] = useState<string | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const handleRevisit = async (id: string) => {
        try {
            await revisitMutation.mutateAsync({ id });
        } catch (error) {
            console.error('Failed to mark revisited', error);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteMutation.mutateAsync(id);
        } catch (error) {
            console.error('Failed to delete problem', error);
        } finally {
            setIsDeleteConfirmOpen(false);
            setDeletingProblemId(null);
        }
    };

    const getTimeAgo = (dateString: string | null): string => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays}d ago`;
        if (diffInDays < 14) return '1w ago';
        if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
        return new Date(dateString).toLocaleDateString();
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const getPriorityStyle = (priority: string) => {
        switch (priority) {
            case 'high': return { text: 'text-red-600', badge: 'bg-red-50' };
            case 'medium': return { text: 'text-yellow-600', badge: 'bg-yellow-50' };
            case 'low': return { text: 'text-green-600', badge: 'bg-green-50' };
            default: return { text: 'text-gray-600', badge: 'bg-gray-50' };
        }
    };

    const summary = todaysFocus?.summary;
    const completionPct = summary && summary.total_focus > 0
        ? Math.round((summary.completed / summary.total_focus) * 100)
        : 0;

    return (
        <div className="space-y-12">
            {/* Greeting Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-800 tracking-tight mb-2 break-words">
                        {getGreeting()}{user?.firstName ? `, ${user.firstName}.` : ' '}
                    </h1>
                    <p className="text-[15px] font-medium text-gray-400">Your mastery curve is looking strong today.</p>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-6">
                    <button
                        onClick={() => {
                            setEditingProblem(null);
                            setIsAddModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 text-white text-[13px] font-black rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 uppercase tracking-widest"
                    >
                        <Plus className="w-4 h-4 text-green-400" />
                        Add Problem
                    </button>
                    <div className="text-right">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Mastery</p>
                        <p className="text-2xl font-black text-gray-900">{problems.length}</p>
                    </div>
                </div>
            </div>

            {/* Today's Focus Section */}
            <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Today's Focus</h2>
                        {summary && summary.total_focus > 0 && (
                            <span className="px-2 py-0.5 rounded bg-green-100 text-[10px] font-black text-green-700 uppercase tracking-wider">
                                {summary.remaining} Remaining
                            </span>
                        )}
                    </div>
                    {summary && summary.total_focus > 0 && (
                        <div className="flex items-center justify-between gap-4 bg-white px-4 py-2 rounded-xl border border-gray-200/80 shadow-sm">
                            <div className="flex items-center gap-2 text-[13px] font-bold text-gray-600">
                                <span>{summary.completed}/{summary.total_focus} complete</span>
                            </div>
                            <div className="w-24 sm:w-32 bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div
                                    className="h-2 bg-green-500 transition-all duration-1000 ease-out"
                                    style={{ width: `${completionPct}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {focusLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-green-500 rounded-full" />
                    </div>
                ) : focusError ? (
                    <div className="text-center py-16 bg-red-50 rounded-2xl border border-red-100 shadow-sm">
                        <h3 className="text-lg font-bold text-red-900 mb-1">Failed to load today's focus</h3>
                        <p className="text-sm text-red-600/70">Please check your connection and try again.</p>
                    </div>
                ) : !todaysFocus || todaysFocus.problems.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-200/80 shadow-sm">
                        <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-1">All caught up!</h3>
                        <p className="text-sm text-gray-400">No problems scheduled for revisit today.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {todaysFocus.problems.map((item) => {
                            const priorityStyle = getPriorityStyle(item.weight.priority);

                            return (
                                <div
                                    key={item.problem.id}
                                    className={`group rounded-2xl border transition-all duration-300 ${item.revisited_today
                                        ? 'bg-green-50/50 border-green-200/50 shadow-none'
                                        : 'bg-white border-gray-200/80 hover:shadow-2xl hover:shadow-gray-200/60 hover:-translate-y-1'
                                        }`}
                                >
                                    <div className="p-6">
                                        <div className="flex items-start justify-between gap-3 mb-4">
                                            <div className="flex-1 min-w-0">
                                                <Link to={`/problem/${item.problem.id}`}>
                                                    <h3 className={`text-[17px] font-black leading-snug truncate transition-colors cursor-pointer ${item.revisited_today
                                                        ? 'text-green-800'
                                                        : 'text-gray-900 group-hover:text-green-600'
                                                        }`}>
                                                        {item.problem.title}
                                                    </h3>
                                                </Link>
                                                <p className="text-[11px] font-bold text-gray-400 mt-1 uppercase tracking-tight">
                                                    {item.problem.source || 'DSA Library'} · {getTimeAgo(item.problem.last_revisited_at)}
                                                </p>
                                            </div>
                                            <a
                                                href={item.problem.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all flex-shrink-0"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>

                                        <div className="flex items-center gap-2 mb-6">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${priorityStyle.badge} ${priorityStyle.text}`}>
                                                {item.weight.priority}
                                            </span>
                                            {item.problem.difficulty && (
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${item.problem.difficulty.toLowerCase() === 'hard'
                                                    ? 'bg-red-50 text-red-600'
                                                    : item.problem.difficulty.toLowerCase() === 'medium'
                                                        ? 'bg-yellow-50 text-yellow-600'
                                                        : 'bg-green-50 text-green-600'
                                                    }`}>
                                                    {item.problem.difficulty}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                                            {item.revisited_today ? (
                                                <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-100/50 text-green-700 text-[13px] font-bold rounded-xl">
                                                    <CheckCircle className="w-4 h-4" />
                                                    Mastered today
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleRevisit(item.problem.id)}
                                                    disabled={revisitMutation.isPending && revisitMutation.variables?.id === item.problem.id}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 text-white text-[13px] font-bold rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50"
                                                >
                                                    {revisitMutation.isPending && revisitMutation.variables?.id === item.problem.id ? (
                                                        <div className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full" />
                                                    ) : (
                                                        <Zap className="w-4 h-4 text-green-400" />
                                                    )}
                                                    {revisitMutation.isPending && revisitMutation.variables?.id === item.problem.id ? 'Starting...' : 'Start Revisit'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* All Problems Table */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">All Problems</h2>
                    <button className="flex items-center gap-2 text-[13px] font-bold text-gray-400 hover:text-gray-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200/80 shadow-sm">
                        <Filter className="w-4 h-4" />
                        Filter list
                    </button>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden w-full">
                    <div className="overflow-x-auto min-w-0">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    <th className="text-left px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                                        Problem
                                    </th>
                                    <th className="text-left px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                                        Last Touch
                                    </th>
                                    <th className="text-left px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                                        Attempts
                                    </th>
                                    <th className="text-right px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest min-w-[120px]">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="animate-spin w-5 h-5 border-2 border-gray-200 border-t-green-500 rounded-full" />
                                                <span className="text-sm font-medium text-gray-400">Loading mastery data...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : problemsError ? (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-12 text-center">
                                            <p className="text-sm font-medium text-red-400">Failed to load archive data. Try refreshing.</p>
                                        </td>
                                    </tr>
                                ) : problems.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-12 text-center">
                                            <p className="text-sm font-medium text-gray-400">No problems tracked in your archive yet.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    problems.map((problem) => (
                                        <tr key={problem.id} className="group hover:bg-gray-50/50 transition-colors">
                                            <td className="px-8 py-4">
                                                <Link to={`/problem/${problem.id}`} className="text-sm font-black text-gray-900 group-hover:text-green-600 transition-colors">
                                                    {problem.title}
                                                </Link>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 tracking-tight">{problem.source || 'Unknown'}</p>
                                            </td>
                                            <td className="px-8 py-4 text-sm font-bold text-gray-500">
                                                {getTimeAgo(problem.last_revisited_at)}
                                            </td>
                                            <td className="px-8 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-100 text-[11px] font-black text-gray-600">
                                                    {problem.times_revisited} Focus points
                                                </span>
                                            </td>
                                            <td className="px-8 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => {
                                                            setEditingProblem(problem);
                                                            setIsAddModalOpen(true);
                                                        }}
                                                        className="p-2 text-gray-300 hover:text-green-600 transition-colors"
                                                        title="Edit problem"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setDeletingProblemId(problem.id);
                                                            setIsDeleteConfirmOpen(true);
                                                        }}
                                                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                                        title="Delete problem"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modals */}
                <AddProblemModal
                    isOpen={isAddModalOpen}
                    onClose={() => {
                        setIsAddModalOpen(false);
                        setEditingProblem(null);
                    }}
                    onSuccess={() => { }}
                    problem={editingProblem}
                />

                <ConfirmDialog
                    isOpen={isDeleteConfirmOpen}
                    onClose={() => {
                        setIsDeleteConfirmOpen(false);
                        setDeletingProblemId(null);
                    }}
                    onConfirm={() => deletingProblemId && handleDelete(deletingProblemId)}
                    title="Delete Problem"
                    description="Are you sure you want to permanently delete this problem and its entire revisit history? This action cannot be undone."
                    confirmLabel={deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
                    variant="danger"
                    loading={deleteMutation.isPending}
                />
            </div>
        </div>
    );
};

export default Dashboard;
