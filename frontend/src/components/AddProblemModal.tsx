import React from 'react';
import { X, Plus } from 'lucide-react';
import { useAddProblemMutation, useUpdateProblemMutation } from '../hooks/useProblems';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { topicBadgeStyle } from '../lib/topicColors';

interface AddProblemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    problem?: { id: string; title: string; link: string; difficulty?: string; source?: string; notes?: string; topics?: string[] } | null;
}

const AddProblemModal: React.FC<AddProblemModalProps> = ({ isOpen, onClose, onSuccess, problem }) => {
    const [title, setTitle] = React.useState('');
    const [link, setLink] = React.useState('');
    const [difficulty, setDifficulty] = React.useState('Medium');
    const [source, setSource] = React.useState('LeetCode');
    const [notes, setNotes] = React.useState('');
    const [topics, setTopics] = React.useState<string[]>([]);
    const [topicInput, setTopicInput] = React.useState('');

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
            setNotes(problem.notes || '');
            setTopics(problem.topics || []);
        } else {
            setTitle('');
            setLink('');
            setDifficulty('Medium');
            setSource('LeetCode');
            setNotes('');
            setTopics([]);
        }
        setTopicInput('');
    }, [problem, isOpen]);

    const addTopic = (raw: string) => {
        const topic = raw.trim();
        if (!topic || topics.some(t => t.toLowerCase() === topic.toLowerCase())) return;
        setTopics(prev => [...prev, topic]);
        setTopicInput('');
    };

    const removeTopic = (topic: string) => {
        setTopics(prev => prev.filter(t => t !== topic));
    };

    const handleTopicInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTopic(topicInput);
        } else if (e.key === 'Backspace' && topicInput === '' && topics.length > 0) {
            removeTopic(topics[topics.length - 1]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const data = {
            title,
            link,
            difficulty,
            source,
            notes,
            topics,
        };

        if (problem) {
            updateMutation.mutate({ id: problem.id, data }, {
                onSuccess: () => {
                    onSuccess?.();
                    onClose();
                },
                onError: () => {
                    // Handled by mutation hook
                }
            });
        } else {
            addMutation.mutate(data, {
                onSuccess: () => {
                    setTitle('');
                    setLink('');
                    setDifficulty('Medium');
                    setSource('LeetCode');
                    setNotes('');
                    setTopics([]);
                    onSuccess?.();
                    onClose();
                },
                onError: () => {
                    // Handled by mutation hook
                }
            });
        }
    };

    if (!isOpen) return null;

    const inputClass = "w-full px-4 py-3 bg-[var(--bg-surface-raised)] border border-[var(--border-default)] rounded-md text-[14px] font-medium text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-green-500/40 focus:bg-[var(--bg-surface-hover)] focus:border-green-500/40 transition-all placeholder:text-[var(--text-tertiary)]";
    const labelClass = "block text-[11px] font-medium text-[var(--text-secondary)] mb-2";

    return (
        <div
            className={`fixed inset-0 z-[60] flex ${isMobile ? 'items-end' : 'items-center justify-center'} bg-[var(--overlay)] backdrop-blur-sm animate-fadeIn`}
            onClick={onClose}
        >
            {/* Sheet / Modal Container */}
            <div
                className={`bg-[var(--bg-surface-raised)] border border-[var(--border-default)] shadow-2xl w-full transform transition-all overflow-hidden ${isMobile
                    ? 'rounded-t-2xl animate-sheetSlideUp'
                    : 'rounded-xl max-w-[440px] m-6 animate-scaleIn'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Mobile Drag Handle */}
                {isMobile && (
                    <div className="pt-4 pb-2">
                        <div className="w-10 h-1 bg-[var(--bg-elevated)] rounded-full mx-auto" />
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4">
                    <h2 className="text-[17px] font-semibold text-[var(--text-primary)] tracking-tight">
                        {problem ? 'Edit problem' : 'Add problem'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-md transition-colors"
                    >
                        <X className="w-4.5 h-4.5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className={`px-6 space-y-6 ${isMobile ? 'pb-10' : 'pb-8'}`}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="title" className={labelClass}>
                                Problem title
                            </label>
                            <input
                                type="text"
                                id="title"
                                required
                                className={inputClass}
                                placeholder="e.g. Invert Binary Tree"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div>
                            <label htmlFor="link" className={labelClass}>
                                Source URL
                            </label>
                            <input
                                type="url"
                                id="link"
                                required
                                className={inputClass}
                                placeholder="https://leetcode.com/problems/..."
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="difficulty" className={labelClass}>
                                    Difficulty
                                </label>
                                <select
                                    id="difficulty"
                                    className={`${inputClass} appearance-none`}
                                    value={difficulty}
                                    onChange={(e) => setDifficulty(e.target.value)}
                                >
                                    <option value="Easy" className="bg-[var(--bg-surface-raised)]">Easy</option>
                                    <option value="Medium" className="bg-[var(--bg-surface-raised)]">Medium</option>
                                    <option value="Hard" className="bg-[var(--bg-surface-raised)]">Hard</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="source" className={labelClass}>
                                    Source
                                </label>
                                <input
                                    type="text"
                                    id="source"
                                    className={inputClass}
                                    placeholder="e.g. LeetCode"
                                    value={source}
                                    onChange={(e) => setSource(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="topic-input" className={labelClass}>
                                Topics (optional)
                            </label>
                            <div className={`${inputClass} flex flex-wrap items-center gap-1.5 py-2`}>
                                {topics.map((topic) => (
                                    <span
                                        key={topic}
                                        className="topic-badge inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium"
                                        style={topicBadgeStyle(topic)}
                                    >
                                        {topic}
                                        <button
                                            type="button"
                                            onClick={() => removeTopic(topic)}
                                            className="hover:opacity-70"
                                            aria-label={`Remove ${topic}`}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    id="topic-input"
                                    value={topicInput}
                                    onChange={(e) => setTopicInput(e.target.value)}
                                    onKeyDown={handleTopicInputKeyDown}
                                    onBlur={() => addTopic(topicInput)}
                                    placeholder={topics.length ? '' : 'e.g. Dynamic Programming, Arrays'}
                                    className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-[14px] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] placeholder:font-normal"
                                />
                            </div>
                            <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5">Press Enter or comma to add. A problem can have more than one topic.</p>
                        </div>

                        <div>
                            <label htmlFor="notes" className={labelClass}>
                                Notes (optional)
                            </label>
                            <textarea
                                id="notes"
                                className={`${inputClass} resize-none`}
                                placeholder="Any context or thoughts on this problem..."
                                rows={3}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 pt-1">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex justify-center items-center gap-2 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] py-3 rounded-md hover:bg-[var(--btn-primary-hover-bg)] text-[13px] font-medium transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <span>Saving...</span>
                            ) : (
                                <>
                                    {problem ? <Plus className="w-4 h-4 rotate-45" /> : <Plus className="w-4 h-4" />}
                                    {problem ? 'Save changes' : 'Save & remind me later'}
                                </>
                            )}
                        </button>
                        {!isMobile && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full py-2.5 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
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
