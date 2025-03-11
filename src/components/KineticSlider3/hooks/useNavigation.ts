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

        // Skip if keyboard navigation is disabled
        if (!enableKeyboardNav) return;

        const handleKeyDown = (evt: Event) => {
            const keyEvt = evt as KeyboardEvent;
            switch (keyEvt.key) {
                case 'ArrowLeft':
                    onPrev();
                    break;
                case 'ArrowRight':
                    onNext();
                    break;
            }
        };

        // Add event listener using ResourceManager if available
        if (resourceManager) {
            resourceManager.addEventListener(window, 'keydown', handleKeyDown);
        } else {
            window.addEventListener('keydown', handleKeyDown);
        }

        // Cleanup on unmount
        return () => {
            // Remove event listener if ResourceManager not used
            if (!resourceManager) {
                window.removeEventListener('keydown', handleKeyDown);
            }
            // Note: ResourceManager handles event cleanup when disposed
        };
    }, [onNext, onPrev, enableKeyboardNav, resourceManager]);

    // Listen for custom slide change events
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        const handleSlideChange = (evt: Event) => {
            const customEvent = evt as CustomEvent;
            if (customEvent.detail && typeof customEvent.detail.nextIndex === 'number') {
                onNext();
            }
        };

        // Add custom event listener
        window.addEventListener('slideChange', handleSlideChange);

        // Cleanup on unmount
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