import { useEffect, useRef, useCallback } from 'react';
import { type NavElement } from '../types';
import type ResourceManager from "../managers/ResourceManager";

interface UseExternalNavProps {
    externalNav: boolean;
    navElement: NavElement;
    handleNext: () => void;
    handlePrev: () => void;
    resourceManager?: ResourceManager | null;
}

/**
 * Hook to setup external navigation elements for the slider
 */
const useExternalNav = ({
                            externalNav,
                            navElement,
                            handleNext,
                            handlePrev,
                            resourceManager
                        }: UseExternalNavProps) => {
    // Track the mounted state
    const isMountedRef = useRef(true);

    // Track found elements to avoid unnecessary DOM queries
    const elementsRef = useRef<{
        prevNav: Element | null;
        nextNav: Element | null;
    }>({ prevNav: null, nextNav: null });

    useEffect(() => {
        // Reset mounted state on each mount
        isMountedRef.current = true;

        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        // Skip if external navigation is not enabled
        if (!externalNav) return;

        // Find the navigation elements in the DOM
        const prevNav = document.querySelector(navElement.prev);
        const nextNav = document.querySelector(navElement.next);

        // Store references to found elements
        elementsRef.current = { prevNav, nextNav };

        if (!prevNav || !nextNav) {
            console.warn(`KineticSlider: External navigation elements not found. Make sure elements matching selectors "${navElement.prev}" and "${navElement.next}" exist in the DOM.`);
            return;
        }

        // Define event handlers with mounted checks
        const handlePrevClick = useCallback((e: Event) => {
            e.preventDefault();
            // Only trigger if component is still mounted
            if (isMountedRef.current) {
                handlePrev();
            }
        }, [handlePrev]);

        const handleNextClick = useCallback((e: Event) => {
            e.preventDefault();
            // Only trigger if component is still mounted
            if (isMountedRef.current) {
                handleNext();
            }
        }, [handleNext]);

        // Use ResourceManager for event listener tracking if available
        if (resourceManager) {
            // Cast to HTMLElement for type safety
            const prevElement = prevNav as HTMLElement;
            const nextElement = nextNav as HTMLElement;

            // Use ResourceManager's addEventListener method
            resourceManager.addEventListener(prevElement, 'click', handlePrevClick);
            resourceManager.addEventListener(nextElement, 'click', handleNextClick);
        } else {
            // Fallback to direct event listeners
            prevNav.addEventListener('click', handlePrevClick);
            nextNav.addEventListener('click', handleNextClick);
        }

        // Cleanup on unmount
        return () => {
            // Mark as unmounted first
            isMountedRef.current = false;

            // If ResourceManager was used, it will handle event cleanup
            // If not, manually remove event listeners
            if (!resourceManager) {
                if (prevNav) {
                    prevNav.removeEventListener('click', handlePrevClick);
                }
                if (nextNav) {
                    nextNav.removeEventListener('click', handleNextClick);
                }
            }
        };
    }, [
        externalNav,
        navElement.prev,
        navElement.next,
        handleNext,
        handlePrev,
        resourceManager
    ]);

    // Return current elements for potential external use
    return {
        elements: elementsRef.current
    };
};

export default useExternalNav;