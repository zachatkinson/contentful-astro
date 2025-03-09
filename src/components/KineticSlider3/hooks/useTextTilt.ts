import { useEffect } from "react";
import { gsap } from "gsap";
import { useKineticSlider } from '../context/KineticSliderContext';

/**
 * Hook to create a parallax tilt effect on text based on mouse position
 */
const useTextTilt = () => {
    // Use the KineticSlider context instead of receiving props directly
    const {
        sliderRef,
        pixiRefs,
        props
    } = useKineticSlider();

    // Extract necessary props and refs
    const { textContainers: textContainersRef, currentIndex, bgDispFilter: bgDispFilterRef, cursorDispFilter: cursorDispFilterRef } = pixiRefs;
    const { cursorTextEffect = false, maxContainerShiftFraction = 0.05, cursorImgEffect = false } = props;

    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        if (!cursorTextEffect || !sliderRef.current)
            return;

        const sliderElement = sliderRef.current;
        let tiltTimeout: ReturnType<typeof setTimeout>;

        const handleTextTilt = (e: MouseEvent) => {
            const containerWidth = sliderElement.clientWidth;
            const containerHeight = sliderElement.clientHeight;
            const centerX = containerWidth / 2;
            const centerY = containerHeight / 2;
            const offsetX = centerX - e.clientX;
            const offsetY = centerY - e.clientY;

            const rawContainerShiftX = offsetX * 0.05;
            const rawContainerShiftY = offsetY * 0.1;
            const maxShiftX = containerWidth * maxContainerShiftFraction;
            const maxShiftY = containerHeight * maxContainerShiftFraction;
            const containerShiftX = Math.max(Math.min(rawContainerShiftX, maxShiftX), -maxShiftX);
            const containerShiftY = Math.max(Math.min(rawContainerShiftY, maxShiftY), -maxShiftY);

            const activeTextContainer = textContainersRef.current[currentIndex.current];
            if (activeTextContainer && activeTextContainer.children.length >= 2) {
                gsap.to(activeTextContainer, {
                    x: centerX + containerShiftX,
                    y: centerY + containerShiftY,
                    duration: 0.5,
                    ease: "expo.out",
                });
                const maxTitleShift = containerWidth * 0.1;
                const titleRawShiftX = offsetX * 0.8;
                const titleShiftX = Math.max(Math.min(titleRawShiftX, maxTitleShift), -maxTitleShift);
                gsap.to(activeTextContainer.children[0], {
                    x: titleShiftX,
                    duration: 0.5,
                    ease: "expo.out",
                });
                const maxSubtitleShift = containerWidth * 0.15;
                const subtitleRawShiftX = offsetX * 1.0;
                const subtitleShiftX = Math.max(Math.min(subtitleRawShiftX, maxSubtitleShift), -maxSubtitleShift);
                gsap.to(activeTextContainer.children[1], {
                    x: subtitleShiftX,
                    duration: 0.5,
                    ease: "expo.out",
                });
            }

            if (tiltTimeout) clearTimeout(tiltTimeout);
            tiltTimeout = setTimeout(() => {
                const activeContainer = textContainersRef.current[currentIndex.current];
                if (activeContainer) {
                    gsap.to(activeContainer, {
                        x: centerX,
                        y: centerY,
                        duration: 1,
                        ease: "expo.inOut",
                    });
                    if (activeContainer.children[0]) {
                        gsap.to(activeContainer.children[0], {
                            x: 0,
                            duration: 1,
                            ease: "expo.inOut",
                        });
                    }
                    if (activeContainer.children[1]) {
                        gsap.to(activeContainer.children[1], {
                            x: 0,
                            duration: 1,
                            ease: "expo.inOut",
                        });
                    }
                    if (bgDispFilterRef.current) {
                        gsap.to(bgDispFilterRef.current.scale, {
                            x: 0,
                            y: 0,
                            duration: 1,
                            ease: "expo.inOut",
                        });
                    }
                    if (cursorImgEffect && cursorDispFilterRef.current) {
                        gsap.to(cursorDispFilterRef.current.scale, {
                            x: 0,
                            y: 0,
                            duration: 1,
                            ease: "expo.inOut",
                        });
                    }
                }
            }, 300);
        };

        sliderElement.addEventListener("mousemove", handleTextTilt);
        return () => {
            sliderElement.removeEventListener("mousemove", handleTextTilt);
            if (tiltTimeout) clearTimeout(tiltTimeout);
        };
    }, [
        sliderRef.current,
        textContainersRef.current,
        currentIndex.current,
        cursorTextEffect,
        maxContainerShiftFraction,
        bgDispFilterRef.current,
        cursorDispFilterRef.current,
        cursorImgEffect,
    ]);
};

export default useTextTilt;