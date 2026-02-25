import React, { useState, useMemo } from 'react';
import { Search, ExternalLink, MessageSquare, Clock, Calendar, Trophy, Target, Hash, Filter } from 'lucide-react';
import { useHistory, type RevisitHistoryItem } from '../hooks/useProblems';
import CustomLoader from '../components/CustomLoader';
import { Link } from 'react-router-dom';

const RevisitJournal: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
    const [topicFilter, setTopicFilter] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    const { data: history = [], isLoading, isError } = useHistory(searchQuery);

    // Derived Data
    const topics = useMemo(() => {
        const uniqueTopics = new Set(history.map(item => item.topic || 'General'));
        return Array.from(uniqueTopics).sort();
    }, [history]);

    const stats = useMemo(() => {
        if (history.length === 0) return { total: 0, streak: 0, topTopic: 'None' };

        // Total
        const total = history.length;

        // Streak
        const dates = history
            .map(item => new Date(item.revisited_at).toDateString())
            .filter((value, index, self) => self.indexOf(value) === index)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        let streak = 0;
        const now = new Date();
        const today = new Date(now.toDateString());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const firstDate = new Date(dates[0]);
        if (firstDate >= yesterday) {
            streak = 1;
            for (let i = 0; i < dates.length - 1; i++) {
                const current = new Date(dates[i]);
                const next = new Date(dates[i + 1]);
                const diff = (current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24);
                if (diff <= 1.1) { // Allow slight overhead for timezones
                    streak++;
                } else {
                    break;
                }
            }
        }

        // Top Topic
        const topicCounts: Record<string, number> = {};
        history.forEach(item => {
            const t = item.topic || 'General';
            topicCounts[t] = (topicCounts[t] || 0) + 1;
        });
        const topTopic = Object.entries(topicCounts).reduce((a, b) => b[1] > a[1] ? b : a, ['None', 0])[0];

        return { total, streak, topTopic };
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

    const getDifficultyColor = (diff: string) => {
        switch (diff.toLowerCase()) {
            case 'hard': return 'bg-red-50 text-red-600 border-red-100';
            case 'medium': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
            case 'easy': return 'bg-green-50 text-green-600 border-green-100';
            default: return 'bg-gray-50 text-gray-600 border-gray-100';
        }
    };

    return (
        <div className="max-w-5xl mx-auto pb-20 px-4 md:px-0">
            {/* Simple Header */}
            <div className="mb-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Journey</h1>
                        <p className="text-gray-500 font-medium text-lg">A chronicle of your path to technical mastery.</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform">
                                <Trophy className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Milestones</span>
                        </div>
                        <p className="text-3xl font-black text-gray-900">{stats.total}</p>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-orange-50 rounded-2xl text-orange-600 group-hover:scale-110 transition-transform">
                                <Target className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Current Streak</span>
                        </div>
                        <p className="text-3xl font-black text-gray-900">{stats.streak} Days</p>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform">
                                <Hash className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Top Topic</span>
                        </div>
                        <p className="text-3xl font-black text-gray-900 truncate" title={stats.topTopic}>{stats.topTopic}</p>
                    </div>
                </div>

                {/* Unified Filter Bar */}
                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                    <div className="relative group flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search your milestones..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-base font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all shadow-sm"
                        />
                    </div>

                    <div className="flex gap-2">
                        <div className="relative">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all shadow-sm border ${difficultyFilter || topicFilter || showFilters
                                        ? 'bg-gray-900 text-white border-gray-900'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-900'
                                    }`}
                            >
                                <Filter className="w-5 h-5" />
                                Filters
                                {(difficultyFilter || topicFilter) && (
                                    <span className="flex items-center justify-center w-5 h-5 bg-emerald-500 text-white text-[10px] rounded-full">
                                        {(difficultyFilter ? 1 : 0) + (topicFilter ? 1 : 0)}
                                    </span>
                                )}
                            </button>

                            {showFilters && (
                                <>
                                    <div className="fixed inset-0 z-20" onClick={() => setShowFilters(false)} />
                                    <div className="absolute right-0 mt-3 w-72 bg-white rounded-3xl border border-gray-100 shadow-2xl z-30 overflow-hidden">
                                        <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Refine View</p>
                                            {(difficultyFilter || topicFilter) && (
                                                <button
                                                    onClick={() => {
                                                        setDifficultyFilter(null);
                                                        setTopicFilter(null);
                                                    }}
                                                    className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700"
                                                >
                                                    Clear All
                                                </button>
                                            )}
                                        </div>
                                        <div className="p-4 space-y-6">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Difficulty</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {['all', 'easy', 'medium', 'hard'].map((level) => (
                                                        <button
                                                            key={level}
                                                            onClick={() => setDifficultyFilter(level === 'all' ? null : level)}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${(level === 'all' && !difficultyFilter) || difficultyFilter === level
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
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Topic</p>
                                                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                                                    <button
                                                        onClick={() => setTopicFilter(null)}
                                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${!topicFilter ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        All Topics
                                                    </button>
                                                    {topics.map((t) => (
                                                        <button
                                                            key={t}
                                                            onClick={() => setTopicFilter(t)}
                                                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all truncate ${topicFilter === t ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'
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
            </div>

            {/* List Section */}
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
                <div className="relative pb-12">
                    {/* Continuous Timeline Line */}
                    <div className="absolute left-0 md:left-24 top-0 bottom-0 w-px bg-gray-200 z-0" />

                    <div className="space-y-16">
                        {Object.entries(groupedHistory).map(([date, entries]) => (
                            <div key={date} className="relative z-10">
                                {/* Date Ribbon */}
                                <div className="flex items-center gap-6 mb-8 group/date">
                                    <div className="hidden md:flex w-24 shrink-0 justify-end">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right leading-tight">
                                            {new Date(entries[0].revisited_at).toLocaleDateString('en-US', { month: 'short' })}<br />
                                            {new Date(entries[0].revisited_at).getDate()}
                                        </p>
                                    </div>
                                    <div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-emerald-500 border-4 border-[#F5F0EB] ring-1 ring-emerald-500 shrink-0 -ml-1 md:ml-0" />
                                    <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest whitespace-nowrap bg-[#F5F0EB] pr-4">
                                        {date}
                                    </h2>
                                </div>

                                <div className="grid gap-6 md:ml-24">
                                    {entries.map((item) => (
                                        <div
                                            key={item.id}
                                            className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-500 group relative overflow-hidden"
                                        >
                                            {/* Accent Gradient */}
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />

                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-3 mb-4">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${getDifficultyColor(item.difficulty)}`}>
                                                            {item.difficulty}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded">
                                                            <Hash className="w-3 h-3" />
                                                            {item.topic || 'General'}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(item.revisited_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>

                                                    <Link
                                                        to={`/problem/${item.problem_id}`}
                                                        className="text-2xl font-black text-gray-900 hover:text-emerald-600 transition-colors block leading-tight mb-2"
                                                    >
                                                        {item.problem_title}
                                                    </Link>

                                                    {item.notes && (
                                                        <div className="mt-4 relative">
                                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-100 rounded-full" />
                                                            <div className="pl-6 py-1">
                                                                <MessageSquare className="absolute left-6 -top-1 w-4 h-4 text-emerald-200" />
                                                                <p className="text-sm font-medium leading-relaxed text-gray-600 italic">
                                                                    {item.notes}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-4 shrink-0 self-end md:self-start">
                                                    <a
                                                        href={item.problem_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-[10px] font-black text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all rounded-xl uppercase tracking-widest border border-transparent hover:border-emerald-100"
                                                    >
                                                        View Solution
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RevisitJournal;
