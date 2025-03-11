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
    // Track drag state
    const dragStateRef = useRef({
        isDragging: false,
        startX: 0,
        endX: 0
    });

    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        const slider = sliderRef.current;
        if (!slider) return;

        // Generalized event handler to work with both MouseEvent and Event types
        const handleMouseDown = (evt: Event) => {
            const mouseEvt = evt as MouseEvent;
            // Explicitly use mouseEvt.clientX
            dragStateRef.current.isDragging = true;
            dragStateRef.current.startX = mouseEvt.clientX;
            dragStateRef.current.endX = mouseEvt.clientX;
            // Prevent default to stop text selection during drag
            evt.preventDefault();
        };

        const handleMouseMove = (evt: Event) => {
            const mouseEvt = evt as MouseEvent;
            // Skip if not dragging
            if (!dragStateRef.current.isDragging) return;

            // Explicitly use mouseEvt.clientX
            dragStateRef.current.endX = mouseEvt.clientX;
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
            // Prevent default to stop text selection during drag
            evt.preventDefault();
        };

        const handleMouseUp = (evt: Event) => {
            const mouseEvt = evt as MouseEvent;
            // Skip if not dragging
            if (!dragStateRef.current.isDragging) return;

            dragStateRef.current.isDragging = false;
            // Explicitly use mouseEvt.clientX
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
            // Prevent default to stop text selection
            evt.preventDefault();
        };

        const handleMouseLeave = (evt: Event) => {
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
            // Prevent default to stop text selection
            evt.preventDefault();
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