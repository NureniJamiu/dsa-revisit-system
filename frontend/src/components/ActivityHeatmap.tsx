import React, { useMemo } from 'react';
import { Flame } from 'lucide-react';
import { useHistory } from '../hooks/useProblems';

const WEEKS_TO_SHOW = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function dateKey(d: Date): string {
    return d.toISOString().slice(0, 10);
}

interface DayCell {
    key: string;
    date: Date;
    count: number;
}

function buildGrid(countByDay: Map<string, number>): (DayCell | null)[][] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalDays = WEEKS_TO_SHOW * 7;
    const cells: DayCell[] = [];
    for (let i = totalDays - 1; i >= 0; i--) {
        const d = new Date(today.getTime() - i * DAY_MS);
        const key = dateKey(d);
        cells.push({ key, date: d, count: countByDay.get(key) ?? 0 });
    }

    // Pad the front so the grid's first column starts on a Sunday, like GitHub's graph
    const leadingBlanks = cells[0].date.getDay();
    const padded: (DayCell | null)[] = [...Array(leadingBlanks).fill(null), ...cells];

    const weeks: (DayCell | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
        weeks.push(padded.slice(i, i + 7));
    }
    return weeks;
}

function computeStreaks(sortedDayKeys: string[], hasToday: boolean, hasYesterday: boolean) {
    const daySet = new Set(sortedDayKeys);

    // Count backwards from today; if today has no activity yet, don't zero out
    // a streak that's still "in progress" — fall back to yesterday.
    let current = 0;
    if (daySet.size > 0) {
        const cursor = new Date();
        cursor.setHours(0, 0, 0, 0);
        if (!hasToday) {
            if (!hasYesterday) {
                current = 0;
            }
            cursor.setTime(cursor.getTime() - DAY_MS);
        }
        while (daySet.has(dateKey(cursor))) {
            current++;
            cursor.setTime(cursor.getTime() - DAY_MS);
        }
    }

    let longest = 0;
    let run = 0;
    let prevTime: number | null = null;
    for (const key of sortedDayKeys) {
        const t = new Date(key + 'T00:00:00Z').getTime();
        run = prevTime !== null && t - prevTime === DAY_MS ? run + 1 : 1;
        longest = Math.max(longest, run);
        prevTime = t;
    }

    return { current, longest: Math.max(longest, current) };
}

function levelPct(count: number, max: number): number {
    if (count === 0) return 0;
    if (max <= 1) return 100;
    const ratio = count / max;
    if (ratio > 0.75) return 100;
    if (ratio > 0.5) return 75;
    if (ratio > 0.25) return 50;
    return 25;
}

/**
 * GitHub-style activity graph + streak counter, built entirely client-side
 * from useHistory()'s revisit log — no new backend endpoint. Fine at the
 * data volumes a personal DSA tracker accumulates; would want a backend
 * GROUP BY date aggregate if history ever grows large enough for this to
 * matter for payload size.
 */
const ActivityHeatmap: React.FC = () => {
    const { data: history = [], isLoading, isError } = useHistory();

    const { weeks, current, longest, maxCount, totalRevisits } = useMemo(() => {
        const countByDay = new Map<string, number>();
        for (const entry of history) {
            const key = entry.revisited_at.slice(0, 10);
            countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
        }

        const sortedDayKeys = Array.from(countByDay.keys()).sort();
        const now = new Date();
        const todayKey = dateKey(now);
        const yesterdayKey = dateKey(new Date(now.getTime() - DAY_MS));
        const { current, longest } = computeStreaks(
            sortedDayKeys,
            countByDay.has(todayKey),
            countByDay.has(yesterdayKey)
        );

        return {
            weeks: buildGrid(countByDay),
            current,
            longest,
            maxCount: Math.max(1, ...Array.from(countByDay.values())),
            totalRevisits: history.length,
        };
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

            <div className="flex gap-[3px] overflow-x-auto custom-scrollbar pb-1">
                {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-[3px]">
                        {week.map((cell, di) => {
                            if (!cell) {
                                return <div key={di} className="w-3 h-3" />;
                            }
                            const pct = levelPct(cell.count, maxCount);
                            return (
                                <div
                                    key={cell.key}
                                    title={`${cell.count} revisit${cell.count === 1 ? '' : 's'} on ${cell.date.toLocaleDateString()}`}
                                    className="w-3 h-3 rounded-[3px]"
                                    style={{
                                        backgroundColor: pct === 0
                                            ? 'var(--bg-elevated)'
                                            : `color-mix(in srgb, var(--accent) ${pct}%, var(--bg-elevated))`,
                                    }}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-end gap-1 mt-2">
                <span className="text-[10px] text-[var(--text-tertiary)] mr-1">Less</span>
                {[0, 25, 50, 75, 100].map((pct) => (
                    <div
                        key={pct}
                        className="w-2.5 h-2.5 rounded-[2px]"
                        style={{
                            backgroundColor: pct === 0
                                ? 'var(--bg-elevated)'
                                : `color-mix(in srgb, var(--accent) ${pct}%, var(--bg-elevated))`,
                        }}
                    />
                ))}
                <span className="text-[10px] text-[var(--text-tertiary)] ml-1">More</span>
            </div>
        </div>
    );
};

export default ActivityHeatmap;
