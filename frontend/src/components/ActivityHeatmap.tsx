import React, { useMemo } from 'react';
import { ActivityCalendar, type Activity } from 'react-activity-calendar';
import 'react-activity-calendar/tooltips.css';
import { Flame } from 'lucide-react';
import { useHistory } from '../hooks/useProblems';
import { useTheme } from '../providers/ThemeContext';

const WEEKS_TO_SHOW = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Local-calendar-day key (yyyy-MM-dd), deliberately NOT using
 * Date#toISOString() — that reports the UTC day, which is off by one for
 * any timezone east of UTC (i.e. most of the world) whenever local
 * midnight has already passed but UTC hasn't rolled over yet. A revisit
 * logged "today" in the user's own timezone needs to land in today's cell.
 */
function dateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function startOfLocalDay(d: Date): Date {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

function computeStreaks(sortedDayKeys: string[], hasToday: boolean, hasYesterday: boolean) {
    const daySet = new Set(sortedDayKeys);

    // Count backwards from today; if today has no activity yet, don't zero out
    // a streak that's still "in progress" — fall back to yesterday.
    let current = 0;
    if (daySet.size > 0 && (hasToday || hasYesterday)) {
        const cursor = startOfLocalDay(new Date());
        if (!hasToday) cursor.setTime(cursor.getTime() - DAY_MS);
        while (daySet.has(dateKey(cursor))) {
            current++;
            cursor.setTime(cursor.getTime() - DAY_MS);
        }
    }

    let longest = 0;
    let run = 0;
    let prevTime: number | null = null;
    for (const key of sortedDayKeys) {
        const t = new Date(`${key}T00:00:00`).getTime();
        run = prevTime !== null && t - prevTime === DAY_MS ? run + 1 : 1;
        longest = Math.max(longest, run);
        prevTime = t;
    }

    return { current, longest: Math.max(longest, current) };
}

function countToLevel(count: number, max: number): number {
    if (count === 0) return 0;
    if (max <= 1) return 4;
    const ratio = count / max;
    if (ratio > 0.75) return 4;
    if (ratio > 0.5) return 3;
    if (ratio > 0.25) return 2;
    return 1;
}

// Both schemes point at the same CSS custom properties on purpose — the
// tokens themselves already flip between :root (dark) and .light in
// index.css, so one color-mix() scale covers both themes automatically.
const CALENDAR_THEME = {
    light: [
        'var(--bg-elevated)',
        'color-mix(in srgb, var(--accent) 25%, var(--bg-elevated))',
        'color-mix(in srgb, var(--accent) 50%, var(--bg-elevated))',
        'color-mix(in srgb, var(--accent) 75%, var(--bg-elevated))',
        'var(--accent)',
    ],
    dark: [
        'var(--bg-elevated)',
        'color-mix(in srgb, var(--accent) 25%, var(--bg-elevated))',
        'color-mix(in srgb, var(--accent) 50%, var(--bg-elevated))',
        'color-mix(in srgb, var(--accent) 75%, var(--bg-elevated))',
        'var(--accent)',
    ],
};

/**
 * Streak counter (custom) + calendar grid via react-activity-calendar —
 * a small, actively maintained library rather than a hand-rolled SVG grid.
 * Data is built client-side from useHistory()'s revisit log; fine at the
 * data volumes a personal DSA tracker accumulates, would want a backend
 * GROUP BY date aggregate if history ever grows large enough for payload
 * size to matter.
 */
const ActivityHeatmap: React.FC = () => {
    const { data: history = [], isLoading, isError } = useHistory();
    const { theme } = useTheme();

    const { activityData, current, longest, totalRevisits } = useMemo(() => {
        const countByDay = new Map<string, number>();
        for (const entry of history) {
            const key = dateKey(new Date(entry.revisited_at));
            countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
        }

        const sortedDayKeys = Array.from(countByDay.keys()).sort();
        const today = startOfLocalDay(new Date());
        const todayKey = dateKey(today);
        const yesterdayKey = dateKey(new Date(today.getTime() - DAY_MS));
        const { current, longest } = computeStreaks(
            sortedDayKeys,
            countByDay.has(todayKey),
            countByDay.has(yesterdayKey)
        );

        const maxCount = Math.max(1, ...Array.from(countByDay.values()));
        const activityByDate = new Map<string, Activity>();
        for (const [date, count] of countByDay.entries()) {
            activityByDate.set(date, { date, count, level: countToLevel(count, maxCount) });
        }

        // Pin the calendar's rendered range to a fixed window (rather than
        // whichever real revisit dates happen to exist) by guaranteeing
        // boundary entries — react-activity-calendar treats any date without
        // an explicit entry as empty, so sparse data in between is fine.
        const startDate = startOfLocalDay(new Date(today.getTime() - (WEEKS_TO_SHOW * 7 - 1) * DAY_MS));
        const startKey = dateKey(startDate);
        if (!activityByDate.has(startKey)) activityByDate.set(startKey, { date: startKey, count: 0, level: 0 });
        if (!activityByDate.has(todayKey)) activityByDate.set(todayKey, { date: todayKey, count: 0, level: 0 });

        const activityData = Array.from(activityByDate.values()).sort((a, b) => a.date.localeCompare(b.date));

        return { activityData, current, longest, totalRevisits: history.length };
    }, [history]);

    if (isLoading || isError || history.length === 0) {
        return null;
    }

    return (
        <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-subtle)] p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <Flame
                        className={`w-4 h-4 ${current > 0 ? 'text-[var(--status-medium-text)]' : 'text-[var(--text-tertiary)]'}`}
                        strokeWidth={2}
                        fill={current > 0 ? 'currentColor' : 'none'}
                    />
                    <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                        {current > 0 ? `${current} day${current === 1 ? '' : 's'} streak` : 'No active streak'}
                    </span>
                    {longest > current && (
                        <span className="text-[11px] text-[var(--text-tertiary)]">· best {longest}</span>
                    )}
                </div>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                    {totalRevisits} revisit{totalRevisits === 1 ? '' : 's'} logged
                </p>
            </div>

            <div className="overflow-x-auto custom-scrollbar pb-1">
                <ActivityCalendar
                    data={activityData}
                    colorScheme={theme}
                    theme={CALENDAR_THEME}
                    blockSize={11}
                    blockMargin={3}
                    blockRadius={3}
                    fontSize={11}
                    showTotalCount={false}
                    tooltips={{
                        activity: {
                            text: (activity) =>
                                `${activity.count} revisit${activity.count === 1 ? '' : 's'} on ${new Date(`${activity.date}T00:00:00`).toLocaleDateString()}`,
                        },
                    }}
                    style={{ color: 'var(--text-tertiary)' }}
                />
            </div>
        </div>
    );
};

export default ActivityHeatmap;
