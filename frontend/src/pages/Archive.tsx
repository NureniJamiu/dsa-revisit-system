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
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight mb-1.5">Archive</h1>
                <p className="text-[13px] text-[var(--text-secondary)]">Your collection of mastered concepts and retired problems.</p>
            </div>

            {archivedProblems.length === 0 ? (
                <div className="bg-[var(--bg-surface)] rounded-lg border border-dashed border-[var(--border-default)] py-28 flex flex-col items-center justify-center text-center px-10">
                    <div className="w-14 h-14 rounded-full bg-[var(--bg-surface-hover)] flex items-center justify-center mb-6 border border-[var(--border-subtle)]">
                        <ArchiveIcon className="w-6 h-6 text-[var(--text-tertiary)]" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">The archive is empty</h3>
                    <p className="text-[13px] text-[var(--text-secondary)] max-w-sm">
                        Problems you retire from your active library will appear here for historical reference.
                    </p>
                    <div className="mt-8">
                        <Link to="/" className="text-[12px] font-medium text-green-400 hover:text-green-300 transition-colors">
                            Return to library
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-subtle)] overflow-hidden w-full relative">
                    <div className="overflow-x-auto min-w-0 custom-scrollbar">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--border-subtle)]">
                                    <th className="text-left px-5 md:px-6 py-3 text-[11px] font-medium text-[var(--text-secondary)] whitespace-nowrap">
                                        Retired problem
                                    </th>
                                    <th className="text-left px-5 md:px-6 py-3 text-[11px] font-medium text-[var(--text-secondary)] whitespace-nowrap">
                                        Final mastery
                                    </th>
                                    <th className="text-left px-5 md:px-6 py-3 text-[11px] font-medium text-[var(--text-secondary)] whitespace-nowrap">
                                        Last revisited
                                    </th>
                                    <th className="text-right px-5 md:px-6 py-3 text-[11px] font-medium text-[var(--text-secondary)] whitespace-nowrap">
                                        View
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                {archivedProblems.map((problem) => (
                                    <tr key={problem.id} className="group hover:bg-[var(--bg-surface)] transition-colors">
                                        <td className="px-5 md:px-6 py-3.5">
                                            <Link to={`/problem/${problem.id}`} className="text-[13px] font-medium text-[var(--text-primary)] group-hover:text-green-400 transition-colors block truncate">
                                                {problem.title}
                                            </Link>
                                            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{problem.source || 'LeetCode'}</p>
                                        </td>
                                        <td className="px-5 md:px-6 py-3.5">
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-[11px] font-medium text-green-400 whitespace-nowrap">
                                                {problem.times_revisited} focus points
                                            </span>
                                        </td>
                                        <td className="px-5 md:px-6 py-3.5 text-[13px] text-[var(--text-secondary)] whitespace-nowrap">
                                            {getTimeAgo(problem.last_revisited_at)}
                                        </td>
                                        <td className="px-5 md:px-6 py-3.5 text-right">
                                            <Link
                                                to={`/problem/${problem.id}`}
                                                className="text-[12px] font-medium text-[var(--text-secondary)] hover:text-green-400 transition-colors"
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
