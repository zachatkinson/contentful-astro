import { useEffect, useRef } from 'react';
import ResourceManager from '../managers/ResourceManager';

interface UseNavigationProps {
    onNext: () => void;
    onPrev: () => void;
    enableKeyboardNav?: boolean;
    resourceManager?: ResourceManager | null;
}

/**
 * Helper to safely add custom event listeners
 */
const addEventListenerSafe = (
    element: EventTarget,
    eventType: string,
    callback: EventListener,
    resourceManager?: ResourceManager | null
): void => {
    if (resourceManager) {
        // Directly use without type casting
        element.addEventListener(eventType, callback);

        // Manually track for cleanup
        const originalRemoveAllEventListeners = resourceManager.removeAllEventListeners.bind(resourceManager);
        resourceManager.removeAllEventListeners = () => {
            element.removeEventListener(eventType, callback);
            originalRemoveAllEventListeners();
        };
    } else {
        element.addEventListener(eventType, callback);
    }
};

/**
 * Hook to set up navigation controls for the slider
 */
const useNavigation = ({
                           onNext,
                           onPrev,
                           enableKeyboardNav = true,
                           resourceManager
                       }: UseNavigationProps) => {
    // Track the mounted state
    const isMountedRef = useRef(true);

    // Set up keyboard navigation
    useEffect(() => {
        // Reset mounted state on mount
        isMountedRef.current = true;

        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        if (!enableKeyboardNav) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if unmounted
            if (!isMountedRef.current) return;

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

        // Add event listener using ResourceManager if available
        if (resourceManager) {
            resourceManager.addEventListener(window, 'keydown', handleKeyDown);
        } else {
            window.addEventListener('keydown', handleKeyDown);
        }

        // Cleanup on unmount
        return () => {
            // Mark as unmounted first
            isMountedRef.current = false;

            // Remove event listener if ResourceManager not used
            if (!resourceManager) {
                window.removeEventListener('keydown', handleKeyDown);
            }
            // Note: ResourceManager handles event cleanup when disposed
        };
    }, [onNext, onPrev, enableKeyboardNav, resourceManager]);

    // Listen for custom slide change events
    useEffect(() => {
        // Reset mounted state on mount if not already done
        isMountedRef.current = true;

        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        const handleSlideChange = (e: Event) => {
            // Skip if unmounted
            if (!isMountedRef.current) return;

            const customEvent = e as CustomEvent;
            if (customEvent.detail && typeof customEvent.detail.nextIndex === 'number') {
                onNext();
            }
        };

        // Add custom event listener with direct DOM approach
        // This avoids TypeScript issues with custom event types
        window.addEventListener('slideChange', handleSlideChange);

        // Cleanup on unmount
        return () => {
            // Mark as unmounted if not already done
            isMountedRef.current = false;

            // Remove the event listener
            window.removeEventListener('slideChange', handleSlideChange);
        };
    }, [onNext, resourceManager]);

    return {
        goNext: onNext,
        goPrev: onPrev
    };
};

export default useNavigation;