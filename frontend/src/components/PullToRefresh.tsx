import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
    children: React.ReactNode;
    onRefresh?: () => Promise<void> | void;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({ children, onRefresh }) => {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const touchStart = useRef<number | null>(null);
    const pullThreshold = 80; // Distance to trigger refresh
    const maxPull = 120; // Maximum distance indicator can move

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleTouchStart = (e: TouchEvent) => {
            // Only allow pull to refresh if we're at the very top of the scrollable container
            if (container.scrollTop <= 0) {
                touchStart.current = e.touches[0].clientY;
            } else {
                touchStart.current = null;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (touchStart.current === null || isRefreshing) return;

            const currentTouch = e.touches[0].clientY;
            const diff = currentTouch - touchStart.current;

            if (diff > 0) {
                // We're pulling down
                // Add a "dead zone" where the indicator doesn't move yet
                const deadZone = 40;
                if (diff < deadZone) {
                    setPullDistance(0);
                    return;
                }

                const effectiveDiff = diff - deadZone;
                const easedPull = Math.min(effectiveDiff * 0.4, maxPull);
                setPullDistance(easedPull);

                // Prevent default scrolling behavior when pulling down at the top
                if (e.cancelable) {
                    e.preventDefault();
                }
            } else {
                // We're scrolling up or pulling back up
                setPullDistance(0);
                touchStart.current = null;
            }
        };

        const handleTouchEnd = async () => {
            if (touchStart.current === null || isRefreshing) return;

            const triggerThreshold = 100; // Increased trigger threshold
            if (pullDistance >= triggerThreshold - 40) { // Accounting for eased pull and dead zone
                setIsRefreshing(true);
                setPullDistance(80); // Keep it at a visible threshold while refreshing

                try {
                    if (onRefresh) {
                        await onRefresh();
                    } else {
                        // Default behavior: reload page
                        window.location.reload();
                    }
                } finally {
                    // Slight delay before snapping back
                    setTimeout(() => {
                        setIsRefreshing(false);
                        setPullDistance(0);
                    }, 500);
                }
            } else {
                setPullDistance(0);
            }
            touchStart.current = null;
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd);

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [pullDistance, isRefreshing, onRefresh]);

    return (
        <div ref={containerRef} className="relative h-full overflow-y-auto" style={{ overscrollBehaviorY: 'contain' }}>
            {/* Pull indicator */}
            <div
                className="absolute left-1/2 -translate-x-1/2 z-50 flex items-center justify-center pointer-events-none transition-transform duration-200"
                style={{
                    top: `-${maxPull}px`,
                    transform: `translate(-50%, ${pullDistance}px) rotate(${pullDistance * 2}deg)`,
                    opacity: pullDistance / pullThreshold,
                    visibility: pullDistance > 10 ? 'visible' : 'hidden'
                }}
            >
                <div className="bg-white rounded-full p-2 shadow-lg border border-gray-100">
                    <RefreshCw
                        className={`w-5 h-5 text-green-600 ${isRefreshing ? 'animate-spin' : ''}`}
                    />
                </div>
            </div>

            {/* Content */}
            <div
                className="transition-transform duration-200"
                style={{ transform: `translateY(${isRefreshing ? 60 : 0}px)` }}
            >
                {children}
            </div>
        </div>
    );
};

export default PullToRefresh;
