import React, { useState, useMemo } from 'react';
import { Search, Filter, Clock, ExternalLink, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useHistory, type RevisitHistoryItem } from '../hooks/useProblems';
import CustomLoader from '../components/CustomLoader';
import { Link } from 'react-router-dom';

const RevisitJournal: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
    const [topicFilter, setTopicFilter] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

    const { data: history = [], isLoading, isError } = useHistory(searchQuery);

    // Derived Data. A history entry's problem may have zero, one, or several
    // topics -- fall back to "General" when it has none so the filter still
    // has somewhere to put it.
    const topicsOf = (item: RevisitHistoryItem): string[] => item.topics?.length ? item.topics : ['General'];

    const topics = useMemo(() => {
        const uniqueTopics = new Set(history.flatMap(topicsOf));
        return Array.from(uniqueTopics).sort();
    }, [history]);

    const filteredHistory = useMemo(() => {
        return history.filter(item => {
            const matchesDifficulty = !difficultyFilter || item.difficulty.toLowerCase() === difficultyFilter.toLowerCase();
            const matchesTopic = !topicFilter || topicsOf(item).includes(topicFilter);
            return matchesDifficulty && matchesTopic;
        });
    }, [history, difficultyFilter, topicFilter]);

    // Group history by date
    const groupedHistory = useMemo(() => {
        const groups: Record<string, RevisitHistoryItem[]> = {};
        filteredHistory.forEach(item => {
            const date = new Date(item.revisited_at).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            if (!groups[date]) groups[date] = [];
            groups[date].push(item);
        });
        return groups;
    }, [filteredHistory]);

    const toggleDate = (date: string) => {
        setExpandedDates(prev => ({
            ...prev,
            [date]: !prev[date]
        }));
    };

    return (
        <div className="max-w-5xl mx-auto pb-20 px-4">
            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight mb-1.5">Journey</h1>
                        <p className="text-[13px] text-[var(--text-secondary)]">A chronicle of your path to technical mastery.</p>
                    </div>
                </div>

                {/* Unified Filter Bar */}
                <div className="flex flex-row gap-2 items-center">
                    <div className="relative group flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-secondary)] group-focus-within:text-green-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search milestones..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-[var(--bg-surface-raised)] border border-[var(--border-default)] rounded-md text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-green-500/40 focus:border-green-500/40 transition-all"
                        />
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium text-[13px] transition-colors border ${difficultyFilter || topicFilter || showFilters
                                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-default)]'
                                : 'bg-transparent text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            <Filter className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Filters</span>
                            {(difficultyFilter || topicFilter) && (
                                <span className="flex items-center justify-center w-4 h-4 bg-green-500 text-zinc-950 text-[9px] font-semibold rounded-full">
                                    {(difficultyFilter ? 1 : 0) + (topicFilter ? 1 : 0)}
                                </span>
                            )}
                        </button>

                        {showFilters && (
                            <>
                                <div className="fixed inset-0 z-20" onClick={() => setShowFilters(false)} />
                                <div className="absolute right-0 mt-2 w-60 bg-[var(--bg-surface-raised)] rounded-lg border border-[var(--border-default)] shadow-2xl z-30 overflow-hidden">
                                    <div className="p-2.5 border-b border-[var(--border-subtle)] flex justify-between items-center">
                                        <p className="text-[11px] font-medium text-[var(--text-secondary)]">Filters</p>
                                        {(difficultyFilter || topicFilter) && (
                                            <button
                                                onClick={() => {
                                                    setDifficultyFilter(null);
                                                    setTopicFilter(null);
                                                }}
                                                className="text-[11px] font-medium text-green-400 hover:text-green-300"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                    <div className="p-2.5 space-y-3.5">
                                        <div>
                                            <p className="text-[11px] font-medium text-[var(--text-secondary)] mb-1.5">Difficulty</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {['all', 'easy', 'medium', 'hard'].map((level) => (
                                                    <button
                                                        key={level}
                                                        onClick={() => setDifficultyFilter(level === 'all' ? null : level)}
                                                        className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${(level === 'all' && !difficultyFilter) || difficultyFilter === level
                                                            ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                                                            : 'bg-[var(--bg-surface-raised)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                                                            }`}
                                                    >
                                                        {level.charAt(0).toUpperCase() + level.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-medium text-[var(--text-secondary)] mb-1.5">Topic</p>
                                            <div className="space-y-0.5 max-h-40 overflow-y-auto custom-scrollbar">
                                                <button
                                                    onClick={() => setTopicFilter(null)}
                                                    className={`w-full text-left px-2 py-1.5 rounded-md text-[12px] font-medium transition-colors ${!topicFilter ? 'bg-green-500/10 text-green-400' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
                                                        }`}
                                                >
                                                    All topics
                                                </button>
                                                {topics.map((t) => (
                                                    <button
                                                        key={t}
                                                        onClick={() => setTopicFilter(t)}
                                                        className={`w-full text-left px-2 py-1.5 rounded-md text-[12px] font-medium transition-colors truncate ${topicFilter === t ? 'bg-green-500/10 text-green-400' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
                                                            }`}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Timeline Section */}
            {isLoading ? (
                <div className="py-20 text-center">
                    <CustomLoader text="Loading your history..." />
                </div>
            ) : isError ? (
                <div className="text-center py-16 bg-red-500/[0.04] rounded-lg border border-red-500/10">
                    <p className="text-red-400 font-medium text-[13px]">Failed to load history. Please try again later.</p>
                </div>
            ) : Object.keys(groupedHistory).length === 0 ? (
                <div className="text-center py-24 bg-[var(--bg-surface)] rounded-lg border border-dashed border-[var(--border-default)]">
                    <div className="w-14 h-14 bg-[var(--bg-surface-hover)] rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-6 h-6 text-[var(--text-tertiary)]" strokeWidth={1.5} />
                    </div>
                    <p className="text-[var(--text-secondary)] font-medium text-[14px]">No entries found.</p>
                    <p className="text-[var(--text-tertiary)] text-[12px] mt-1">Try a different search or start revisiting problems!</p>
                </div>
            ) : (
                <div className="relative pb-12 mt-10 overflow-hidden">
                    <div className="space-y-5">
                        {Object.entries(groupedHistory).map(([date, entries], index, array) => {
                            const isExpanded = expandedDates[date];
                            const isFirst = index === 0;
                            const isLast = index === array.length - 1;

                            return (
                                <div key={date} className="relative z-10 group/item">
                                    {/* Timeline Line Fragment */}
                                    {!isFirst && (
                                        <div className="absolute left-[10px] top-0 h-4 w-px bg-[var(--bg-elevated)] z-0" />
                                    )}
                                    {!isLast && (
                                        <div className="absolute left-[10px] top-4 bottom-0 w-px bg-[var(--bg-elevated)] z-0" />
                                    )}

                                    {/* Date Header Row (Clickable) */}
                                    <button
                                        onClick={() => toggleDate(date)}
                                        className="w-full flex items-center gap-3 group/header hover:bg-[var(--bg-surface)] transition-colors rounded-md py-2 -ml-1 pl-1 relative z-10"
                                    >
                                        {/* Left: Indicator Dot */}
                                        <div className="w-8 shrink-0 flex justify-center">
                                            <div className={`size-2.5 rounded-full border-2 transition-all duration-300 z-10 ${isExpanded ? 'bg-green-500 border-green-500 scale-125' : 'bg-[var(--bg-app)] border-[var(--border-strong)]'}`} />
                                        </div>

                                        {/* Right: Date Text & Chevron */}
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <h2 className={`text-[12px] font-medium whitespace-nowrap transition-colors ${isExpanded ? 'text-green-400' : 'text-[var(--text-primary)]'}`}>
                                                {date}
                                            </h2>
                                            <div className="h-px bg-[var(--bg-elevated)] flex-1" />
                                            {isExpanded ? (
                                                <ChevronUp className="w-3.5 h-3.5 text-green-400 shrink-0" />
                                            ) : (
                                                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                                            )}
                                        </div>
                                    </button>

                                    {/* Collapsible Content */}
                                    <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}`}>
                                        <div className="overflow-hidden">
                                            <div className="grid gap-2 pl-[36px] pb-4">
                                                {entries.map((item) => (
                                                    <Link
                                                        to={`/problem/${item.problem_id}`}
                                                        key={item.id}
                                                        className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-5 hover:border-[var(--border-strong)] transition-colors group relative overflow-hidden"
                                                    >
                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-3 mb-1.5">
                                                                    <h3 className="text-[14px] font-semibold text-[var(--text-primary)] group-hover:text-green-400 transition-colors block leading-snug truncate">
                                                                        {item.problem_title}
                                                                    </h3>
                                                                    <span className="text-[11px] font-medium text-[var(--text-secondary)] flex items-center gap-1.5 bg-[var(--bg-surface-raised)] px-2 py-0.5 rounded-full shrink-0">
                                                                        <Clock className="w-3 h-3 text-[var(--text-tertiary)]" />
                                                                        {new Date(item.revisited_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>

                                                                {item.notes && (
                                                                    <div className="hidden md:block mt-2 relative max-w-2xl px-3 py-1.5 bg-[var(--bg-surface-raised)] rounded-md border border-[var(--border-subtle)]">
                                                                        <p className="text-[12px] leading-relaxed text-[var(--text-secondary)] italic">
                                                                            "{item.notes}"
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="hidden md:flex items-center gap-2 shrink-0">
                                                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--bg-surface-raised)] text-[11px] font-medium text-[var(--text-secondary)] group-hover:text-green-400 group-hover:bg-green-500/10 transition-colors rounded-md">
                                                                    View source
                                                                    <ExternalLink className="w-3 h-3" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RevisitJournal;
