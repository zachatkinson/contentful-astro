import { useEffect, useRef, type RefObject } from 'react';
import { DisplacementFilter } from 'pixi.js';
import { gsap } from 'gsap';
import ResourceManager from '../managers/ResourceManager';

interface UseIdleTimerProps {
    sliderRef: RefObject<HTMLDivElement | null>;
    cursorActive: RefObject<boolean>;
    bgDispFilterRef: RefObject<DisplacementFilter | null>;
    cursorDispFilterRef: RefObject<DisplacementFilter | null>;
    cursorImgEffect: boolean;
    defaultBgFilterScale: number;
    defaultCursorFilterScale: number;
    idleTimeout?: number;
    resourceManager?: ResourceManager | null;
}

/**
 * Hook to manage idle timer for resetting displacement effects
 */
const useIdleTimer = ({
                          sliderRef,
                          cursorActive,
                          bgDispFilterRef,
                          cursorDispFilterRef,
                          cursorImgEffect,
                          defaultBgFilterScale,
                          defaultCursorFilterScale,
                          idleTimeout = 300,
                          resourceManager
                      }: UseIdleTimerProps) => {
    // Store idle timer reference
    const idleTimerRef = useRef<number | null>(null);

    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        if (!sliderRef.current) return;

        const node = sliderRef.current;

        const handleMouseMove = () => {
            // Only apply scale effects if cursor is active (mouse is over the slider)
            if (!cursorActive.current) return;

            // Clear previous timer
            if (idleTimerRef.current !== null) {
                if (resourceManager) {
                    resourceManager.clearTimeout(idleTimerRef.current);
                } else {
                    window.clearTimeout(idleTimerRef.current);
                }
                idleTimerRef.current = null;
            }

            // Reset background displacement filter scale
            if (bgDispFilterRef.current) {
                const bgTween = gsap.to(bgDispFilterRef.current.scale, {
                    x: defaultBgFilterScale,
                    y: defaultBgFilterScale,
                    duration: 0.5,
                    ease: 'power2.out',
                    onComplete: () => {
                        // Re-track the filter after animation completes
                        if (resourceManager && bgDispFilterRef.current) {
                            resourceManager.trackFilter(bgDispFilterRef.current);
                        }
                    }
                });

                // Track the animation
                if (resourceManager) {
                    resourceManager.trackAnimation(bgTween);
                }
            }

            // Reset cursor displacement filter scale if enabled
            if (cursorImgEffect && cursorDispFilterRef.current) {
                const cursorTween = gsap.to(cursorDispFilterRef.current.scale, {
                    x: defaultCursorFilterScale,
                    y: defaultCursorFilterScale,
                    duration: 0.5,
                    ease: 'power2.out',
                    onComplete: () => {
                        // Re-track the filter after animation completes
                        if (resourceManager && cursorDispFilterRef.current) {
                            resourceManager.trackFilter(cursorDispFilterRef.current);
                        }
                    }
                });

                // Track the animation
                if (resourceManager) {
                    resourceManager.trackAnimation(cursorTween);
                }
            }

            // Set new timer for idle effects
            const setIdleTimer = () => {
                if (cursorActive.current) {
                    // Gradually reset filter scales
                    if (bgDispFilterRef.current) {
                        const bgIdleTween = gsap.to(bgDispFilterRef.current.scale, {
                            x: 0,
                            y: 0,
                            duration: 0.5,
                            ease: 'power2.out',
                            onComplete: () => {
                                // Re-track the filter after animation
                                if (resourceManager && bgDispFilterRef.current) {
                                    resourceManager.trackFilter(bgDispFilterRef.current);
                                }
                            }
                        });

                        // Track the animation
                        if (resourceManager) {
                            resourceManager.trackAnimation(bgIdleTween);
                        }
                    }

                    if (cursorImgEffect && cursorDispFilterRef.current) {
                        const cursorIdleTween = gsap.to(cursorDispFilterRef.current.scale, {
                            x: 0,
                            y: 0,
                            duration: 0.5,
                            ease: 'power2.out',
                            onComplete: () => {
                                // Re-track the filter after animation
                                if (resourceManager && cursorDispFilterRef.current) {
                                    resourceManager.trackFilter(cursorDispFilterRef.current);
                                }
                            }
                        });

                        // Track the animation
                        if (resourceManager) {
                            resourceManager.trackAnimation(cursorIdleTween);
                        }
                    }
                }
            };

            // Use ResourceManager timeout if available
            if (resourceManager) {
                idleTimerRef.current = resourceManager.setTimeout(setIdleTimer, idleTimeout);
            } else {
                idleTimerRef.current = window.setTimeout(setIdleTimer, idleTimeout);
            }
        };

        // Add event listener
        if (resourceManager) {
            // Use ResourceManager to track event listener
            resourceManager.addEventListener(node, 'mousemove', handleMouseMove);
        } else {
            // Fallback to direct DOM event listener
            node.addEventListener('mousemove', handleMouseMove);
        }

        // Cleanup on unmount
        return () => {
            // Clear any pending timeout
            if (idleTimerRef.current !== null) {
                if (resourceManager) {
                    resourceManager.clearTimeout(idleTimerRef.current);
                } else {
                    window.clearTimeout(idleTimerRef.current);
                }
                idleTimerRef.current = null;
            }

            // Remove event listener if ResourceManager not used
            if (!resourceManager) {
                if (node) {
                    node.removeEventListener('mousemove', handleMouseMove);
                }
            }
            // Note: ResourceManager handles event cleanup when disposed
        };
    }, [
        sliderRef,
        bgDispFilterRef,
        cursorDispFilterRef,
        cursorImgEffect,
        defaultBgFilterScale,
        defaultCursorFilterScale,
        idleTimeout,
        resourceManager,
        cursorActive
    ]);
};

export default useIdleTimer;