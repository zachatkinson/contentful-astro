import { useEffect } from "react";
import { gsap } from "gsap";
import { useKineticSlider } from '../context/KineticSliderContext';

/**
 * Hook to handle mouse drag interactions for slide navigation
 */
const useMouseDrag = () => {
    // Use the KineticSlider context instead of receiving props directly
    const {
        sliderRef,
        pixiRefs,
        props,
        actions
    } = useKineticSlider();

    // Extract necessary props and refs
    const { slides: slidesRef, currentIndex } = pixiRefs;
    const { swipeScaleIntensity = 0.3, swipeDistance = 100 } = props;
    const { goNext, goPrev } = actions;

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
                });
            }
            if (Math.abs(deltaX) > swipeDistance) {
                if (deltaX < 0) {
                    goNext();
                } else {
                    goPrev();
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
        sliderRef.current,
        slidesRef.current,
        currentIndex.current,
        swipeScaleIntensity,
        swipeDistance,
        goNext,
        goPrev,
    ]);
};

export default useMouseDrag;