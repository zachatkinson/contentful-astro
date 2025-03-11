import { useEffect, useRef } from 'react';
import { type NavElement } from '../types';
import type ResourceManager from "../managers/ResourceManager";

// Define EventCallback type to match ResourceManager's definition
type EventCallback = EventListenerOrEventListenerObject;

// Development environment check
const isDevelopment = import.meta.env?.MODE === 'development';

interface UseExternalNavProps {
    externalNav: boolean;
    navElement: NavElement;
    handleNext: () => void;
    handlePrev: () => void;
    resourceManager?: ResourceManager | null;
}

/**
 * Hook to set up external navigation elements for the slider
 * Optimized with batch event listener registration
 */
const useExternalNav = ({
                            externalNav,
                            navElement,
                            handleNext,
                            handlePrev,
                            resourceManager
                        }: UseExternalNavProps) => {
    // Track found elements to avoid unnecessary DOM queries
    const elementsRef = useRef<{
        prevNav: Element | null;
        nextNav: Element | null;
    }>({ prevNav: null, nextNav: null });

    // Store event handlers to ensure consistent references
    const eventHandlersRef = useRef<{
        prevHandler: (e: Event) => void;
        nextHandler: (e: Event) => void;
    }>({
        prevHandler: (e: Event) => {
            e.preventDefault();
            handlePrev();
        },
        nextHandler: (e: Event) => {
            e.preventDefault();
            handleNext();
        }
    });

    useEffect(() => {
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;

        // Skip if external navigation is not enabled
        if (!externalNav) return;

        // Find the navigation elements in the DOM
        const prevNav = document.querySelector(navElement.prev);
        const nextNav = document.querySelector(navElement.next);

        // Store references to found elements
        elementsRef.current = { prevNav, nextNav };

        // Log warning in development if navigation elements are not found
        if (isDevelopment && (!prevNav || !nextNav)) {
            console.warn(`KineticSlider: External navigation elements not found. Ensure elements matching selectors "${navElement.prev}" and "${navElement.next}" exist in the DOM.`);
            return;
        }

        // Ensure both navigation elements exist before proceeding
        if (!prevNav || !nextNav) return;

        // Get stored event handlers
        const { prevHandler, nextHandler } = eventHandlersRef.current;

        // Batch event listeners if ResourceManager is available
        if (resourceManager) {
            // Create a map of event types to arrays of callbacks for batch registration
            const batchEventListeners = new Map<string, Set<EventListener>>();

            // Add 'click' event type if not already in the map
            if (!batchEventListeners.has('click')) {
                batchEventListeners.set('click', new Set());
            }

            // Get click handlers set
            const clickHandlers = batchEventListeners.get('click')!;

            // Add both handlers
            clickHandlers.add(prevHandler as EventListener);
            clickHandlers.add(nextHandler as EventListener);

            // Prepare event listeners for batch registration
            // ResourceManager expects Map<EventTarget, Map<string, EventCallback[]>>

            // Create listeners for prev button
            const prevListenersMap = new Map<string, EventCallback[]>();
            prevListenersMap.set('click', [prevHandler]);

            // Create listeners for next button
            const nextListenersMap = new Map<string, EventCallback[]>();
            nextListenersMap.set('click', [nextHandler]);

            // Register event listeners in batch operations
            resourceManager.addEventListenerBatch(prevNav, prevListenersMap);
            resourceManager.addEventListenerBatch(nextNav, nextListenersMap);
        } else {
            // Fallback to direct event listeners
            prevNav.addEventListener('click', prevHandler);
            nextNav.addEventListener('click', nextHandler);
        }

        // Cleanup on unmount
        return () => {
            // If ResourceManager was used, it will handle event cleanup
            // If not, manually remove event listeners
            if (!resourceManager) {
                if (prevNav) {
                    prevNav.removeEventListener('click', prevHandler);
                }
                if (nextNav) {
                    nextNav.removeEventListener('click', nextHandler);
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