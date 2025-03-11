import { useEffect, useRef, type RefObject } from "react";
import { Container, DisplacementFilter } from "pixi.js";
import { gsap } from "gsap";
import ResourceManager from '../managers/ResourceManager';

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

interface UseTextTiltProps {
    sliderRef: RefObject<HTMLDivElement | null>;
    textContainersRef: RefObject<Container[]>;
    currentIndex: RefObject<number>;
    cursorTextEffect: boolean;
    maxContainerShiftFraction: number;
    bgDispFilterRef: RefObject<DisplacementFilter | null>;
    cursorDispFilterRef: RefObject<DisplacementFilter | null>;
    cursorImgEffect: boolean;
    resourceManager?: ResourceManager | null;
    throttleTime?: number; // Optional throttle time in ms
}

/**
 * Hook to create a 3D-like tilt effect on text when the mouse moves over the slider
 * This creates a parallax effect between title and subtitle text elements
 */
const useTextTilt = ({
                         sliderRef,
                         textContainersRef,
                         currentIndex,
                         cursorTextEffect,
                         maxContainerShiftFraction,
                         bgDispFilterRef,
                         cursorDispFilterRef,
                         cursorImgEffect,
                         resourceManager,
                         throttleTime = 50 // Default throttle of 50ms
                     }: UseTextTiltProps) => {
    // Store states in refs to avoid re-renders
    const lastMoveTimeRef = useRef<number>(0);
    const tiltTimeoutRef = useRef<number | null>(null);
    const animationStateRef = useRef({
        isAnimating: false,
        lastOffsetX: 0,
        lastOffsetY: 0
    });

    // Ref to store GSAP animations for cleanup
    const activeTweensRef = useRef<gsap.core.Tween[]>([]);

    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        // Skip if effect is disabled or refs are missing
        if (!cursorTextEffect || !sliderRef.current) {
            if (isDevelopment) {
                console.log('Text tilt effect is disabled or slider ref is missing');
            }
            return;
        }

        const sliderElement = sliderRef.current;

        /**
         * Clean up active tweens
         */
        const cleanupActiveTweens = () => {
            // Kill all active tweens
            activeTweensRef.current.forEach(tween => {
                tween.kill();
            });
            activeTweensRef.current = [];
        };

        /**
         * Calculate the position and amount of tilt based on mouse position
         * @param mouseX - Mouse X position
         * @param mouseY - Mouse Y position
         * @returns Calculated offsets and shifts for the tilt effect
         */
        const calculateTiltValues = (mouseX: number, mouseY: number) => {
            try {
                const containerWidth = sliderElement.clientWidth;
                const containerHeight = sliderElement.clientHeight;
                const centerX = containerWidth / 2;
                const centerY = containerHeight / 2;

                // Calculate offsets from center
                const offsetX = centerX - mouseX;
                const offsetY = centerY - mouseY;

                // Store for comparison in throttling
                animationStateRef.current.lastOffsetX = offsetX;
                animationStateRef.current.lastOffsetY = offsetY;

                // Calculate shift amounts with appropriate constraints
                const rawContainerShiftX = offsetX * 0.05;
                const rawContainerShiftY = offsetY * 0.1;
                const maxShiftX = containerWidth * maxContainerShiftFraction;
                const maxShiftY = containerHeight * maxContainerShiftFraction;
                const containerShiftX = Math.max(Math.min(rawContainerShiftX, maxShiftX), -maxShiftX);
                const containerShiftY = Math.max(Math.min(rawContainerShiftY, maxShiftY), -maxShiftY);

                // Calculate title and subtitle shifts
                const maxTitleShift = containerWidth * 0.1;
                const titleRawShiftX = offsetX * 0.8;
                const titleShiftX = Math.max(Math.min(titleRawShiftX, maxTitleShift), -maxTitleShift);

                const maxSubtitleShift = containerWidth * 0.15;
                const subtitleRawShiftX = offsetX;
                const subtitleShiftX = Math.max(Math.min(subtitleRawShiftX, maxSubtitleShift), -maxSubtitleShift);

                return {
                    containerShiftX,
                    containerShiftY,
                    titleShiftX,
                    subtitleShiftX,
                    centerX,
                    centerY
                };
            } catch (error) {
                if (isDevelopment) {
                    console.error("Error calculating tilt values:", error);
                }

                // Return safe default values
                return {
                    containerShiftX: 0,
                    containerShiftY: 0,
                    titleShiftX: 0,
                    subtitleShiftX: 0,
                    centerX: sliderElement.clientWidth / 2,
                    centerY: sliderElement.clientHeight / 2
                };
            }
        };

        /**
         * Apply the tilt effect based on calculated values
         */
        const applyTiltEffect = (
            { containerShiftX, containerShiftY, titleShiftX, subtitleShiftX, centerX, centerY }:
            ReturnType<typeof calculateTiltValues>
        ) => {
            try {
                const activeTextContainer = textContainersRef.current[currentIndex.current];

                if (!activeTextContainer || activeTextContainer.children.length < 2) {
                    return;
                }

                // Clear previous animations
                cleanupActiveTweens();

                // Create and track container animation
                const containerTween = gsap.to(activeTextContainer, {
                    x: centerX + containerShiftX,
                    y: centerY + containerShiftY,
                    duration: 0.5,
                    ease: "expo.out",
                    onComplete: () => {
                        // Re-track the container after animation
                        if (resourceManager && activeTextContainer) {
                            resourceManager.trackDisplayObject(activeTextContainer);
                        }
                    }
                });

                // Add to active tweens
                activeTweensRef.current.push(containerTween);

                // Track with ResourceManager
                if (resourceManager) {
                    resourceManager.trackAnimation(containerTween);
                }

                // Create and track title animation if exists
                if (activeTextContainer.children[0]) {
                    const titleTween = gsap.to(activeTextContainer.children[0], {
                        x: titleShiftX,
                        duration: 0.5,
                        ease: "expo.out",
                        onComplete: () => {
                            // Re-track the text object after animation
                            if (resourceManager && activeTextContainer && activeTextContainer.children[0]) {
                                resourceManager.trackDisplayObject(activeTextContainer.children[0]);
                            }
                        }
                    });

                    // Add to active tweens
                    activeTweensRef.current.push(titleTween);

                    // Track with ResourceManager
                    if (resourceManager) {
                        resourceManager.trackAnimation(titleTween);
                    }
                }

                // Create and track subtitle animation if exists
                if (activeTextContainer.children[1]) {
                    const subtitleTween = gsap.to(activeTextContainer.children[1], {
                        x: subtitleShiftX,
                        duration: 0.5,
                        ease: "expo.out",
                        onComplete: () => {
                            // Re-track the text object after animation
                            if (resourceManager && activeTextContainer && activeTextContainer.children[1]) {
                                resourceManager.trackDisplayObject(activeTextContainer.children[1]);
                            }
                        }
                    });

                    // Add to active tweens
                    activeTweensRef.current.push(subtitleTween);

                    // Track with ResourceManager
                    if (resourceManager) {
                        resourceManager.trackAnimation(subtitleTween);
                    }
                }

                // Mark as animating
                animationStateRef.current.isAnimating = true;
            } catch (error) {
                if (isDevelopment) {
                    console.error("Error applying tilt effect:", error);
                }
            }
        };

        /**
         * Reset the tilt effect, returning elements to their default positions
         */
        const resetTiltEffect = () => {
            try {
                const activeContainer = textContainersRef.current[currentIndex.current];

                if (!activeContainer) return;

                // Clear previous animations
                cleanupActiveTweens();

                // Get container dimensions
                const centerX = sliderElement.clientWidth / 2;
                const centerY = sliderElement.clientHeight / 2;

                // Create and track container reset animation
                const containerResetTween = gsap.to(activeContainer, {
                    x: centerX,
                    y: centerY,
                    duration: 1,
                    ease: "expo.inOut",
                    onComplete: () => {
                        // Re-track the container after animation
                        if (resourceManager && activeContainer) {
                            resourceManager.trackDisplayObject(activeContainer);
                        }

                        // Mark as not animating
                        animationStateRef.current.isAnimating = false;
                    }
                });

                // Add to active tweens
                activeTweensRef.current.push(containerResetTween);

                // Track with ResourceManager
                if (resourceManager) {
                    resourceManager.trackAnimation(containerResetTween);
                }

                // Create and track title reset animation if exists
                if (activeContainer.children[0]) {
                    const titleResetTween = gsap.to(activeContainer.children[0], {
                        x: 0,
                        duration: 1,
                        ease: "expo.inOut",
                        onComplete: () => {
                            // Re-track the text object after animation
                            if (resourceManager && activeContainer && activeContainer.children[0]) {
                                resourceManager.trackDisplayObject(activeContainer.children[0]);
                            }
                        }
                    });

                    // Add to active tweens
                    activeTweensRef.current.push(titleResetTween);

                    // Track with ResourceManager
                    if (resourceManager) {
                        resourceManager.trackAnimation(titleResetTween);
                    }
                }

                // Create and track subtitle reset animation if exists
                if (activeContainer.children[1]) {
                    const subtitleResetTween = gsap.to(activeContainer.children[1], {
                        x: 0,
                        duration: 1,
                        ease: "expo.inOut",
                        onComplete: () => {
                            // Re-track the text object after animation
                            if (resourceManager && activeContainer && activeContainer.children[1]) {
                                resourceManager.trackDisplayObject(activeContainer.children[1]);
                            }
                        }
                    });

                    // Add to active tweens
                    activeTweensRef.current.push(subtitleResetTween);

                    // Track with ResourceManager
                    if (resourceManager) {
                        resourceManager.trackAnimation(subtitleResetTween);
                    }
                }

                // Reset filter effects if they exist
                if (bgDispFilterRef.current) {
                    const bgFilterResetTween = gsap.to(bgDispFilterRef.current.scale, {
                        x: 0,
                        y: 0,
                        duration: 1,
                        ease: "expo.inOut",
                        onComplete: () => {
                            // Re-track the filter after animation
                            if (resourceManager && bgDispFilterRef.current) {
                                resourceManager.trackFilter(bgDispFilterRef.current);
                            }
                        }
                    });

                    // Add to active tweens
                    activeTweensRef.current.push(bgFilterResetTween);

                    // Track with ResourceManager
                    if (resourceManager) {
                        resourceManager.trackAnimation(bgFilterResetTween);
                    }
                }

                if (cursorImgEffect && cursorDispFilterRef.current) {
                    const cursorFilterResetTween = gsap.to(cursorDispFilterRef.current.scale, {
                        x: 0,
                        y: 0,
                        duration: 1,
                        ease: "expo.inOut",
                        onComplete: () => {
                            // Re-track the filter after animation
                            if (resourceManager && cursorDispFilterRef.current) {
                                resourceManager.trackFilter(cursorDispFilterRef.current);
                            }
                        }
                    });

                    // Add to active tweens
                    activeTweensRef.current.push(cursorFilterResetTween);

                    // Track with ResourceManager
                    if (resourceManager) {
                        resourceManager.trackAnimation(cursorFilterResetTween);
                    }
                }
            } catch (error) {
                if (isDevelopment) {
                    console.error("Error resetting tilt effect:", error);
                }

                // Mark as not animating in case of errors
                animationStateRef.current.isAnimating = false;
            }
        };

        /**
         * Main mouse move handler with throttling
         */
        const handleTextTilt = (e: MouseEvent) => {
            try {
                // Get current time for throttling
                const now = Date.now();

                // Skip if not enough time has passed since last update (throttling)
                if (now - lastMoveTimeRef.current < throttleTime) {
                    return;
                }

                // Update last move time
                lastMoveTimeRef.current = now;

                // Calculate the tilt values
                const tiltValues = calculateTiltValues(e.clientX, e.clientY);

                // Apply the tilt effect
                applyTiltEffect(tiltValues);

                // Clear any existing timeout
                if (tiltTimeoutRef.current !== null) {
                    if (resourceManager) {
                        resourceManager.clearTimeout(tiltTimeoutRef.current);
                    } else {
                        clearTimeout(tiltTimeoutRef.current);
                    }
                    tiltTimeoutRef.current = null;
                }

                // Set timeout to reset the tilt effect after inactivity
                const setTimeoutFn = () => {
                    resetTiltEffect();
                    tiltTimeoutRef.current = null;
                };

                // Use ResourceManager for timeout if available
                if (resourceManager) {
                    tiltTimeoutRef.current = resourceManager.setTimeout(setTimeoutFn, 300);
                } else {
                    tiltTimeoutRef.current = window.setTimeout(setTimeoutFn, 300);
                }
            } catch (error) {
                if (isDevelopment) {
                    console.error("Error in text tilt handler:", error);
                }
            }
        };

        // Add event listener with a proper passive flag for better scrolling performance
        sliderElement.addEventListener("mousemove", handleTextTilt, { passive: true });

        // Cleanup function
        return () => {
            // Remove event listener
            sliderElement.removeEventListener("mousemove", handleTextTilt);

            // Clean up any active tweens
            cleanupActiveTweens();

            // Clear any pending timeout
            if (tiltTimeoutRef.current !== null) {
                if (resourceManager) {
                    resourceManager.clearTimeout(tiltTimeoutRef.current);
                } else {
                    clearTimeout(tiltTimeoutRef.current);
                }
                tiltTimeoutRef.current = null;
            }
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
        resourceManager,
        throttleTime
    ]);
};

export default useTextTilt;