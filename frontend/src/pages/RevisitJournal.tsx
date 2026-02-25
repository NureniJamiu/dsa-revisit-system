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

    // Derived Data
    const topics = useMemo(() => {
        const uniqueTopics = new Set(history.map(item => item.topic || 'General'));
        return Array.from(uniqueTopics).sort();
    }, [history]);

    const filteredHistory = useMemo(() => {
        return history.filter(item => {
            const matchesDifficulty = !difficultyFilter || item.difficulty.toLowerCase() === difficultyFilter.toLowerCase();
            const matchesTopic = !topicFilter || (item.topic || 'General') === topicFilter;
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
            <div className="mb-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-gray-800 tracking-tight mb-2">Journey</h1>
                        <p className="text-[15px] font-medium text-gray-400">A chronicle of your path to technical mastery.</p>
                    </div>
                </div>

                {/* Unified Filter Bar */}
                <div className="flex flex-row gap-3 items-center">
                    <div className="relative group flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search milestones..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-base font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all shadow-sm"
                        />
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-3 py-2 md:py-3 rounded-xl font-bold transition-all shadow-sm border ${difficultyFilter || topicFilter || showFilters
                                ? 'bg-gray-900 text-white border-gray-900'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-900'
                                }`}
                        >
                            <Filter className="w-4 h-4" />
                            <span className="hidden md:inline text-xs">Filters</span>
                            {(difficultyFilter || topicFilter) && (
                                <span className="flex items-center justify-center w-4 h-4 bg-emerald-500 text-white text-[9px] rounded-full">
                                    {(difficultyFilter ? 1 : 0) + (topicFilter ? 1 : 0)}
                                </span>
                            )}
                        </button>

                        {showFilters && (
                            <>
                                <div className="fixed inset-0 z-20" onClick={() => setShowFilters(false)} />
                                <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl border border-gray-100 shadow-2xl z-30 overflow-hidden">
                                    <div className="p-3 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filters</p>
                                        {(difficultyFilter || topicFilter) && (
                                            <button
                                                onClick={() => {
                                                    setDifficultyFilter(null);
                                                    setTopicFilter(null);
                                                }}
                                                className="text-[9px] font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                    <div className="p-3 space-y-4">
                                        <div>
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Difficulty</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {['all', 'easy', 'medium', 'hard'].map((level) => (
                                                    <button
                                                        key={level}
                                                        onClick={() => setDifficultyFilter(level === 'all' ? null : level)}
                                                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${(level === 'all' && !difficultyFilter) || difficultyFilter === level
                                                            ? 'bg-gray-900 text-white'
                                                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                                            }`}
                                                    >
                                                        {level.charAt(0).toUpperCase() + level.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Topic</p>
                                            <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                                                <button
                                                    onClick={() => setTopicFilter(null)}
                                                    className={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all ${!topicFilter ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    All Topics
                                                </button>
                                                {topics.map((t) => (
                                                    <button
                                                        key={t}
                                                        onClick={() => setTopicFilter(t)}
                                                        className={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all truncate ${topicFilter === t ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'
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
                <div className="text-center py-16 bg-red-50 rounded-3xl border border-red-100">
                    <p className="text-red-600 font-bold">Failed to load history. Please try again later.</p>
                </div>
            ) : Object.keys(groupedHistory).length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-400 font-bold text-lg">No entries found.</p>
                    <p className="text-gray-300 text-sm mt-1">Try a different search or start revisiting problems!</p>
                </div>
            ) : (
                <div className="relative pb-12 mt-12 overflow-hidden">
                    <div className="space-y-6">
                        {Object.entries(groupedHistory).map(([date, entries], index, array) => {
                            const isExpanded = expandedDates[date];
                            const isFirst = index === 0;
                            const isLast = index === array.length - 1;

                            return (
                                <div key={date} className="relative z-10 group/item">
                                    {/* Timeline Line Fragment */}
                                    {!isFirst && (
                                        <div className="absolute left-[10px] top-0 h-4 w-px bg-gray-200 z-0" />
                                    )}
                                    {!isLast && (
                                        <div className="absolute left-[10px] top-4 bottom-0 w-px bg-gray-200 z-0" />
                                    )}

                                    {/* Date Header Row (Clickable) */}
                                    <button
                                        onClick={() => toggleDate(date)}
                                        className="w-full flex items-center gap-3 group/header hover:bg-emerald-500/5 transition-colors rounded-xl py-2 -ml-1 pl-1 relative z-10"
                                    >
                                        {/* Left: Indicator Dot */}
                                        <div className="w-8 shrink-0 flex justify-center">
                                            <div className={`size-3 rounded-full border-2 transition-all duration-300 z-10 ${isExpanded ? 'bg-emerald-500 border-emerald-500 scale-125' : 'bg-[#F5F0EB] border-gray-300'}`} />
                                        </div>

                                        {/* Right: Date Text & Chevron */}
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <h2 className={`text-xs font-black uppercase tracking-widest whitespace-nowrap transition-colors ${isExpanded ? 'text-emerald-600' : 'text-gray-900'}`}>
                                                {date}
                                            </h2>
                                            <div className="h-px bg-gray-100 flex-1" />
                                            {isExpanded ? (
                                                <ChevronUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                            ) : (
                                                <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
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
                                                        className="bg-white border border-gray-100/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden"
                                                    >
                                                        {/* Accent Gradient */}
                                                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />

                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-3 mb-1.5">
                                                                    <h3 className="text-[17px] font-black text-gray-900 group-hover:text-emerald-600 transition-colors block leading-snug tracking-tight truncate">
                                                                        {item.problem_title}
                                                                    </h3>
                                                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 bg-gray-50/80 px-2 py-0.5 rounded-full shrink-0">
                                                                        <Clock className="w-3 h-3 text-emerald-500/50" />
                                                                        {new Date(item.revisited_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>

                                                                {item.notes && (
                                                                    <div className="hidden md:block mt-2 relative max-w-2xl px-3 py-1 bg-gray-50/50 rounded-lg border border-gray-100">
                                                                        <p className="text-[10px] font-medium leading-relaxed text-gray-500 italic">
                                                                            "{item.notes}"
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="hidden md:flex items-center gap-2 shrink-0">
                                                                <div
                                                                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-[9px] font-black text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all rounded-lg uppercase tracking-wider border border-transparent hover:border-emerald-100"
                                                                >
                                                                    View Source
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
