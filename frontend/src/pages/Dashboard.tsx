import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Filter, CheckCircle, Zap, Plus, Edit2, Trash2, Search, X } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { useProblems, useTodaysFocus, useRevisitProblemMutation, useDeleteProblemMutation, type Problem } from '../hooks/useProblems';
import AddProblemModal from '../components/AddProblemModal';
import ConfirmDialog from '../components/ConfirmDialog';
import CustomLoader from '../components/CustomLoader';

const Dashboard: React.FC = () => {
    const { data: problems = [], isLoading: loading, isError: problemsError } = useProblems('active');
    const { data: todaysFocus, isLoading: focusLoading, isError: focusError } = useTodaysFocus();
    const { user } = useUser();
    const revisitMutation = useRevisitProblemMutation();
    const deleteMutation = useDeleteProblemMutation();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
    const [deletingProblemId, setDeletingProblemId] = useState<string | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [revisitProblemId, setRevisitProblemId] = useState<string | null>(null);
    const [revisitNote, setRevisitNote] = useState('');
    const [isRevisitConfirmOpen, setIsRevisitConfirmOpen] = useState(false);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 6;

    const handleRevisit = async () => {
        try {
            if (!revisitProblemId) return;
            await revisitMutation.mutateAsync({ id: revisitProblemId, notes: revisitNote });
            setRevisitNote('');
            setIsRevisitConfirmOpen(false);
            setRevisitProblemId(null);
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

    const filteredProblems = problems.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.source?.toLowerCase() || '').includes(searchQuery.toLowerCase());
        const matchesDifficulty = !difficultyFilter || p.difficulty?.toLowerCase() === difficultyFilter.toLowerCase();
        return matchesSearch && matchesDifficulty;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredProblems.length / ITEMS_PER_PAGE);
    const paginatedProblems = filteredProblems.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset page on filter change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, difficultyFilter]);

    return (
        <div className="space-y-12 pb-24 md:pb-12">
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
                    <div className="py-20">
                        <CustomLoader text="Curating your focus..." />
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
                                                    onClick={() => {
                                                        setRevisitProblemId(item.problem.id);
                                                        setIsRevisitConfirmOpen(true);
                                                    }}
                                                    disabled={revisitMutation.isPending && revisitMutation.variables?.id === item.problem.id}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 text-white text-[13px] font-bold rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50"
                                                >
                                                    {revisitMutation.isPending && revisitMutation.variables?.id === item.problem.id ? (
                                                        <div className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full" />
                                                    ) : (
                                                        <Zap className="w-4 h-4 text-green-400" />
                                                    )}
                                                    {revisitMutation.isPending && revisitMutation.variables?.id === item.problem.id ? 'Processing...' : 'Mark as Revisited'}
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
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">All Problems</h2>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        {/* Search Input */}
                        <div className="relative group flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search problems..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-base font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-3 h-3 text-gray-400" />
                                </button>
                            )}
                        </div>

                        {/* Filter Button & Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-bold rounded-xl border transition-all shadow-sm ${difficultyFilter || showFilters
                                    ? 'bg-gray-800 text-white border-gray-800'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-900'
                                    }`}
                            >
                                <Filter className={`w-4 h-4 ${difficultyFilter ? 'text-green-400' : ''}`} />
                                {difficultyFilter ? difficultyFilter.charAt(0).toUpperCase() + difficultyFilter.slice(1) : 'Filter'}
                            </button>

                            {showFilters && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowFilters(false)} />
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-gray-200 shadow-xl z-20 overflow-hidden">
                                        <div className="p-2 border-b border-gray-50 bg-gray-50/50">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 py-1">Difficulty</p>
                                        </div>
                                        <div className="p-1">
                                            {['all', 'easy', 'medium', 'hard'].map((level) => (
                                                <button
                                                    key={level}
                                                    onClick={() => {
                                                        setDifficultyFilter(level === 'all' ? null : level);
                                                        setShowFilters(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-colors ${(level === 'all' && !difficultyFilter) || difficultyFilter === level
                                                        ? 'bg-green-50 text-green-700'
                                                        : 'text-gray-600 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {level.charAt(0).toUpperCase() + level.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden w-full relative group/table">
                    {/* Horizontal Scroll indicator (Fades on desktop/appears on mobile) */}
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10 opacity-0 md:group-hover/table:opacity-100 transition-opacity" />

                    <div className="overflow-x-auto min-w-0 custom-scrollbar scroll-shadow-right">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    <th className="text-left px-6 md:px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                        Problem
                                    </th>
                                    <th className="text-left px-6 md:px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                        Last Touch
                                    </th>
                                    <th className="hidden md:table-cell text-left px-6 md:px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                        Attempts
                                    </th>
                                    <th className="text-right px-6 md:px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest min-w-[120px] whitespace-nowrap">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-16 text-center">
                                            <CustomLoader text="Loading mastery archive..." />
                                        </td>
                                    </tr>
                                ) : problemsError ? (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-12 text-center">
                                            <p className="text-sm font-medium text-red-400">Failed to load archive data. Try refreshing.</p>
                                        </td>
                                    </tr>
                                ) : paginatedProblems.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-12 text-center">
                                            <p className="text-sm font-medium text-gray-400">
                                                {searchQuery || difficultyFilter ? 'No problems match your filters.' : 'No problems tracked in your archive yet.'}
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedProblems.map((problem) => (
                                        <tr key={problem.id} className="group hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 md:px-8 py-4 min-w-[200px]">
                                                <Link to={`/problem/${problem.id}`} className="text-sm font-black text-gray-900 group-hover:text-green-600 transition-colors block truncate max-w-[200px] md:max-w-none">
                                                    {problem.title}
                                                </Link>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 tracking-tight">{problem.source || 'Unknown'}</p>
                                            </td>
                                            <td className="px-6 md:px-8 py-4 text-sm font-bold text-gray-500 whitespace-nowrap">
                                                {getTimeAgo(problem.last_revisited_at)}
                                            </td>
                                            <td className="hidden md:table-cell px-6 md:px-8 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-100 text-[11px] font-black text-gray-600 whitespace-nowrap">
                                                    {problem.times_revisited} Focus points
                                                </span>
                                            </td>
                                            <td className="px-6 md:px-8 py-4 text-right">
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

                {/* Pagination Controls */}
                {!loading && !problemsError && totalPages > 1 && (
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-[13px] font-bold text-gray-400 uppercase tracking-widest">
                            Showing <span className="text-gray-900">{Math.min(filteredProblems.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}-{Math.min(filteredProblems.length, currentPage * ITEMS_PER_PAGE)}</span> of <span className="text-gray-900">{filteredProblems.length}</span>
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] font-black text-gray-800 hover:border-gray-900 transition-all disabled:opacity-30 disabled:hover:border-gray-200 uppercase tracking-widest shadow-sm"
                            >
                                Previous
                            </button>
                            <div className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="text-[13px] font-black text-gray-900">{currentPage}</span>
                                <span className="text-[13px] font-bold text-gray-400 mx-2">/</span>
                                <span className="text-[13px] font-black text-gray-400">{totalPages}</span>
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] font-black text-gray-800 hover:border-gray-900 transition-all disabled:opacity-30 disabled:hover:border-gray-200 uppercase tracking-widest shadow-sm"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

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

                <ConfirmDialog
                    isOpen={isRevisitConfirmOpen}
                    onClose={() => {
                        setIsRevisitConfirmOpen(false);
                        setRevisitProblemId(null);
                        setRevisitNote('');
                    }}
                    onConfirm={handleRevisit}
                    title="Mark as Revisited"
                    description="Record your revisit session. You can optionally add notes about what you learned."
                    confirmLabel={revisitNote.trim() ? "Submit" : "Proceed without note"}
                    variant="info"
                    loading={revisitMutation.isPending}
                >
                    <textarea
                        value={revisitNote}
                        onChange={(e) => setRevisitNote(e.target.value)}
                        placeholder="What did you learn? Any pitfalls to remember next time?"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white focus:border-transparent transition-all resize-none"
                        rows={3}
                    />
                </ConfirmDialog>
            </div>
        </div>
    );
};

export default Dashboard;
