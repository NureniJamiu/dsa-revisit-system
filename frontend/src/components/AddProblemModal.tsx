import React from 'react';
import { X, Plus } from 'lucide-react';
import { useAddProblemMutation, useUpdateProblemMutation } from '../hooks/useProblems';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface AddProblemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    problem?: { id: string; title: string; link: string; difficulty?: string; source?: string } | null;
}

const AddProblemModal: React.FC<AddProblemModalProps> = ({ isOpen, onClose, onSuccess, problem }) => {
    const [title, setTitle] = React.useState('');
    const [link, setLink] = React.useState('');
    const [difficulty, setDifficulty] = React.useState('Medium');
    const [source, setSource] = React.useState('LeetCode');

    const addMutation = useAddProblemMutation();
    const updateMutation = useUpdateProblemMutation();
    const isMobile = useMediaQuery('(max-width: 768px)');

    const isSubmitting = addMutation.isPending || updateMutation.isPending;

    React.useEffect(() => {
        if (problem) {
            setTitle(problem.title);
            setLink(problem.link);
            setDifficulty(problem.difficulty || 'Medium');
            setSource(problem.source || 'LeetCode');
        } else {
            setTitle('');
            setLink('');
            setDifficulty('Medium');
            setSource('LeetCode');
        }
    }, [problem, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const data = {
            title,
            link,
            difficulty,
            source,
        };

        if (problem) {
            updateMutation.mutate({ id: problem.id, data }, {
                onSuccess: () => {
                    onSuccess?.();
                    onClose();
                },
                onError: () => {
                    alert('Failed to update problem');
                }
            });
        } else {
            addMutation.mutate(data, {
                onSuccess: () => {
                    setTitle('');
                    setLink('');
                    setDifficulty('Medium');
                    setSource('LeetCode');
                    onSuccess?.();
                    onClose();
                },
                onError: () => {
                    alert('Failed to add problem');
                }
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 z-[60] flex ${isMobile ? 'items-end' : 'items-center justify-center'} bg-black/40 backdrop-blur-sm animate-fadeIn`}
            onClick={onClose}
        >
            {/* Sheet / Modal Container */}
            <div
                className={`bg-white shadow-2xl w-full transform transition-all overflow-hidden ${isMobile
                    ? 'rounded-t-[32px] animate-sheetSlideUp'
                    : 'rounded-[32px] max-w-[440px] m-6 animate-scaleIn'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Mobile Drag Handle */}
                {isMobile && (
                    <div className="pt-4 pb-2">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto" />
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between px-8 pt-6 pb-4">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                        {problem ? 'Refine Problem' : 'Expand Library'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className={`px-8 space-y-8 ${isMobile ? 'pb-12' : 'pb-10'}`}>
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="title" className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
                                Problem Title
                            </label>
                            <input
                                type="text"
                                id="title"
                                required
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[15px] font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white focus:border-transparent transition-all placeholder:text-gray-300"
                                placeholder="e.g. Invert Binary Tree"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div>
                            <label htmlFor="link" className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
                                Source URI
                            </label>
                            <input
                                type="url"
                                id="link"
                                required
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[15px] font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white focus:border-transparent transition-all placeholder:text-gray-300"
                                placeholder="https://leetcode.com/problems/..."
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="difficulty" className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
                                    Difficulty
                                </label>
                                <select
                                    id="difficulty"
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[15px] font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white focus:border-transparent transition-all"
                                    value={difficulty}
                                    onChange={(e) => setDifficulty(e.target.value)}
                                >
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Hard">Hard</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="source" className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
                                    Source
                                </label>
                                <input
                                    type="text"
                                    id="source"
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[15px] font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white focus:border-transparent transition-all placeholder:text-gray-300"
                                    placeholder="e.g. LeetCode"
                                    value={source}
                                    onChange={(e) => setSource(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex justify-center items-center gap-2 bg-gray-900 text-white py-4.5 rounded-2xl hover:bg-gray-800 text-sm font-black transition-all shadow-xl shadow-gray-200 uppercase tracking-widest disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">Saving...</span>
                            ) : (
                                <>
                                    {problem ? <Plus className="w-5 h-5 text-green-400 rotate-45" /> : <Plus className="w-5 h-5 text-green-400" />}
                                    {problem ? 'Save Changes' : 'Save & remind me later'}
                                </>
                            )}
                        </button>
                        {!isMobile && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProblemModal;