import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

const AddProblem: React.FC = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [link, setLink] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch('http://localhost:8080/api/problems', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    link,
                    // user_id would be handled by auth context in real app
                    user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
                }),
            });

            if (res.ok) {
                navigate('/');
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

    return (
        <div className="max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Add New Problem</h2>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                        Problem Title
                    </label>
                    <input
                        type="text"
                        id="title"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        placeholder="e.g. Two Sum"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="link" className="block text-sm font-medium text-gray-700 mb-1">
                        Problem Link
                    </label>
                    <input
                        type="url"
                        id="link"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        placeholder="https://leetcode.com/ problems/two-sum"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50"
                >
                    <Plus className="w-5 h-5" />
                    {isSubmitting ? 'Saving...' : 'Save Problem'}
                </button>
            </form>
        </div>
    );
};

export default AddProblem;
