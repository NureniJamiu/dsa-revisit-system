import React, { useState, useMemo } from 'react';
import { Calendar, Search, Map, ExternalLink, MessageSquare, Clock } from 'lucide-react';
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

    // Heatmap Logic
    const heatmapData = useMemo(() => {
        // Last 6 months grid-ish
        const today = new Date();
        const data = [];
        for (let i = 20; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i * 7); // Rough weeks
            data.push({
                date: d,
                count: Math.floor(Math.random() * 5) // Mock for now or compute from history
            });
        }
        return data;
    }, []);

    const getDifficultyColor = (diff: string) => {
        switch (diff.toLowerCase()) {
            case 'hard': return 'text-red-600 bg-red-50';
            case 'medium': return 'text-yellow-600 bg-yellow-50';
            case 'easy': return 'text-green-600 bg-green-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    return (
        <div className="space-y-12 pb-24 md:pb-12">
            {/* Header section with Heatmap */}
            <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
                <div className="flex-1">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-3">Revisit Journey</h1>
                    <p className="text-gray-500 font-medium">Your path to mastery, visualized through time.</p>

                    {/* Search bar */}
                    <div className="mt-8 relative max-w-md group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Locate a specific milestone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-gray-100 rounded-2xl text-base font-bold focus:outline-none focus:border-green-500/30 focus:ring-4 focus:ring-green-500/5 transition-all shadow-sm"
                        />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border-2 border-gray-50 shadow-sm flex-shrink-0">
                    <div className="flex items-center gap-2 mb-4">
                        <Map className="w-4 h-4 text-green-500" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">Activity Pulse</span>
                    </div>
                    <div className="flex gap-1.5">
                        {heatmapData.map((week, i) => (
                            <div
                                key={i}
                                className={`w-3 h-12 rounded-full transition-all ${week.count > 3 ? 'bg-green-600' :
                                    week.count > 1 ? 'bg-green-400' :
                                        week.count > 0 ? 'bg-green-200' : 'bg-gray-100'
                                    }`}
                                title={`${week.date.toDateString()}: ${week.count} sessions`}
                            />
                        ))}
                    </div>
                    <p className="mt-4 text-[10px] font-bold text-gray-400 text-center uppercase tracking-tighter">Consistency is the fuel of mastery</p>
                </div>
            </div>

            {/* Timeline Section */}
            {isLoading ? (
                <div className="py-20">
                    <CustomLoader text="Unrolling your journey..." />
                </div>
            ) : isError ? (
                <div className="text-center py-20 bg-red-50 rounded-3xl border-2 border-red-100">
                    <p className="text-red-600 font-black">History could not be retrieved.</p>
                </div>
            ) : Object.keys(groupedHistory).length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                    <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400 font-bold">Your journey hasn't started yet. Revisit a problem to see it here.</p>
                </div>
            ) : (
                <div className="relative pl-8 md:pl-0">
                    {/* Central Line for Desktop */}
                    <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500 via-gray-200 to-transparent -translate-x-1/2 hidden md:block" />
                    {/* Line for Mobile */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500 via-gray-200 to-transparent -translate-x-1/2 md:hidden" />

                    <div className="space-y-20">
                        {Object.entries(groupedHistory).map(([date, entries]) => (
                            <div key={date} className="relative">
                                {/* Date Node */}
                                <div className="absolute left-8 md:left-1/2 -translate-x-1/2 -mt-2 z-10 flex flex-col items-center">
                                    <div className="w-4 h-4 rounded-full bg-white border-4 border-green-500 shadow-sm" />
                                    <div className="mt-2 text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap bg-[#F5F0EB] px-2 py-1 rounded">
                                        {date}
                                    </div>
                                </div>

                                <div className="pt-12 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-6">
                                    {entries.map((item, idx) => (
                                        <div
                                            key={item.id}
                                            className={`relative group ${idx % 2 === 0 ? 'md:text-right md:pr-4' : 'md:text-left md:pl-4 md:col-start-2'
                                                }`}
                                        >
                                            <div className={`bg-white p-6 rounded-2xl border-2 border-gray-50 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 group-hover:-translate-y-1 ${idx % 2 === 0 ? 'md:rounded-tr-none' : 'md:rounded-tl-none'
                                                }`}>
                                                <div className={`flex items-center gap-3 mb-3 ${idx % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${getDifficultyColor(item.difficulty)}`}>
                                                        {item.difficulty}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(item.revisited_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>

                                                <Link to={`/problem/${item.problem_id}`}>
                                                    <h3 className="text-lg font-black text-gray-900 group-hover:text-green-600 transition-colors mb-2">
                                                        {item.problem_title}
                                                    </h3>
                                                </Link>

                                                <div className={`flex items-center gap-4 ${idx % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                                                    <a
                                                        href={item.problem_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-gray-400 hover:text-green-600 transition-colors"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                    {item.notes && (
                                                        <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                                                            <MessageSquare className="w-3.5 h-3.5" />
                                                            <span className="truncate max-w-[150px]">{item.notes}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Connector line for desktop */}
                                            <div className={`absolute top-1/2 w-8 h-0.5 bg-gray-100 -translate-y-1/2 hidden md:block ${idx % 2 === 0 ? 'right-[-2rem]' : 'left-[-2rem]'
                                                }`} />
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
