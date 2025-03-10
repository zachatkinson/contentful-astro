import { useEffect, useRef, type RefObject } from "react";
import { Sprite } from "pixi.js";
import { gsap } from "gsap";
import ResourceManager from '../managers/ResourceManager';

interface UseMouseDragProps {
    sliderRef: RefObject<HTMLDivElement | null>;
    slidesRef: RefObject<Sprite[]>;
    currentIndex: RefObject<number>;
    swipeScaleIntensity: number;
    swipeDistance: number;
    onSwipeLeft: () => void;
    onSwipeRight: () => void;
    resourceManager?: ResourceManager | null;
}

/**
 * Hook to handle mouse drag interactions for slides
 */
const useMouseDrag = ({
                          sliderRef,
                          slidesRef,
                          currentIndex,
                          swipeScaleIntensity,
                          swipeDistance,
                          onSwipeLeft,
                          onSwipeRight,
                          resourceManager
                      }: UseMouseDragProps) => {
    // Track component mounted state
    const isMountedRef = useRef(true);

    // Track drag state
    const dragStateRef = useRef({
        isDragging: false,
        startX: 0,
        endX: 0
    });

    useEffect(() => {
        // Reset mounted state on mount
        isMountedRef.current = true;

        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        const slider = sliderRef.current;
        if (!slider) return;

        const handleMouseDown = (e: MouseEvent) => {
            // Skip if unmounted
            if (!isMountedRef.current) return;

            dragStateRef.current.isDragging = true;
            dragStateRef.current.startX = e.clientX;
            dragStateRef.current.endX = e.clientX;
        };

        const handleMouseMove = (e: MouseEvent) => {
            // Skip if unmounted or not dragging
            if (!isMountedRef.current || !dragStateRef.current.isDragging) return;

            dragStateRef.current.endX = e.clientX;
            const deltaX = dragStateRef.current.endX - dragStateRef.current.startX;
            const normalizedFactor = Math.min(Math.abs(deltaX) / swipeDistance, 1);

            const currentSlide = slidesRef.current[currentIndex.current];
            if (currentSlide) {
                const newScale = 1 + normalizedFactor * swipeScaleIntensity;

                // Create and track the animation
                const dragTween = gsap.to(currentSlide.scale, {
                    x: (currentSlide as any).baseScale * newScale,
                    y: (currentSlide as any).baseScale * newScale,
                    duration: 0.1,
                    ease: "power2.out",
                    onComplete: () => {
                        // Skip if unmounted during animation
                        if (!isMountedRef.current) return;

                        // Re-track the sprite after animation
                        if (resourceManager && currentSlide) {
                            resourceManager.trackDisplayObject(currentSlide);
                        }
                    }
                });

                // Track the animation with the resource manager
                if (resourceManager) {
                    resourceManager.trackAnimation(dragTween);
                }
            }
        };

        const handleMouseUp = () => {
            // Skip if unmounted or not dragging
            if (!isMountedRef.current || !dragStateRef.current.isDragging) return;

            dragStateRef.current.isDragging = false;
            const deltaX = dragStateRef.current.endX - dragStateRef.current.startX;
            const currentSlide = slidesRef.current[currentIndex.current];

            if (currentSlide) {
                // Create and track the animation to reset scale
                const resetTween = gsap.to(currentSlide.scale, {
                    x: (currentSlide as any).baseScale,
                    y: (currentSlide as any).baseScale,
                    duration: 0.2,
                    ease: "power2.out",
                    onComplete: () => {
                        // Skip if unmounted during animation
                        if (!isMountedRef.current) return;

                        // Re-track the sprite after animation
                        if (resourceManager && currentSlide) {
                            resourceManager.trackDisplayObject(currentSlide);
                        }
                    }
                });

                // Track the animation with the resource manager
                if (resourceManager) {
                    resourceManager.trackAnimation(resetTween);
                }
            }

            if (Math.abs(deltaX) > swipeDistance) {
                if (deltaX < 0) {
                    onSwipeLeft();
                } else {
                    onSwipeRight();
                }
            }
        };

        const handleMouseLeave = () => {
            // Skip if unmounted
            if (!isMountedRef.current) return;

            if (dragStateRef.current.isDragging) {
                dragStateRef.current.isDragging = false;
                const currentSlide = slidesRef.current[currentIndex.current];

                if (currentSlide) {
                    // Create and track the animation to reset scale
                    const leaveTween = gsap.to(currentSlide.scale, {
                        x: (currentSlide as any).baseScale,
                        y: (currentSlide as any).baseScale,
                        duration: 0.2,
                        ease: "power2.out",
                        onComplete: () => {
                            // Skip if unmounted during animation
                            if (!isMountedRef.current) return;

                            // Re-track the sprite after animation
                            if (resourceManager && currentSlide) {
                                resourceManager.trackDisplayObject(currentSlide);
                            }
                        }
                    });

                    // Track the animation with the resource manager
                    if (resourceManager) {
                        resourceManager.trackAnimation(leaveTween);
                    }
                }
            }
        };

        // Add event listeners using ResourceManager if available
        if (resourceManager) {
            // Cast to HTMLElement for type safety
            const htmlSlider = slider as HTMLElement;

            resourceManager.addEventListener(htmlSlider, "mousedown", handleMouseDown);
            resourceManager.addEventListener(htmlSlider, "mousemove", handleMouseMove);
            resourceManager.addEventListener(htmlSlider, "mouseup", handleMouseUp);
            resourceManager.addEventListener(htmlSlider, "mouseleave", handleMouseLeave);
        } else {
            // Fallback to direct DOM event listeners
            slider.addEventListener("mousedown", handleMouseDown);
            slider.addEventListener("mousemove", handleMouseMove);
            slider.addEventListener("mouseup", handleMouseUp);
            slider.addEventListener("mouseleave", handleMouseLeave);
        }

        // Cleanup on unmount
        return () => {
            // Mark as unmounted first
            isMountedRef.current = false;

            // Remove event listeners if ResourceManager not used
            if (!resourceManager) {
                slider.removeEventListener("mousedown", handleMouseDown);
                slider.removeEventListener("mousemove", handleMouseMove);
                slider.removeEventListener("mouseup", handleMouseUp);
                slider.removeEventListener("mouseleave", handleMouseLeave);
            }
            // Note: ResourceManager handles event cleanup when disposed
        };
    }, [
        sliderRef,
        slidesRef,
        currentIndex,
        swipeScaleIntensity,
        swipeDistance,
        onSwipeLeft,
        onSwipeRight,
        resourceManager
    ]);
};

export default useMouseDrag;