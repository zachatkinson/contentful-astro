import { useEffect, type RefObject } from "react";
import { Container, DisplacementFilter } from "pixi.js";
import { gsap } from "gsap";

interface UseTextTiltProps {
    sliderRef: RefObject<HTMLDivElement | null>;
    textContainersRef: RefObject<Container[]>;
    currentIndex: RefObject<number>;
    cursorTextEffect: boolean;
    maxContainerShiftFraction: number;
    bgDispFilterRef: RefObject<DisplacementFilter | null>;
    cursorDispFilterRef: RefObject<DisplacementFilter | null>;
    cursorImgEffect: boolean;
}

const useTextTilt = ({
                         sliderRef,
                         textContainersRef,
                         currentIndex,
                         cursorTextEffect,
                         maxContainerShiftFraction,
                         bgDispFilterRef,
                         cursorDispFilterRef,
                         cursorImgEffect,
                     }: UseTextTiltProps) => {
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
        sliderRef,
        textContainersRef,
        currentIndex,
        cursorTextEffect,
        maxContainerShiftFraction,
        bgDispFilterRef,
        cursorDispFilterRef,
        cursorImgEffect,
    ]);
};

export default useTextTilt;