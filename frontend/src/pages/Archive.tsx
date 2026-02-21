import React from 'react';
import { Link } from 'react-router-dom';
import { Archive as ArchiveIcon } from 'lucide-react';
import CustomLoader from '../components/CustomLoader';
import { useProblems } from '../hooks/useProblems';

const Archive: React.FC = () => {
    const { data: archivedProblems = [], isLoading } = useProblems('retired');

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

    if (isLoading) {
        return (
            <div className="max-w-5xl mx-auto flex flex-col items-center justify-center py-32">
                <CustomLoader text="Opening the vault..." />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="mb-12">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">The Vault</h1>
                <p className="text-[15px] font-medium text-gray-400">Your collection of mastered concepts and retired problems.</p>
            </div>

            {archivedProblems.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm border-dashed py-32 flex flex-col items-center justify-center text-center px-10">
                    <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-8 border border-gray-100">
                        <ArchiveIcon className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2">The Vault is empty</h3>
                    <p className="text-sm font-medium text-gray-400 max-w-sm">
                        Problems you retire from your active library will appear here for historical reference.
                    </p>
                    <div className="mt-10">
                        <Link to="/" className="text-[11px] font-black text-green-600 uppercase tracking-widest hover:text-green-700 transition-colors">
                            Return to Library
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden w-full relative">
                    <div className="overflow-x-auto min-w-0 custom-scrollbar">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    <th className="text-left px-6 md:px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                        Retired Problem
                                    </th>
                                    <th className="text-left px-6 md:px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                        Final Mastery
                                    </th>
                                    <th className="text-left px-6 md:px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                        Last Revisited
                                    </th>
                                    <th className="text-right px-6 md:px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                        View
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {archivedProblems.map((problem) => (
                                    <tr key={problem.id} className="group hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 md:px-8 py-4">
                                            <Link to={`/problem/${problem.id}`} className="text-sm font-black text-gray-900 group-hover:text-green-600 transition-colors block truncate">
                                                {problem.title}
                                            </Link>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 tracking-tight">{problem.source || 'LeetCode'}</p>
                                        </td>
                                        <td className="px-6 md:px-8 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 text-[11px] font-black text-green-700 whitespace-nowrap">
                                                {problem.times_revisited} Focus points
                                            </span>
                                        </td>
                                        <td className="px-6 md:px-8 py-4 text-sm font-bold text-gray-500 whitespace-nowrap">
                                            {getTimeAgo(problem.last_revisited_at)}
                                        </td>
                                        <td className="px-6 md:px-8 py-4 text-right">
                                            <Link
                                                to={`/problem/${problem.id}`}
                                                className="text-[11px] font-black text-gray-400 hover:text-green-600 uppercase tracking-widest transition-colors"
                                            >
                                                Details
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Archive;
