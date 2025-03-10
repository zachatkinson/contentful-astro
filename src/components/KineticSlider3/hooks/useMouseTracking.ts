import { useEffect, type RefObject } from 'react';
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
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined' || !sliderRef.current) return;

        const node = sliderRef.current;

        const handleMouseMove = (e: MouseEvent) => {
            // Update background displacement sprite position
            if (backgroundDisplacementSpriteRef.current) {
                gsap.to(backgroundDisplacementSpriteRef.current, {
                    x: e.clientX,
                    y: e.clientY,
                    duration: cursorMomentum,
                    ease: 'power2.out',
                    onComplete: () => {
                        // Re-track the sprite after position update
                        if (resourceManager && backgroundDisplacementSpriteRef.current) {
                            resourceManager.trackDisplayObject(backgroundDisplacementSpriteRef.current);
                        }
                    }
                });
            }

            // Update cursor displacement sprite if enabled
            if (cursorImgEffect && cursorDisplacementSpriteRef.current) {
                gsap.to(cursorDisplacementSpriteRef.current, {
                    x: e.clientX,
                    y: e.clientY,
                    duration: cursorMomentum,
                    ease: 'power2.out',
                    onComplete: () => {
                        // Re-track the sprite after position update
                        if (resourceManager && cursorDisplacementSpriteRef.current) {
                            resourceManager.trackDisplayObject(cursorDisplacementSpriteRef.current);
                        }
                    }
                });
            }
        };

        // Add event listener
        node.addEventListener('mousemove', handleMouseMove);

        // Cleanup on unmount
        return () => {
            node.removeEventListener('mousemove', handleMouseMove);
        };
    }, [
        sliderRef.current,
        backgroundDisplacementSpriteRef.current,
        cursorDisplacementSpriteRef.current,
        cursorImgEffect,
        cursorMomentum,
        resourceManager  // Added resourceManager to the dependencies
    ]);
};

export default useMouseTracking;