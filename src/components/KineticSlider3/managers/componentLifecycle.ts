/**
 * ComponentLifecycle for KineticSlider
 * Manages component lifecycle events and resource cleanup
 */
import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';
import { type ManagerRefs } from './hooksAdapter';

// Flags to track component state
export interface LifecycleState {
    isMounted: boolean;
    isUnmounting: boolean;
    isVisible: boolean;
    isInteracting: boolean;
    isPaused: boolean;
}

/**
 * Hook to monitor component lifecycle and manage PixiJS resources
 * @param appRef Reference to the PixiJS application
 * @param managers Reference to all managers
 * @returns Lifecycle state and helper functions
 */
export function useComponentLifecycle(
    appRef: React.RefObject<Application | null>,
    managers: ManagerRefs | null
): [LifecycleState, {
    setVisible: (isVisible: boolean) => void,
    setInteracting: (isInteracting: boolean) => void,
    setPaused: (isPaused: boolean) => void,
    pauseRendering: () => void,
    resumeRendering: () => void
}] {
    // Create state ref
    const stateRef = useRef<LifecycleState>({
        isMounted: true,
        isUnmounting: false,
        isVisible: true,
        isInteracting: false,
        isPaused: false
    });

    // Generate stable helper functions
    const setVisible = (isVisible: boolean) => {
        stateRef.current.isVisible = isVisible;

        // Update performance monitor
        if (managers?.performanceMonitor) {
            managers.performanceMonitor.setVisibility(isVisible);
        }

        // Pause/resume rendering
        if (isVisible) {
            resumeRendering();
        } else {
            pauseRendering();
        }
    };

    const setInteracting = (isInteracting: boolean) => {
        stateRef.current.isInteracting = isInteracting;
    };

    const setPaused = (isPaused: boolean) => {
        stateRef.current.isPaused = isPaused;

        if (isPaused) {
            pauseRendering();
        } else if (stateRef.current.isVisible) {
            resumeRendering();
        }
    };

    const pauseRendering = () => {
        if (appRef.current && appRef.current.ticker) {
            appRef.current.ticker.stop();
        }
    };

    const resumeRendering = () => {
        if (appRef.current && appRef.current.ticker) {
            appRef.current.ticker.start();
        }
    };

    // Setup mount/unmount tracking
    useEffect(() => {
        // Component is mounted
        stateRef.current.isMounted = true;
        stateRef.current.isUnmounting = false;

        // Return cleanup function
        return () => {
            // Component is unmounting
            stateRef.current.isMounted = false;
            stateRef.current.isUnmounting = true;

            // Ensure all resources are properly cleaned up
            if (appRef.current) {
                // Stop the ticker to prevent further updates
                appRef.current.ticker.stop();

                // Clean up resources - managers are disposed in their own effect
            }
        };
    }, []);

    // Set up visibility detection
    useEffect(() => {
        if (!appRef.current) return;

        // Use Intersection Observer to detect visibility
        const observerCallback: IntersectionObserverCallback = (entries) => {
            const [entry] = entries;
            setVisible(entry.isIntersecting);
        };

        const observer = new IntersectionObserver(observerCallback, {
            threshold: 0.1 // Consider visible when 10% is in view
        });

        // Find the canvas element
        const canvas = appRef.current.canvas;
        if (canvas && canvas.parentElement) {
            observer.observe(canvas.parentElement);
        }

        return () => {
            observer.disconnect();
        };
    }, [appRef.current]);

    // Add a loop check to enforce proper cleanup
    useEffect(() => {
        // This helps identify if the component doesn't clean up properly
        if (!appRef.current) return;

        // Add a debug message in development mode
        if (import.meta.env.DEV) {
            const checkInterval = setInterval(() => {
                if (stateRef.current.isUnmounting && appRef.current) {
                    console.warn('PixiJS application still exists after component unmount');
                }
            }, 3000);

            return () => {
                clearInterval(checkInterval);
            };
        }
    }, [appRef.current]);

    return [
        stateRef.current,
        { setVisible, setInteracting, setPaused, pauseRendering, resumeRendering }
    ];
}

/**
 * Helper function to fully destroy a PixiJS application
 * @param app PixiJS application instance
 */
export function destroyPixiApplication(app: Application): void {
    if (!app) return;

    try {
        // Stop the ticker
        app.ticker.stop();

        // Remove all children from the stage with recursive destroy
        const stage = app.stage;
        for (let i = stage.children.length - 1; i >= 0; i--) {
            const child = stage.children[i];
            stage.removeChild(child);
            if (child.destroy) {
                child.destroy();
            }
        }

        // Destroy the renderer
        if (app.renderer) {
            app.renderer.destroy(true);
        }

        // Clear the application instance
        app.destroy(true, { children: true, texture: false});

        // Force a garbage collection hint
        if (typeof window !== 'undefined' && (window as any).gc) {
            (window as any).gc();
        }
    } catch (error) {
        console.error('Error destroying PixiJS application:', error);
    }
}