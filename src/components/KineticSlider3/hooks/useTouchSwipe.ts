import { useEffect } from "react";
import { useKineticSlider } from '../context/KineticSliderContext';

/**
 * Hook to handle touch swipe gestures for navigation
 */
const useTouchSwipe = () => {
    // Use the KineticSlider context instead of receiving props directly
    const {
        sliderRef,
        props,
        actions
    } = useKineticSlider();

    // Extract swipe threshold and navigation functions
    const { swipeThreshold } = props;
    const { goNext, goPrev } = actions;

    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        const slider = sliderRef.current;
        if (!slider) return;

        // Compute default threshold if not provided.
        const threshold = swipeThreshold ?? window.innerWidth * 0.2;

        console.log(`Touch swipe handler initialized with threshold: ${threshold}px`);

        let touchStartX = 0;
        let touchEndX = 0;
        let isSwiping = false;

        const handleTouchStart = (e: TouchEvent) => {
            touchStartX = e.touches[0].clientX;
            touchEndX = touchStartX;
            isSwiping = true;
            console.log(`Touch start at ${touchStartX}px`);
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isSwiping) return;
            touchEndX = e.touches[0].clientX;

            // Prevent default to avoid scrolling while swiping
            // (only if the swipe distance is significant)
            if (Math.abs(touchEndX - touchStartX) > 10) {
                e.preventDefault();
            }
        };

        const handleTouchEnd = () => {
            if (!isSwiping) return;

            const swipeDistance = touchEndX - touchStartX;
            console.log(`Touch end, swipe distance: ${swipeDistance}px (threshold: ${threshold}px)`);

            if (Math.abs(swipeDistance) > threshold) {
                if (swipeDistance < 0) {
                    console.log("Swipe left detected, navigating to next slide");
                    goNext();
                } else {
                    console.log("Swipe right detected, navigating to previous slide");
                    goPrev();
                }
            } else {
                console.log(`Swipe ignored, below threshold (${Math.abs(swipeDistance)}px < ${threshold}px)`);
            }

            isSwiping = false;
        };

        const handleTouchCancel = () => {
            console.log("Touch interaction cancelled");
            isSwiping = false;
        };

        // Add options to specify passive: false to allow preventing default
        const options = { passive: false };

        slider.addEventListener("touchstart", handleTouchStart, options);
        slider.addEventListener("touchmove", handleTouchMove, options);
        slider.addEventListener("touchend", handleTouchEnd);
        slider.addEventListener("touchcancel", handleTouchCancel);

        return () => {
            slider.removeEventListener("touchstart", handleTouchStart);
            slider.removeEventListener("touchmove", handleTouchMove);
            slider.removeEventListener("touchend", handleTouchEnd);
            slider.removeEventListener("touchcancel", handleTouchCancel);
        };
    }, [sliderRef.current, goNext, goPrev, swipeThreshold]);
};

export default useTouchSwipe;