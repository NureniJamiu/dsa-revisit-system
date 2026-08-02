import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { apiFetch } from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CustomLoader from '../components/CustomLoader';
import { toast } from 'react-toastify';
import { useTheme } from '../providers/ThemeContext';

export type UserSettings = {
    problems_per_day: number;
    min_revisit_days: number;
    max_revisit_days: number;
    skip_weekends: boolean;
    email_time: string; // 24h "HH:MM", matches backend cron parsing
    ai_encouragement: boolean;
}

// Display list for the reminder-time select: 24h "value" is what gets sent to
// the backend (cron.go parses email_time with time.Parse("15:04", ...), which
// is strictly 24h — it does not accept "AM"/"PM" suffixes), "label" is what
// the user sees.
const EMAIL_TIME_OPTIONS = [
    { value: '06:00', label: '06:00 AM' },
    { value: '07:00', label: '07:00 AM' },
    { value: '08:00', label: '08:00 AM' },
    { value: '09:00', label: '09:00 AM' },
    { value: '10:00', label: '10:00 AM' },
    { value: '11:00', label: '11:00 AM' },
    { value: '12:00', label: '12:00 PM' },
    { value: '13:00', label: '01:00 PM' },
    { value: '14:00', label: '02:00 PM' },
    { value: '15:00', label: '03:00 PM' },
    { value: '16:00', label: '04:00 PM' },
    { value: '17:00', label: '05:00 PM' },
];

// Some users may have a legacy "HH:MM AM/PM" value saved from before this form
// sent the correct 24h format (see EMAIL_TIME_OPTIONS comment above). Normalize
// on load so the select has a valid match instead of silently showing nothing.
function normalizeEmailTime(value: string): string {
    const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return value;
    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const period = match[3].toUpperCase();
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${minute}`;
}

const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
    <button
        onClick={onChange}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${checked ? 'bg-green-500' : 'bg-[var(--border-strong)]'
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
    const { theme, toggleTheme } = useTheme();

    // Queries
    const { data: settings, isLoading } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const res = await apiFetch('/settings', {}, getToken);
            if (!res.ok) {
                // Return defaults if not found or error
                return {
                    problems_per_day: 3,
                    min_revisit_days: 2,
                    max_revisit_days: 10,
                    skip_weekends: true,
                    email_time: '09:00',
                    ai_encouragement: false
                } as UserSettings;
            }
            return (await res.json()) as UserSettings;
        }
    });

    // Mutations
    const updateSettingsMutation = useMutation({
        mutationFn: async (newSettings: UserSettings) => {
            const res = await apiFetch('/settings', {
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
    const [minRevisitDays, setMinRevisitDays] = useState(2);
    const [maxRevisitDays, setMaxRevisitDays] = useState(10);
    const [skipWeekends, setSkipWeekends] = useState(true);
    const [emailTime, setEmailTime] = useState('09:00');
    const [aiEncouragement, setAiEncouragement] = useState(false);

    // Sync state with loaded data
    React.useEffect(() => {
        if (settings) {
            setDailyProblems(settings.problems_per_day);
            setMinRevisitDays(settings.min_revisit_days);
            setMaxRevisitDays(settings.max_revisit_days);
            setSkipWeekends(settings.skip_weekends);
            setEmailTime(normalizeEmailTime(settings.email_time));
            setAiEncouragement(settings.ai_encouragement);
        }
    }, [settings]);

    const handleSave = () => {
        if (maxRevisitDays <= minRevisitDays) {
            toast.error('Max revisit days must be greater than min revisit days.');
            return;
        }
        updateSettingsMutation.mutate({
            problems_per_day: dailyProblems,
            min_revisit_days: minRevisitDays,
            max_revisit_days: maxRevisitDays,
            skip_weekends: skipWeekends,
            email_time: emailTime,
            ai_encouragement: aiEncouragement
        });
    };

    const handleReset = () => {
        setDailyProblems(3);
        setMinRevisitDays(2);
        setMaxRevisitDays(10);
        setSkipWeekends(true);
        setEmailTime('09:00');
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
                <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight mb-1.5">Preferences</h1>
                <p className="text-[13px] text-[var(--text-secondary)]">Fine-tune your learning pace and notification preferences.</p>
            </div>

            {/* Settings Card */}
            <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-subtle)] p-8 space-y-8">

                {/* Daily Problems Slider */}
                <div>
                    <div className="flex items-start justify-between mb-5">
                        <div>
                            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Daily target</h3>
                            <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Number of problems to solve each day.</p>
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
                            className="w-full h-1 bg-[var(--bg-elevated)] rounded-full appearance-none cursor-pointer accent-green-500"
                        />
                        <div className="flex justify-between px-0.5 text-[11px] font-medium text-[var(--text-tertiary)] mt-2.5">
                            <span>1</span>
                            <span>2</span>
                            <span>3</span>
                            <span>4</span>
                            <span>5</span>
                        </div>
                    </div>
                </div>

                {/* Min Revisit Days Slider */}
                <div className="border-t border-[var(--border-subtle)] pt-8">
                    <div className="flex items-start justify-between mb-5">
                        <div>
                            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Minimum days before revisit</h3>
                            <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">A problem won't be suggested again until at least this many days have passed.</p>
                        </div>
                        <div className="flex-shrink-0 w-9 h-9 bg-green-500/10 rounded-md flex items-center justify-center border border-green-500/20">
                            <span className="text-[15px] font-semibold text-green-400">{minRevisitDays}</span>
                        </div>
                    </div>
                    <div className="px-1">
                        <input
                            type="range"
                            min="1"
                            max="14"
                            value={minRevisitDays}
                            onChange={(e) => setMinRevisitDays(Number(e.target.value))}
                            className="w-full h-1 bg-[var(--bg-elevated)] rounded-full appearance-none cursor-pointer accent-green-500"
                        />
                    </div>
                </div>

                {/* Max Revisit Days Slider */}
                <div className="border-t border-[var(--border-subtle)] pt-8">
                    <div className="flex items-start justify-between mb-5">
                        <div>
                            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Maximum days before revisit</h3>
                            <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">A problem is guaranteed to resurface once it's gone this many days without a revisit, regardless of its normal priority.</p>
                        </div>
                        <div className="flex-shrink-0 w-9 h-9 bg-green-500/10 rounded-md flex items-center justify-center border border-green-500/20">
                            <span className="text-[15px] font-semibold text-green-400">{maxRevisitDays}</span>
                        </div>
                    </div>
                    <div className="px-1">
                        <input
                            type="range"
                            min="2"
                            max="60"
                            value={maxRevisitDays}
                            onChange={(e) => setMaxRevisitDays(Number(e.target.value))}
                            className="w-full h-1 bg-[var(--bg-elevated)] rounded-full appearance-none cursor-pointer accent-green-500"
                        />
                    </div>
                </div>

                {/* Skip Weekends Toggle */}
                <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-8">
                    <div>
                        <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Skip weekends</h3>
                        <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Pause your streak and daily notifications over the weekend.</p>
                    </div>
                    <Toggle checked={skipWeekends} onChange={() => setSkipWeekends(!skipWeekends)} />
                </div>

                {/* Email Notification */}
                <div className="border-t border-[var(--border-subtle)] pt-8">
                    <div className="mb-5">
                        <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Reminder time</h3>
                        <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Choose when to receive your daily problem set reminders.</p>
                    </div>
                    <div className="relative">
                        <select
                            value={emailTime}
                            onChange={(e) => setEmailTime(e.target.value)}
                            className="w-full px-4 py-3 bg-[var(--bg-surface-raised)] border border-[var(--border-default)] rounded-md text-[14px] font-medium text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-green-500/40 focus:border-green-500/40 transition-all appearance-none"
                        >
                            {EMAIL_TIME_OPTIONS.map(({ value, label }) => (
                                <option key={value} value={value} className="bg-[var(--bg-surface-raised)]">{label}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-secondary)]">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>
                </div>

                {/* AI Encouragement Toggle */}
                <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-8">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">AI pulse</h3>
                            <span className="px-1.5 py-0.5 bg-green-500/10 text-green-400 text-[10px] font-medium rounded border border-green-500/20">
                                Beta
                            </span>
                        </div>
                        <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Personalized, gentle nudges generated by AI based on your progress.</p>
                    </div>
                    <Toggle checked={aiEncouragement} onChange={() => setAiEncouragement(!aiEncouragement)} />
                </div>

                {/* Appearance */}
                <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-8">
                    <div>
                        <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Light mode</h3>
                        <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Switch between the dark (default) and light appearance. This is stored on this device only.</p>
                    </div>
                    <Toggle checked={theme === 'light'} onChange={toggleTheme} />
                </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 space-y-3">
                <button
                    onClick={handleSave}
                    className="w-full px-6 py-3 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-[13px] font-medium rounded-md hover:bg-[var(--btn-primary-hover-bg)] transition-colors"
                >
                    Save changes
                </button>
                <div className="text-center">
                    <button
                        onClick={handleReset}
                        className="text-[12px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        Reset to defaults
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
