import { useEffect, useRef, useCallback } from 'react';
import ResourceManager from '../managers/ResourceManager';

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

interface UseNavigationProps {
    onNext: () => void;
    onPrev: () => void;
    enableKeyboardNav?: boolean;
    resourceManager?: ResourceManager | null;
}

interface NavigationResult {
    goNext: () => void;
    goPrev: () => void;
}

// Type definition for event callback - to match ResourceManager's expected type
type EventCallback = EventListenerOrEventListenerObject;

/**
 * Hook to set up navigation controls for the slider
 * Fully optimized with:
 * - Batch event listener registration
 * - Comprehensive error handling
 * - Memory leak prevention
 * - Stable handler references
 */
const useNavigation = ({
                           onNext,
                           onPrev,
                           enableKeyboardNav = true,
                           resourceManager
                       }: UseNavigationProps): NavigationResult => {
    // Track component mount state
    const isMountedRef = useRef(true);

    // Define stable handler interface
    interface StableHandlers {
        keyDownHandler: EventCallback;
        slideChangeHandler: EventCallback;
        latestNextFn: (() => void) | null;
        latestPrevFn: (() => void) | null;
    }

    // Create stable event handlers that internally reference the latest callback functions
    const handlersRef = useRef<StableHandlers>({
        keyDownHandler: (event: Event) => {
            try {
                if (!isMountedRef.current || !enableKeyboardNav) return;

                const keyEvent = event as KeyboardEvent;
                const handlers = handlersRef.current;

                // Handle keyboard navigation
                switch (keyEvent.key) {
                    case 'ArrowLeft':
                        if (handlers.latestPrevFn) {
                            handlers.latestPrevFn();
                        }
                        break;
                    case 'ArrowRight':
                        if (handlers.latestNextFn) {
                            handlers.latestNextFn();
                        }
                        break;
                }
            } catch (error) {
                if (isDevelopment) {
                    console.error('Error in keyboard navigation handler:', error);
                }
            }
        },
        slideChangeHandler: (event: Event) => {
            try {
                if (!isMountedRef.current) return;

                const customEvent = event as CustomEvent;
                const handlers = handlersRef.current;

                // Handle custom slide change events
                if (customEvent.detail && typeof customEvent.detail.nextIndex === 'number') {
                    if (handlers.latestNextFn) {
                        handlers.latestNextFn();
                    }
                }
            } catch (error) {
                if (isDevelopment) {
                    console.error('Error in slide change handler:', error);
                }
            }
        },
        latestNextFn: null,
        latestPrevFn: null
    });

    // Keep the latest function references updated
    useEffect(() => {
        handlersRef.current.latestNextFn = onNext;
        handlersRef.current.latestPrevFn = onPrev;
    }, [onNext, onPrev]);

    // Set up keyboard navigation
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        // Skip if keyboard navigation is disabled
        if (!enableKeyboardNav) return;

        // Reset mounted state
        isMountedRef.current = true;

        try {
            const { keyDownHandler } = handlersRef.current;

            // Register event listener with ResourceManager if available
            if (resourceManager) {
                // Setup batch registration
                const listeners = new Map<string, EventCallback[]>();
                listeners.set('keydown', [keyDownHandler]);
                resourceManager.addEventListenerBatch(window, listeners);
            } else {
                // Direct registration
                window.addEventListener('keydown', keyDownHandler);
            }

            // Cleanup on unmount
            return () => {
                // Update mounted state immediately
                isMountedRef.current = false;

                try {
                    // ResourceManager handles its own cleanup
                    if (!resourceManager) {
                        window.removeEventListener('keydown', keyDownHandler);
                    }
                } catch (cleanupError) {
                    if (isDevelopment) {
                        console.error('Error during keyboard navigation cleanup:', cleanupError);
                    }
                }
            };
        } catch (error) {
            if (isDevelopment) {
                console.error('Error setting up keyboard navigation:', error);
            }
            // Return empty cleanup function
            return () => {};
        }
    }, [enableKeyboardNav, resourceManager]);

    // Listen for custom slide change events
    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        try {
            const { slideChangeHandler } = handlersRef.current;

            // Register event listener
            window.addEventListener('slideChange', slideChangeHandler);

            // Cleanup on unmount
            return () => {
                try {
                    window.removeEventListener('slideChange', slideChangeHandler);
                } catch (cleanupError) {
                    if (isDevelopment) {
                        console.error('Error removing slide change event listener:', cleanupError);
                    }
                }
            };
        } catch (error) {
            if (isDevelopment) {
                console.error('Error setting up slide change listener:', error);
            }
            // Return empty cleanup function
            return () => {};
        }
    }, []);

    // Expose memoized navigation methods
    const goNext = useCallback(() => {
        try {
            if (isMountedRef.current && handlersRef.current.latestNextFn) {
                handlersRef.current.latestNextFn();
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('Error in goNext navigation function:', error);
            }
        }
    }, []);

    const goPrev = useCallback(() => {
        try {
            if (isMountedRef.current && handlersRef.current.latestPrevFn) {
                handlersRef.current.latestPrevFn();
            }
        } catch (error) {
            if (isDevelopment) {
                console.error('Error in goPrev navigation function:', error);
            }
        }
    }, []);

    return {
        goNext,
        goPrev
    };
};

export default useNavigation;