import React, { useState, useMemo } from 'react';
import { Search, ExternalLink, MessageSquare, Clock, Calendar } from 'lucide-react';
import { useHistory, type RevisitHistoryItem } from '../hooks/useProblems';
import CustomLoader from '../components/CustomLoader';
import { Link } from 'react-router-dom';

const RevisitJournal: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const { data: history = [], isLoading, isError } = useHistory(searchQuery);

    // Group history by date
    const groupedHistory = useMemo(() => {
        const groups: Record<string, RevisitHistoryItem[]> = {};
        history.forEach(item => {
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
    }, [history]);

    const getDifficultyColor = (diff: string) => {
        switch (diff.toLowerCase()) {
            case 'hard': return 'bg-red-50 text-red-600 border-red-100';
            case 'medium': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
            case 'easy': return 'bg-green-50 text-green-600 border-green-100';
            default: return 'bg-gray-50 text-gray-600 border-gray-100';
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Simple Header */}
            <div className="mb-12">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-4">Journey</h1>
                <p className="text-gray-500 font-medium text-lg">A simple log of your daily problem-solving milestones.</p>

                {/* Clean Search Bar */}
                <div className="mt-8 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search your history..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-base font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all shadow-sm"
                    />
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
                <div className="space-y-12">
                    {Object.entries(groupedHistory).map(([date, entries]) => (
                        <div key={date}>
                            {/* Simple Date Header */}
                            <div className="flex items-center gap-4 mb-6 sticky top-0 bg-[#F5F0EB]/90 backdrop-blur-sm py-2 z-10">
                                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                    {date}
                                </h2>
                                <div className="h-px w-full bg-gray-200" />
                            </div>

                            <div className="grid gap-4">
                                {entries.map((item) => (
                                    <div
                                        key={item.id}
                                        className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group flex flex-col md:flex-row md:items-center justify-between gap-4"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${getDifficultyColor(item.difficulty)}`}>
                                                    {item.difficulty}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(item.revisited_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>

                                            <Link
                                                to={`/problem/${item.problem_id}`}
                                                className="text-lg font-bold text-gray-900 hover:text-emerald-600 transition-colors block truncate"
                                            >
                                                {item.problem_title}
                                            </Link>

                                            {item.notes && (
                                                <div className="mt-3 flex items-start gap-2 text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                    <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                                                    <p className="text-sm font-medium leading-relaxed italic line-clamp-2 md:line-clamp-none">
                                                        "{item.notes}"
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 shrink-0">
                                            <a
                                                href={item.problem_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-emerald-600 transition-colors uppercase tracking-widest"
                                            >
                                                Source
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RevisitJournal;
