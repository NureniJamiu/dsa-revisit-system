import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { apiFetch } from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CustomLoader from '../components/CustomLoader';
import { toast } from 'react-toastify';

export type UserSettings = {
    daily_problems: number;
    skip_weekends: boolean;
    email_time: string;
    ai_encouragement: boolean;
}

const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
    <button
        onClick={onChange}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${checked ? 'bg-green-500' : 'bg-white/[0.1]'
            }`}
    >
        <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${checked ? 'translate-x-[19px]' : 'translate-x-[3px]'
                }`}
        />
    </button>
);

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
            toast.success('Settings saved successfully!');
        },
        onError: (error: Error) => {
            toast.error(`Failed to save settings: ${error.message}`);
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
            <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-32">
                <CustomLoader text="Loading your preferences..." />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto pb-20">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight mb-1.5">Preferences</h1>
                <p className="text-[13px] text-zinc-500">Fine-tune your learning pace and notification preferences.</p>
            </div>

            {/* Settings Card */}
            <div className="bg-white/[0.02] rounded-lg border border-white/[0.06] p-8 space-y-8">

                {/* Daily Problems Slider */}
                <div>
                    <div className="flex items-start justify-between mb-5">
                        <div>
                            <h3 className="text-[14px] font-semibold text-zinc-100">Daily target</h3>
                            <p className="text-[13px] text-zinc-500 mt-0.5">Number of problems to solve each day.</p>
                        </div>
                        <div className="flex-shrink-0 w-9 h-9 bg-green-500/10 rounded-md flex items-center justify-center border border-green-500/20">
                            <span className="text-[15px] font-semibold text-green-400">{dailyProblems}</span>
                        </div>
                    </div>
                    <div className="px-1">
                        <input
                            type="range"
                            min="1"
                            max="5"
                            value={dailyProblems}
                            onChange={(e) => setDailyProblems(Number(e.target.value))}
                            className="w-full h-1 bg-white/[0.08] rounded-full appearance-none cursor-pointer accent-green-500"
                        />
                        <div className="flex justify-between px-0.5 text-[11px] font-medium text-zinc-600 mt-2.5">
                            <span>1</span>
                            <span>2</span>
                            <span>3</span>
                            <span>4</span>
                            <span>5</span>
                        </div>
                    </div>
                </div>

                {/* Skip Weekends Toggle */}
                <div className="flex items-center justify-between border-t border-white/[0.06] pt-8">
                    <div>
                        <h3 className="text-[14px] font-semibold text-zinc-100">Skip weekends</h3>
                        <p className="text-[13px] text-zinc-500 mt-0.5">Pause your streak and daily notifications over the weekend.</p>
                    </div>
                    <Toggle checked={skipWeekends} onChange={() => setSkipWeekends(!skipWeekends)} />
                </div>

                {/* Email Notification */}
                <div className="border-t border-white/[0.06] pt-8">
                    <div className="mb-5">
                        <h3 className="text-[14px] font-semibold text-zinc-100">Reminder time</h3>
                        <p className="text-[13px] text-zinc-500 mt-0.5">Choose when to receive your daily problem set reminders.</p>
                    </div>
                    <div className="relative">
                        <select
                            value={emailTime}
                            onChange={(e) => setEmailTime(e.target.value)}
                            className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-md text-[14px] font-medium text-zinc-100 focus:outline-none focus:ring-1 focus:ring-green-500/40 focus:border-green-500/40 transition-all appearance-none"
                        >
                            {['06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'].map(time => (
                                <option key={time} className="bg-zinc-900">{time}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>
                </div>

                {/* AI Encouragement Toggle */}
                <div className="flex items-center justify-between border-t border-white/[0.06] pt-8">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="text-[14px] font-semibold text-zinc-100">AI pulse</h3>
                            <span className="px-1.5 py-0.5 bg-green-500/10 text-green-400 text-[10px] font-medium rounded border border-green-500/20">
                                Beta
                            </span>
                        </div>
                        <p className="text-[13px] text-zinc-500 mt-0.5">Personalized, gentle nudges generated by AI based on your progress.</p>
                    </div>
                    <Toggle checked={aiEncouragement} onChange={() => setAiEncouragement(!aiEncouragement)} />
                </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 space-y-3">
                <button
                    onClick={handleSave}
                    className="w-full px-6 py-3 bg-zinc-100 text-zinc-900 text-[13px] font-medium rounded-md hover:bg-white transition-colors"
                >
                    Save changes
                </button>
                <div className="text-center">
                    <button
                        onClick={handleReset}
                        className="text-[12px] font-medium text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                        Reset to defaults
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
