import { useEffect, type RefObject } from "react";
import ResourceManager from '../managers/ResourceManager';

interface UseTouchSwipeProps {
    sliderRef: RefObject<HTMLDivElement | null>;
    onSwipeLeft: () => void;
    onSwipeRight: () => void;
    threshold?: number; // Optional override for swipe threshold.
    resourceManager?: ResourceManager | null;
}

const useTouchSwipe = ({
                           sliderRef,
                           onSwipeLeft,
                           onSwipeRight,
                           threshold,
                           resourceManager
                       }: UseTouchSwipeProps) => {
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        const slider = sliderRef.current;
        if (!slider) return;

        // Compute default threshold if not provided.
        const swipeThreshold = threshold ?? window.innerWidth * 0.2;

        let touchStartX = 0;
        let touchEndX = 0;

        const handleTouchStart = (e: TouchEvent) => {
            touchStartX = e.touches[0].clientX;
        };

        const handleTouchMove = (e: TouchEvent) => {
            touchEndX = e.touches[0].clientX;
        };

        const handleTouchEnd = () => {
            if (Math.abs(touchEndX - touchStartX) > swipeThreshold) {
                if (touchEndX < touchStartX) {
                    onSwipeLeft();
                } else {
                    onSwipeRight();
                }
            }
        };

        slider.addEventListener("touchstart", handleTouchStart);
        slider.addEventListener("touchmove", handleTouchMove);
        slider.addEventListener("touchend", handleTouchEnd);

        return () => {
            slider.removeEventListener("touchstart", handleTouchStart);
            slider.removeEventListener("touchmove", handleTouchMove);
            slider.removeEventListener("touchend", handleTouchEnd);
        };
    }, [sliderRef, onSwipeLeft, onSwipeRight, threshold, resourceManager]);
};

export default useTouchSwipe;