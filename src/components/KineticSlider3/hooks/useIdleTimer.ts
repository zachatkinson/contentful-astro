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
            if (cursorActive.current) {
                // Reset background displacement filter scale
                if (bgDispFilterRef.current) {
                    gsap.to(bgDispFilterRef.current.scale, {
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
                }

                // Reset cursor displacement filter scale if enabled
                if (cursorImgEffect && cursorDispFilterRef.current) {
                    gsap.to(cursorDispFilterRef.current.scale, {
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
                }
            }

            // Clear previous timer
            if (idleTimerRef.current !== null) {
                window.clearTimeout(idleTimerRef.current);
            }

            // Set new timer
            idleTimerRef.current = window.setTimeout(() => {
                // Gradually reset filter scales after idle time
                if (cursorActive.current) {
                    if (bgDispFilterRef.current) {
                        gsap.to(bgDispFilterRef.current.scale, {
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
                    }

                    if (cursorImgEffect && cursorDispFilterRef.current) {
                        gsap.to(cursorDispFilterRef.current.scale, {
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
                    }
                }
            }, idleTimeout);
        };

        // Add event listener
        node.addEventListener('mousemove', handleMouseMove);

        // Cleanup on unmount
        return () => {
            node.removeEventListener('mousemove', handleMouseMove);
            if (idleTimerRef.current !== null) {
                window.clearTimeout(idleTimerRef.current);
            }
        };
    }, [
        sliderRef.current,
        bgDispFilterRef.current,
        cursorDispFilterRef.current,
        cursorImgEffect,
        defaultBgFilterScale,
        defaultCursorFilterScale,
        idleTimeout,
        resourceManager
    ]);
};

export default useIdleTimer;