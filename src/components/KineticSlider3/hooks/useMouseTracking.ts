import { useEffect, useRef, type RefObject } from 'react';
import { Sprite } from 'pixi.js';
import { gsap } from 'gsap';
import ResourceManager from '../managers/ResourceManager';

interface UseMouseTrackingProps {
    sliderRef: RefObject<HTMLDivElement | null>;
    backgroundDisplacementSpriteRef: RefObject<Sprite | null>;
    cursorDisplacementSpriteRef: RefObject<Sprite | null>;
    cursorImgEffect: boolean;
    cursorMomentum: number;
    resourceManager?: ResourceManager | null;
}

/**
 * Hook to handle mouse movement tracking for displacement sprites
 */
const useMouseTracking = ({
                              sliderRef,
                              backgroundDisplacementSpriteRef,
                              cursorDisplacementSpriteRef,
                              cursorImgEffect,
                              cursorMomentum,
                              resourceManager
                          }: UseMouseTrackingProps) => {
    // Track mounted state
    const isMountedRef = useRef(true);

    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined' || !sliderRef.current) return;

        const node = sliderRef.current;

        // Explicitly type the event handler to match MouseEvent
        const handleMouseMove = (e: MouseEvent) => {
            // Check if component is still mounted
            if (!isMountedRef.current) return;

            // Update background displacement sprite position
            if (backgroundDisplacementSpriteRef.current) {
                // Create animation and track it with ResourceManager
                const tween = gsap.to(backgroundDisplacementSpriteRef.current, {
                    x: e.clientX,
                    y: e.clientY,
                    duration: cursorMomentum,
                    ease: 'power2.out',
                    onComplete: () => {
                        // Re-track the sprite after position update if still mounted
                        if (resourceManager && backgroundDisplacementSpriteRef.current && isMountedRef.current) {
                            resourceManager.trackDisplayObject(backgroundDisplacementSpriteRef.current);
                        }
                    }
                });

                // Track the animation
                if (resourceManager) {
                    resourceManager.trackAnimation(tween);
                }
            }

            // Update cursor displacement sprite if enabled
            if (cursorImgEffect && cursorDisplacementSpriteRef.current) {
                const tween = gsap.to(cursorDisplacementSpriteRef.current, {
                    x: e.clientX,
                    y: e.clientY,
                    duration: cursorMomentum,
                    ease: 'power2.out',
                    onComplete: () => {
                        // Re-track the sprite after position update if still mounted
                        if (resourceManager && cursorDisplacementSpriteRef.current && isMountedRef.current) {
                            resourceManager.trackDisplayObject(cursorDisplacementSpriteRef.current);
                        }
                    }
                });

                // Track the animation
                if (resourceManager) {
                    resourceManager.trackAnimation(tween);
                }
            }
        };

        // Add event listener through resource manager if available
        if (resourceManager) {
            resourceManager.addEventListener(node, 'mousemove', handleMouseMove);
        } else {
            // Fallback for when resource manager isn't available
            node.addEventListener('mousemove', handleMouseMove);
        }

        // Clean up on unmount
        return () => {
            // Mark component as unmounted first to prevent new operations
            isMountedRef.current = false;

            // Remove event listener if resource manager not used
            if (!resourceManager) {
                node.removeEventListener('mousemove', handleMouseMove);
            }
            // Note: ResourceManager handles event cleanup automatically when disposed
        };
    }, [
        // Ensure we're not rebuilding effect too often by using stable references
        sliderRef,
        backgroundDisplacementSpriteRef,
        cursorDisplacementSpriteRef,
        cursorImgEffect,
        cursorMomentum,
        resourceManager
    ]);
};

export default useMouseTracking;