import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { apiFetch } from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type UserSettings = {
    daily_problems: number;
    skip_weekends: boolean;
    email_time: string;
    ai_encouragement: boolean;
}

const Settings: React.FC = () => {
    const { getToken } = useAuth();
    const queryClient = useQueryClient();

    // Queries
    const { data: settings, isLoading } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const res = await apiFetch('/api/settings', {}, getToken);
            if (!res.ok) {
                // Return defaults if not found or error
                return {
                    daily_problems: 3,
                    skip_weekends: true,
                    email_time: '09:00 AM',
                    ai_encouragement: false
                } as UserSettings;
            }
            return (await res.json()) as UserSettings;
        }
    });

    // Mutations
    const updateSettingsMutation = useMutation({
        mutationFn: async (newSettings: UserSettings) => {
            const res = await apiFetch('/api/settings', {
                method: 'PUT',
                body: JSON.stringify(newSettings)
            }, getToken);
            if (!res.ok) throw new Error('Failed to update settings');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            alert('Settings saved successfully!');
        }
    });

    const [dailyProblems, setDailyProblems] = useState(3);
    const [skipWeekends, setSkipWeekends] = useState(true);
    const [emailTime, setEmailTime] = useState('09:00 AM');
    const [aiEncouragement, setAiEncouragement] = useState(false);

    // Sync state with loaded data
    React.useEffect(() => {
        if (settings) {
            setDailyProblems(settings.daily_problems);
            setSkipWeekends(settings.skip_weekends);
            setEmailTime(settings.email_time);
            setAiEncouragement(settings.ai_encouragement);
        }
    }, [settings]);

    const handleSave = () => {
        updateSettingsMutation.mutate({
            daily_problems: dailyProblems,
            skip_weekends: skipWeekends,
            email_time: emailTime,
            ai_encouragement: aiEncouragement
        });
    };

    const handleReset = () => {
        setDailyProblems(3);
        setSkipWeekends(true);
        setEmailTime('09:00 AM');
        setAiEncouragement(false);
    };

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto flex items-center justify-center py-20">
                <div className="animate-spin w-6 h-6 border-2 border-gray-200 border-t-green-500 rounded-full" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto pb-20">
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Your Rhythm</h1>
                <p className="text-[15px] font-medium text-gray-400">Fine-tune your learning pace and notification preferences.</p>
            </div>

            {/* Settings Card */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-10 space-y-10">

                {/* Daily Problems Slider */}
                <div>
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h3 className="text-[17px] font-black text-gray-900 tracking-tight">Daily Target</h3>
                            <p className="text-sm font-medium text-gray-400 mt-1">Number of problems to solve each day.</p>
                        </div>
                        <div className="flex-shrink-0 w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center border border-green-100">
                            <span className="text-xl font-black text-green-600">{dailyProblems}</span>
                        </div>
                    </div>
                    <div className="px-2">
                        <input
                            type="range"
                            min="1"
                            max="5"
                            value={dailyProblems}
                            onChange={(e) => setDailyProblems(Number(e.target.value))}
                            className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer accent-green-500"
                        />
                        <div className="flex justify-between px-1 text-[11px] font-black text-gray-300 uppercase tracking-widest mt-3">
                            <span>1</span>
                            <span>2</span>
                            <span>3</span>
                            <span>4</span>
                            <span>5</span>
                        </div>
                    </div>
                </div>

                {/* Skip Weekends Toggle */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-10">
                    <div>
                        <h3 className="text-[17px] font-black text-gray-900 tracking-tight">Skip Weekends</h3>
                        <p className="text-sm font-medium text-gray-400 mt-1">Pause your streak and daily notifications over the weekend.</p>
                    </div>
                    <button
                        onClick={() => setSkipWeekends(!skipWeekends)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${skipWeekends ? 'bg-green-500' : 'bg-gray-200'
                            }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${skipWeekends ? 'translate-x-[26px]' : 'translate-x-[4px]'
                                }`}
                        />
                    </button>
                </div>

                {/* Email Notification */}
                <div className="border-t border-gray-100 pt-10">
                    <div className="mb-6">
                        <h3 className="text-[17px] font-black text-gray-900 tracking-tight">Deployment Window</h3>
                        <p className="text-sm font-medium text-gray-400 mt-1">Choose when to receive your daily problem set reminders.</p>
                    </div>
                    <div className="relative">
                        <select
                            value={emailTime}
                            onChange={(e) => setEmailTime(e.target.value)}
                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-[15px] font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white focus:border-transparent transition-all appearance-none"
                        >
                            {['06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'].map(time => (
                                <option key={time}>{time}</option>
                            ))}
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>
                </div>

                {/* AI Encouragement Toggle */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-10">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-[17px] font-black text-gray-900 tracking-tight">AI Pulse</h3>
                            <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-black rounded uppercase tracking-widest border border-green-100">
                                Beta
                            </span>
                        </div>
                        <p className="text-sm font-medium text-gray-400 mt-1">Personalized, gentle nudges generated by AI based on your progress.</p>
                    </div>
                    <button
                        onClick={() => setAiEncouragement(!aiEncouragement)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${aiEncouragement ? 'bg-green-500' : 'bg-gray-200'
                            }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${aiEncouragement ? 'translate-x-[26px]' : 'translate-x-[4px]'
                                }`}
                        />
                    </button>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-10 space-y-4">
                <button
                    onClick={handleSave}
                    className="w-full px-6 py-4 bg-gray-800 text-white text-sm font-black rounded-xl hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 uppercase tracking-widest"
                >
                    Deploy Changes
                </button>
                <div className="text-center">
                    <button
                        onClick={handleReset}
                        className="text-[11px] font-black text-gray-300 uppercase tracking-widest hover:text-gray-900 transition-colors"
                    >
                        Reset to defaults
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
