import type { CSSProperties } from 'react';

/**
 * Deterministic color assignment for problem topics (e.g. "graphs", "dp").
 *
 * Topics are free-text and user-authored, so we can't safelist a fixed set
 * of Tailwind classes for them (Tailwind's JIT scanner only picks up class
 * names that appear literally in source). Instead we hash the topic string
 * to a hue and hand it to the `.topic-badge` CSS rules (see index.css) via
 * the `--hue` custom property. Because those rules are themselves written
 * against the app's light/dark design tokens, every topic badge automatically
 * adapts to the active theme — no per-topic light/dark variants needed.
 */
export function topicHue(topic: string): number {
    let hash = 0;
    for (let i = 0; i < topic.length; i++) {
        hash = (hash << 5) - hash + topic.charCodeAt(i);
        hash |= 0; // keep it a 32-bit int
    }
    // Spread across most of the wheel, but nudge away from the narrow red
    // band (~350-10deg) already claimed by the "hard" difficulty/priority
    // badges so topic and difficulty pills never get confused for one another.
    const hue = Math.abs(hash) % 340;
    return hue < 10 ? hue + 20 : hue + 15;
}

export function topicBadgeStyle(topic: string): CSSProperties {
    return { '--hue': topicHue(topic) } as CSSProperties;
}
