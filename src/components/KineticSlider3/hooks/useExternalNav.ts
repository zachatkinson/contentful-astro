import { useEffect } from 'react';
import { type NavElement } from '../types';

interface UseExternalNavProps {
    externalNav: boolean;
    navElement: NavElement;
    handleNext: () => void;
    handlePrev: () => void;
}

/**
 * Hook to setup external navigation elements for the slider
 */
const useExternalNav = ({
                            externalNav,
                            navElement,
                            handleNext,
                            handlePrev
                        }: UseExternalNavProps) => {
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        // Skip if external navigation is not enabled
        if (!externalNav) return;

        // Find the navigation elements in the DOM
        const prevNav = document.querySelector(navElement.prev);
        const nextNav = document.querySelector(navElement.next);

        if (!prevNav || !nextNav) {
            console.warn(`KineticSlider: External navigation elements not found. Make sure elements matching selectors "${navElement.prev}" and "${navElement.next}" exist in the DOM.`);
            return;
        }

        // Define event handlers
        const handlePrevClick = (e: Event) => {
            e.preventDefault();
            handlePrev();
        };

        const handleNextClick = (e: Event) => {
            e.preventDefault();
            handleNext();
        };

        // Attach event listeners
        prevNav.addEventListener('click', handlePrevClick);
        nextNav.addEventListener('click', handleNextClick);

        // Cleanup on unmount
        return () => {
            prevNav.removeEventListener('click', handlePrevClick);
            nextNav.removeEventListener('click', handleNextClick);
        };
    }, [externalNav, navElement, handleNext, handlePrev]);
};

export default useExternalNav;