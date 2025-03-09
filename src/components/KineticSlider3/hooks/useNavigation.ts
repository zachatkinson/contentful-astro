import { useEffect } from 'react';
import { useKineticSlider } from '../context/KineticSliderContext';

/**
 * Hook to set up navigation controls for the slider
 */
const useNavigation = () => {
    // Use the KineticSlider context instead of receiving props directly
    const {
        props,
        actions
    } = useKineticSlider();

    // Extract navigation functions and options
    const { enableKeyboardNav = true } = props;
    const { goNext, goPrev } = actions;

    // Set up keyboard navigation
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        if (!enableKeyboardNav) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowLeft':
                    goPrev();
                    break;
                case 'ArrowRight':
                    goNext();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [goNext, goPrev, enableKeyboardNav]);

    // Listen for custom slide change events
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        const handleSlideChange = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail && typeof customEvent.detail.nextIndex === 'number') {
                goNext();
            }
        };

        window.addEventListener('slideChange', handleSlideChange);

        return () => {
            window.removeEventListener('slideChange', handleSlideChange);
        };
    }, [goNext]);

    return {
        goNext,
        goPrev
    };
};

export default useNavigation;