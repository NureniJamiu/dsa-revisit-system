import React, { useState } from 'react';
import { Info } from 'lucide-react';
import type { WeightInfo } from '../hooks/useProblems';

interface WeightBreakdownProps {
    weight: WeightInfo;
    lastRevisitedAt: string | null;
    /** Structural classes for the trigger button; color follows the theme
     *  tokens by default so it works in both light and dark mode. */
    className?: string;
}

const priorityDotColor: Record<WeightInfo['priority'], string> = {
    high: 'bg-[var(--status-hard-text)]',
    medium: 'bg-[var(--status-medium-text)]',
    low: 'bg-[var(--status-easy-text)]',
};

const priorityBlurb: Record<WeightInfo['priority'], string> = {
    high: "It's been sitting long enough that the scheduler is actively pushing it back at you.",
    medium: 'Not urgent yet, but the clock is ticking on this one.',
    low: 'Freshly touched or still early — the scheduler is happy to let it rest.',
};

/**
 * Explains *why* a problem was surfaced, using the same age/urgency/decay
 * inputs scheduler.go's CalculateWeight combines into a single score. The
 * split between "aging" and "urgency" below is recomputed client-side from
 * the raw day counts the API already returns (sqrt(daysSinceAdded + 1) vs.
 * daysSinceLastRevisit, mirroring scheduler.go) purely for illustration —
 * the backend's actual weight (post revisit-decay/newness-cooldown) is what
 * drove the real selection, this is just a legible approximation of it.
 */
const WeightBreakdown: React.FC<WeightBreakdownProps> = ({ weight, lastRevisitedAt, className = '' }) => {
    const [open, setOpen] = useState(false);

    const daysSinceAdded = weight.days_since_added ?? 0;
    const ageContribution = Math.sqrt(daysSinceAdded + 1);
    const urgencyContribution = weight.days_since_last_revisit;
    const rawTotal = ageContribution + urgencyContribution || 1;
    const agePct = Math.round((ageContribution / rawTotal) * 100);
    const urgencyPct = 100 - agePct;
    const decayPct = Math.round(weight.revisit_decay * 100);

    return (
        <div className="relative inline-flex">
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen((v) => !v);
                }}
                aria-label="Why did this surface today?"
                title="Why did this surface today?"
                className={`inline-flex items-center justify-center rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors ${className}`}
            >
                <Info className="w-3 h-3" strokeWidth={2} />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-0 top-full mt-2 w-64 p-3.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface-raised)] shadow-2xl z-40 animate-scaleIn"
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <span className={`w-1.5 h-1.5 rounded-full ${priorityDotColor[weight.priority]}`} />
                            <p className="text-[12px] font-semibold text-[var(--text-primary)] capitalize">{weight.priority} priority</p>
                            <span className="ml-auto font-mono-tabular text-[11px] text-[var(--text-tertiary)]">
                                score {weight.weight.toFixed(1)}
                            </span>
                        </div>

                        {/* Aging vs. urgency meter */}
                        <div className="h-1.5 rounded-full overflow-hidden flex bg-[var(--bg-elevated)] mb-1.5">
                            <div className="h-full bg-[var(--accent)]" style={{ width: `${agePct}%` }} />
                            <div className="h-full bg-[var(--status-medium-text)]" style={{ width: `${urgencyPct}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[var(--text-tertiary)] mb-3">
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" /> aging {agePct}%
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-medium-text)]" /> urgency {urgencyPct}%
                            </span>
                        </div>

                        <dl className="space-y-1.5 text-[11px]">
                            <div className="flex items-center justify-between">
                                <dt className="text-[var(--text-secondary)]">Added</dt>
                                <dd className="text-[var(--text-primary)] font-medium">{Math.round(daysSinceAdded)}d ago</dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-[var(--text-secondary)]">Last touched</dt>
                                <dd className="text-[var(--text-primary)] font-medium">
                                    {lastRevisitedAt ? `${Math.round(weight.days_since_last_revisit)}d ago` : 'never'}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-[var(--text-secondary)]">Revisit strength</dt>
                                <dd className="text-[var(--text-primary)] font-medium">
                                    {decayPct}%{typeof weight.times_revisited === 'number' ? ` (×${weight.times_revisited})` : ''}
                                </dd>
                            </div>
                        </dl>

                        <p className="text-[11px] text-[var(--text-secondary)] mt-3 pt-3 border-t border-[var(--border-subtle)] leading-relaxed">
                            {priorityBlurb[weight.priority]}
                        </p>
                    </div>
                </>
            )}
        </div>
    );
};

export default WeightBreakdown;
