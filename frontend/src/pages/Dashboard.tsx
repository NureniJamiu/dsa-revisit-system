import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Filter, CheckCircle, Zap, Plus, Edit2, Trash2, Search, X, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { useAllWeights, useTodaysFocus, useRevisitProblemMutation, useDeleteProblemMutation, type Problem } from '../hooks/useProblems';
import AddProblemModal from '../components/AddProblemModal';
import ConfirmDialog from '../components/ConfirmDialog';
import CustomLoader from '../components/CustomLoader';
import { topicBadgeStyle } from '../lib/topicColors';
import WeightBreakdown from '../components/WeightBreakdown';
import ActivityHeatmap from '../components/ActivityHeatmap';

type SortColumn = 'title' | 'last_touch' | 'attempts' | 'weight';

const Dashboard: React.FC = () => {
    const { data: weightedProblems = [], isLoading: loading, isError: problemsError } = useAllWeights();
    const problems = React.useMemo(() => weightedProblems.map(w => w.problem), [weightedProblems]);
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
    const [topicFilter, setTopicFilter] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [sortColumn, setSortColumn] = useState<SortColumn>('weight');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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
            case 'high': return { text: 'text-[var(--status-hard-text)]', badge: 'bg-[var(--status-hard-bg)]' };
            case 'medium': return { text: 'text-[var(--status-medium-text)]', badge: 'bg-[var(--status-medium-bg)]' };
            case 'low': return { text: 'text-[var(--status-easy-text)]', badge: 'bg-[var(--status-easy-bg)]' };
            default: return { text: 'text-[var(--text-secondary)]', badge: 'bg-[var(--bg-surface-hover)]' };
        }
    };

    const getDifficultyStyle = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case 'hard': return 'bg-[var(--status-hard-bg)] text-[var(--status-hard-text)]';
            case 'medium': return 'bg-[var(--status-medium-bg)] text-[var(--status-medium-text)]';
            default: return 'bg-[var(--status-easy-bg)] text-[var(--status-easy-text)]';
        }
    };

    const summary = todaysFocus?.summary;
    const completionPct = summary && summary.total_focus > 0
        ? Math.round((summary.completed / summary.total_focus) * 100)
        : 0;

    const topics = Array.from(
        new Set(problems.flatMap(p => p.topics ?? []).filter((t): t is string => !!t?.trim()))
    ).sort((a, b) => a.localeCompare(b));
    const activeFilterCount = (difficultyFilter ? 1 : 0) + (topicFilter ? 1 : 0);

    const filteredProblems = weightedProblems.filter(({ problem: p }) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = p.title.toLowerCase().includes(query) ||
            (p.source?.toLowerCase() || '').includes(query) ||
            (p.topics ?? []).some(t => t.toLowerCase().includes(query));
        const matchesDifficulty = !difficultyFilter || p.difficulty?.toLowerCase() === difficultyFilter.toLowerCase();
        const matchesTopic = !topicFilter || (p.topics ?? []).includes(topicFilter);
        return matchesSearch && matchesDifficulty && matchesTopic;
    });

    const sortedProblems = [...filteredProblems].sort((a, b) => {
        let cmp = 0;
        switch (sortColumn) {
            case 'title':
                cmp = a.problem.title.localeCompare(b.problem.title);
                break;
            case 'last_touch': {
                const at = a.problem.last_revisited_at ? new Date(a.problem.last_revisited_at).getTime() : 0;
                const bt = b.problem.last_revisited_at ? new Date(b.problem.last_revisited_at).getTime() : 0;
                cmp = at - bt;
                break;
            }
            case 'attempts':
                cmp = a.problem.times_revisited - b.problem.times_revisited;
                break;
            case 'weight':
            default:
                cmp = a.weight.weight - b.weight.weight;
                break;
        }
        return sortDirection === 'asc' ? cmp : -cmp;
    });

    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortColumn(column);
            setSortDirection(column === 'title' ? 'asc' : 'desc');
        }
    };

    const SortHeader: React.FC<{ column: SortColumn; children: React.ReactNode }> = ({ column, children }) => {
        const active = sortColumn === column;
        return (
            <button
                type="button"
                onClick={() => handleSort(column)}
                className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors hover:text-[var(--text-primary)] ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
            >
                {children}
                {active ? (
                    sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                )}
            </button>
        );
    };

    // Pagination Logic
    const totalPages = Math.ceil(sortedProblems.length / ITEMS_PER_PAGE);
    const paginatedProblems = sortedProblems.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset page on filter change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, difficultyFilter, topicFilter]);

    return (
        <div className="space-y-10 pb-24 md:pb-12">
            {/* Greeting Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight mb-1.5 break-words">
                        {getGreeting()}{user?.firstName ? `, ${user.firstName}` : ''}
                    </h1>
                    <p className="text-[13px] text-[var(--text-secondary)]">Your mastery curve is looking strong today.</p>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-6">
                    <button
                        onClick={() => {
                            setEditingProblem(null);
                            setIsAddModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-[13px] font-medium rounded-md hover:bg-[var(--btn-primary-hover-bg)] transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add problem
                    </button>
                    <div className="text-right">
                        <p className="text-[11px] font-medium text-[var(--text-tertiary)] mb-0.5">Total tracked</p>
                        <p className="text-lg font-semibold text-[var(--text-primary)]">{problems.length}</p>
                    </div>
                </div>
            </div>

            <ActivityHeatmap />

            {/* Today's Focus Section */}
            <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2.5">
                        <h2 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight">Today's focus</h2>
                        {summary && summary.total_focus > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-[11px] font-medium text-green-400">
                                {summary.remaining} remaining
                            </span>
                        )}
                    </div>
                    {summary && summary.total_focus > 0 && (
                        <div className="flex items-center gap-3 bg-[var(--bg-surface-raised)] px-3 py-1.5 rounded-md border border-[var(--border-subtle)]">
                            <span className="text-[12px] font-medium text-[var(--text-secondary)]">{summary.completed}/{summary.total_focus} complete</span>
                            <div className="w-24 bg-[var(--bg-elevated)] rounded-full h-1.5 overflow-hidden">
                                <div
                                    className="h-1.5 bg-green-500 transition-all duration-1000 ease-out"
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
                    <div className="text-center py-16 bg-red-500/[0.04] rounded-lg border border-red-500/10">
                        <h3 className="text-[15px] font-semibold text-red-300 mb-1">Failed to load today's focus</h3>
                        <p className="text-[13px] text-red-400/70">Please check your connection and try again.</p>
                    </div>
                ) : !todaysFocus || todaysFocus.problems.length === 0 ? (
                    <div className="text-center py-16 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-subtle)]">
                        <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-3" strokeWidth={1.5} />
                        <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">All caught up!</h3>
                        <p className="text-[13px] text-[var(--text-secondary)]">No problems scheduled for revisit today.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {todaysFocus.problems.map((item) => {
                            const priorityStyle = getPriorityStyle(item.weight.priority);

                            return (
                                <div
                                    key={item.problem.id}
                                    className={`group rounded-lg border transition-colors ${item.revisited_today
                                        ? 'bg-green-500/[0.04] border-green-500/15'
                                        : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                                        }`}
                                >
                                    <div className="p-5">
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex-1 min-w-0">
                                                <Link to={`/problem/${item.problem.id}`}>
                                                    <h3 className={`text-[14px] font-semibold leading-snug truncate transition-colors cursor-pointer ${item.revisited_today
                                                        ? 'text-green-300'
                                                        : 'text-[var(--text-primary)] group-hover:text-green-400'
                                                        }`}>
                                                        {item.problem.title}
                                                    </h3>
                                                </Link>
                                                <p className="text-[11px] font-medium text-[var(--text-secondary)] mt-1">
                                                    {item.problem.source || 'DSA Library'} · {getTimeAgo(item.problem.last_revisited_at)}
                                                </p>
                                            </div>
                                            <a
                                                href={item.problem.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-green-400 hover:bg-[var(--bg-surface-hover)] transition-colors flex-shrink-0"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        </div>

                                        <div className="flex items-center gap-1.5 mb-5 flex-wrap">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityStyle.badge} ${priorityStyle.text}`}>
                                                {item.weight.priority}
                                            </span>
                                            <WeightBreakdown weight={item.weight} lastRevisitedAt={item.problem.last_revisited_at} className="w-4 h-4" />
                                            {item.problem.difficulty && (
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getDifficultyStyle(item.problem.difficulty)}`}>
                                                    {item.problem.difficulty}
                                                </span>
                                            )}
                                            {(item.problem.topics ?? []).map((topic) => (
                                                <span
                                                    key={topic}
                                                    className="topic-badge px-1.5 py-0.5 rounded text-[10px] font-medium"
                                                    style={topicBadgeStyle(topic)}
                                                >
                                                    {topic}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="flex gap-2 pt-3 border-t border-[var(--border-subtle)]">
                                            {item.revisited_today ? (
                                                <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500/10 text-green-400 text-[12px] font-medium rounded-md">
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                    Revisited today
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setRevisitProblemId(item.problem.id);
                                                        setIsRevisitConfirmOpen(true);
                                                    }}
                                                    disabled={revisitMutation.isPending && revisitMutation.variables?.id === item.problem.id}
                                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-[12px] font-medium rounded-md hover:bg-[var(--btn-primary-hover-bg)] transition-colors disabled:opacity-50"
                                                >
                                                    {revisitMutation.isPending && revisitMutation.variables?.id === item.problem.id ? (
                                                        <div className="animate-spin w-3.5 h-3.5 border-2 border-[var(--btn-primary-text)]/20 border-t-[var(--btn-primary-text)] rounded-full" />
                                                    ) : (
                                                        <Zap className="w-3.5 h-3.5" />
                                                    )}
                                                    {revisitMutation.isPending && revisitMutation.variables?.id === item.problem.id ? 'Processing...' : 'Mark revisited'}
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
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
                    <h2 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight">All problems</h2>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        {/* Search Input */}
                        <div className="relative group flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-secondary)] group-focus-within:text-green-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search problems..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full sm:w-56 pl-8 pr-3 py-1.5 bg-[var(--bg-surface-raised)] border border-[var(--border-default)] rounded-md text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-green-500/40 focus:border-green-500/40 transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-[var(--bg-elevated)] rounded-full transition-colors"
                                >
                                    <X className="w-3 h-3 text-[var(--text-secondary)]" />
                                </button>
                            )}
                        </div>

                        {/* Filter Button & Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-md border transition-colors ${activeFilterCount > 0 || showFilters
                                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-default)]'
                                    : 'bg-transparent text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                <Filter className="w-3.5 h-3.5" />
                                Filter
                                {activeFilterCount > 0 && (
                                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500/15 text-green-400 text-[10px] font-semibold">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>

                            {showFilters && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowFilters(false)} />
                                    <div className="absolute right-0 mt-2 w-56 bg-[var(--bg-surface-raised)] rounded-lg border border-[var(--border-default)] shadow-2xl z-20 overflow-hidden max-h-80 overflow-y-auto custom-scrollbar">
                                        <div className="p-2 border-b border-[var(--border-subtle)]">
                                            <p className="text-[11px] font-medium text-[var(--text-secondary)] px-2 py-1">Difficulty</p>
                                        </div>
                                        <div className="p-1 border-b border-[var(--border-subtle)]">
                                            {['all', 'easy', 'medium', 'hard'].map((level) => (
                                                <button
                                                    key={level}
                                                    onClick={() => setDifficultyFilter(level === 'all' ? null : level)}
                                                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors ${(level === 'all' && !difficultyFilter) || difficultyFilter === level
                                                        ? 'bg-green-500/10 text-green-400'
                                                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
                                                        }`}
                                                >
                                                    {level.charAt(0).toUpperCase() + level.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                        {topics.length > 0 && (
                                            <>
                                                <div className="p-2 border-b border-[var(--border-subtle)]">
                                                    <p className="text-[11px] font-medium text-[var(--text-secondary)] px-2 py-1">Topic</p>
                                                </div>
                                                <div className="p-1">
                                                    <button
                                                        onClick={() => setTopicFilter(null)}
                                                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors ${!topicFilter
                                                            ? 'bg-green-500/10 text-green-400'
                                                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
                                                            }`}
                                                    >
                                                        All
                                                    </button>
                                                    {topics.map((topic) => (
                                                        <button
                                                            key={topic}
                                                            onClick={() => setTopicFilter(topicFilter === topic ? null : topic)}
                                                            className={`w-full flex items-center gap-2 text-left px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors ${topicFilter === topic
                                                                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                                                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
                                                                }`}
                                                        >
                                                            <span
                                                                className="w-2 h-2 rounded-full flex-shrink-0"
                                                                style={{ ...topicBadgeStyle(topic), background: 'hsl(var(--hue) 60% 50%)' }}
                                                            />
                                                            <span className="truncate">{topic}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-subtle)] overflow-hidden w-full relative group/table">
                    <div className="overflow-x-auto min-w-0 custom-scrollbar scroll-shadow-right">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--border-subtle)]">
                                    <th className="text-left px-5 md:px-6 py-3 whitespace-nowrap">
                                        <SortHeader column="title">Problem</SortHeader>
                                    </th>
                                    <th className="text-left px-5 md:px-6 py-3 whitespace-nowrap">
                                        <SortHeader column="last_touch">Last touch</SortHeader>
                                    </th>
                                    <th className="hidden md:table-cell text-left px-5 md:px-6 py-3 whitespace-nowrap">
                                        <SortHeader column="attempts">Attempts</SortHeader>
                                    </th>
                                    <th className="hidden lg:table-cell text-left px-5 md:px-6 py-3 whitespace-nowrap">
                                        <SortHeader column="weight">Weight</SortHeader>
                                    </th>
                                    <th className="text-right px-5 md:px-6 py-3 text-[11px] font-medium text-[var(--text-secondary)] min-w-[100px] whitespace-nowrap">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center">
                                            <CustomLoader text="Loading mastery archive..." />
                                        </td>
                                    </tr>
                                ) : problemsError ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <p className="text-[13px] text-red-400/80">Failed to load archive data. Try refreshing.</p>
                                        </td>
                                    </tr>
                                ) : paginatedProblems.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <p className="text-[13px] text-[var(--text-secondary)]">
                                                {searchQuery || difficultyFilter || topicFilter ? 'No problems match your filters.' : 'No problems tracked yet.'}
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedProblems.map(({ problem, weight }) => (
                                        <tr key={problem.id} className="group hover:bg-[var(--bg-surface)] transition-colors">
                                            <td className="px-5 md:px-6 py-3.5 min-w-[200px]">
                                                <Link to={`/problem/${problem.id}`} className="text-[13px] font-medium text-[var(--text-primary)] group-hover:text-green-400 transition-colors block truncate max-w-[200px] md:max-w-none">
                                                    {problem.title}
                                                </Link>
                                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                    <p className="text-[11px] text-[var(--text-secondary)]">{problem.source || 'Unknown'}</p>
                                                    {(problem.topics ?? []).map((topic) => (
                                                        <span
                                                            key={topic}
                                                            className="topic-badge px-1.5 py-0.5 rounded text-[10px] font-medium"
                                                            style={topicBadgeStyle(topic)}
                                                        >
                                                            {topic}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-5 md:px-6 py-3.5 text-[13px] text-[var(--text-secondary)] whitespace-nowrap">
                                                {getTimeAgo(problem.last_revisited_at)}
                                            </td>
                                            <td className="hidden md:table-cell px-5 md:px-6 py-3.5">
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--bg-surface-hover)] text-[11px] font-medium text-[var(--text-secondary)] whitespace-nowrap">
                                                    {problem.times_revisited} focus points
                                                </span>
                                            </td>
                                            <td className="hidden lg:table-cell px-5 md:px-6 py-3.5">
                                                <div className="flex items-center gap-1">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getPriorityStyle(weight.priority).badge} ${getPriorityStyle(weight.priority).text}`}>
                                                        {weight.priority}
                                                    </span>
                                                    <span className="font-mono-tabular text-[11px] text-[var(--text-tertiary)]">{weight.weight.toFixed(1)}</span>
                                                    <WeightBreakdown weight={weight} lastRevisitedAt={problem.last_revisited_at} className="w-4 h-4" />
                                                </div>
                                            </td>
                                            <td className="px-5 md:px-6 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-0.5">
                                                    <button
                                                        onClick={() => {
                                                            setEditingProblem(problem);
                                                            setIsAddModalOpen(true);
                                                        }}
                                                        className="p-1.5 text-[var(--text-tertiary)] hover:text-green-400 hover:bg-[var(--bg-surface-hover)] rounded-md transition-colors"
                                                        title="Edit problem"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setDeletingProblemId(problem.id);
                                                            setIsDeleteConfirmOpen(true);
                                                        }}
                                                        className="p-1.5 text-[var(--text-tertiary)] hover:text-red-400 hover:bg-[var(--bg-surface-hover)] rounded-md transition-colors"
                                                        title="Delete problem"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
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
                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-[12px] text-[var(--text-secondary)]">
                            Showing <span className="text-[var(--text-primary)]">{Math.min(filteredProblems.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}-{Math.min(filteredProblems.length, currentPage * ITEMS_PER_PAGE)}</span> of <span className="text-[var(--text-primary)]">{filteredProblems.length}</span>
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 bg-transparent border border-[var(--border-default)] rounded-md text-[12px] font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-30"
                            >
                                Previous
                            </button>
                            <div className="px-3 py-1.5 bg-[var(--bg-surface-raised)] rounded-md border border-[var(--border-subtle)]">
                                <span className="text-[12px] font-medium text-[var(--text-primary)]">{currentPage}</span>
                                <span className="text-[12px] text-[var(--text-tertiary)] mx-1.5">/</span>
                                <span className="text-[12px] font-medium text-[var(--text-secondary)]">{totalPages}</span>
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 bg-transparent border border-[var(--border-default)] rounded-md text-[12px] font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-30"
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
                    title="Delete problem"
                    description="Are you sure you want to permanently delete this problem and its entire revisit history? This action cannot be undone."
                    confirmLabel={deleteMutation.isPending ? "Deleting..." : "Delete permanently"}
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
                    title="Mark as revisited"
                    description="Record your revisit session. You can optionally add notes about what you learned."
                    confirmLabel={revisitNote.trim() ? "Submit" : "Proceed without note"}
                    variant="info"
                    loading={revisitMutation.isPending}
                >
                    <textarea
                        value={revisitNote}
                        onChange={(e) => setRevisitNote(e.target.value)}
                        placeholder="What did you learn? Any pitfalls to remember next time?"
                        className="w-full px-3.5 py-2.5 bg-[var(--bg-surface-raised)] border border-[var(--border-default)] rounded-md text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-green-500/40 focus:border-green-500/40 transition-all resize-none"
                        rows={3}
                    />
                </ConfirmDialog>
            </div>
        </div>
    );
};

export default Dashboard;
