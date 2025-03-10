import { useEffect, type RefObject } from "react";
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
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        const slider = sliderRef.current;
        if (!slider) return;

        let dragStartX = 0;
        let dragEndX = 0;
        let isDragging = false;

        const handleMouseDown = (e: MouseEvent) => {
            isDragging = true;
            dragStartX = e.clientX;
            dragEndX = dragStartX;
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            dragEndX = e.clientX;
            const deltaX = dragEndX - dragStartX;
            const normalizedFactor = Math.min(Math.abs(deltaX) / swipeDistance, 1);
            const currentSlide = slidesRef.current[currentIndex.current];
            if (currentSlide) {
                const newScale = 1 + normalizedFactor * swipeScaleIntensity;
                gsap.to(currentSlide.scale, {
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
            }
        };

        const handleMouseUp = () => {
            if (!isDragging) return;
            isDragging = false;
            const deltaX = dragEndX - dragStartX;
            const currentSlide = slidesRef.current[currentIndex.current];
            if (currentSlide) {
                gsap.to(currentSlide.scale, {
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
            if (isDragging) {
                isDragging = false;
                const currentSlide = slidesRef.current[currentIndex.current];
                if (currentSlide) {
                    gsap.to(currentSlide.scale, {
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
                }
            }
        };

        slider.addEventListener("mousedown", handleMouseDown);
        slider.addEventListener("mousemove", handleMouseMove);
        slider.addEventListener("mouseup", handleMouseUp);
        slider.addEventListener("mouseleave", handleMouseLeave);

        return () => {
            slider.removeEventListener("mousedown", handleMouseDown);
            slider.removeEventListener("mousemove", handleMouseMove);
            slider.removeEventListener("mouseup", handleMouseUp);
            slider.removeEventListener("mouseleave", handleMouseLeave);
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