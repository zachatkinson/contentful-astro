import { useEffect } from 'react';
import { useKineticSlider } from '../context/KineticSliderContext';

/**
 * Hook to setup external navigation elements for the slider
 */
const useExternalNav = () => {
    // Use the KineticSlider context instead of receiving props directly
    const {
        props,
        actions
    } = useKineticSlider();

    // Extract navigation options and functions
    const { externalNav = false, navElement = { prev: '', next: '' } } = props;
    const { goNext, goPrev } = actions;

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
            goPrev();
        };

        const handleNextClick = (e: Event) => {
            e.preventDefault();
            goNext();
        };

        // Attach event listeners
        prevNav.addEventListener('click', handlePrevClick);
        nextNav.addEventListener('click', handleNextClick);

        // Cleanup on unmount
        return () => {
            prevNav.removeEventListener('click', handlePrevClick);
            nextNav.removeEventListener('click', handleNextClick);
        };
    }, [externalNav, navElement, goNext, goPrev]);
};

export default useExternalNav;