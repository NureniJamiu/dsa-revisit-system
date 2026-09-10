import { useEffect, useRef } from 'react';

/**
 * Reveals descendants tagged with the `.reveal` class as they scroll into view.
 *
 * Attach the returned ref to a container; every `.reveal` element inside it
 * gets `.is-visible` added once it crosses the viewport threshold (one-shot,
 * so nothing re-animates on scroll-up). Stagger is opt-in per element via the
 * `--reveal-delay` CSS custom property, e.g. style={{ '--reveal-delay': '120ms' }}.
 *
 * The CSS in index.css handles the actual transition; this hook only toggles
 * the class. Falls back to "everything visible" when IntersectionObserver is
 * unavailable (SSR / very old browsers).
 */
export function useScrollReveal<T extends HTMLElement = HTMLElement>() {
    const ref = useRef<T | null>(null);

    useEffect(() => {
        const root = ref.current;
        if (!root) return;

        // Opt into the hidden-until-revealed state only now that JS is running.
        // The `.reveal { opacity: 0 }` rule is scoped under `.js-reveal`, so if
        // this effect never runs the content stays fully visible (no blank page).
        root.classList.add('js-reveal');

        const targets = Array.from(root.querySelectorAll<HTMLElement>('.reveal'));

        if (typeof IntersectionObserver === 'undefined') {
            targets.forEach((el) => el.classList.add('is-visible'));
            return;
        }

        const observer = new IntersectionObserver(
            (entries, obs) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        obs.unobserve(entry.target);
                    }
                }
            },
            { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
        );

        targets.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    return ref;
}
