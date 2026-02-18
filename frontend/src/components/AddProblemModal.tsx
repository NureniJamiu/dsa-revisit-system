import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { apiFetch } from '../lib/api';

interface AddProblemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const AddProblemModal: React.FC<AddProblemModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { getToken } = useAuth();
    const [title, setTitle] = useState('');
    const [link, setLink] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await apiFetch('/problems', {
                method: 'POST',
                body: JSON.stringify({
                    title,
                    link,
                }),
            }, getToken);

            if (res.ok) {
                setTitle('');
                setLink('');
                onSuccess();
                onClose();
            } else {
                alert('Failed to add problem');
            }
        } catch (error) {
            console.error('Error adding problem:', error);
            alert('Error adding problem');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-fadeIn">
            {/* Modal */}
            <div
                className="bg-white rounded-[32px] shadow-2xl w-full max-w-[440px] transform transition-all animate-scaleIn overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-8 pt-8 pb-4">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Expand Library</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-8 pb-10 space-y-8">
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
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex justify-center items-center gap-2 bg-gray-900 text-white py-4.5 rounded-2xl hover:bg-gray-800 text-sm font-black transition-all shadow-xl shadow-gray-200 uppercase tracking-widest disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">Indexing...</span>
                            ) : (
                                <>
                                    <Plus className="w-5 h-5 text-green-400" />
                                    Commit to Library
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProblemModal;