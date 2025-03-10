import { useEffect } from 'react';
import ResourceManager from '../managers/ResourceManager';

interface UseNavigationProps {
    onNext: () => void;
    onPrev: () => void;
    enableKeyboardNav?: boolean;
    resourceManager?: ResourceManager | null;
}

/**
 * Hook to set up navigation controls for the slider
 */
const useNavigation = ({
                           onNext,
                           onPrev,
                           enableKeyboardNav = true,
                           resourceManager
                       }: UseNavigationProps) => {
    // Set up keyboard navigation
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        if (!enableKeyboardNav) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowLeft':
                    onPrev();
                    break;
                case 'ArrowRight':
                    onNext();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onNext, onPrev, enableKeyboardNav, resourceManager]);

    // Listen for custom slide change events
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        const handleSlideChange = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail && typeof customEvent.detail.nextIndex === 'number') {
                onNext();
            }
        };

        window.addEventListener('slideChange', handleSlideChange);

        return () => {
            window.removeEventListener('slideChange', handleSlideChange);
        };
    }, [onNext, resourceManager]);

    return {
        goNext: onNext,
        goPrev: onPrev
    };
};

export default useNavigation;