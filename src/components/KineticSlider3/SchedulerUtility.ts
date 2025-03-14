/**
 * Utility for consistent scheduler integration across the component
 */

import { RenderScheduler, UpdatePriority } from './managers/RenderScheduler';
import { UpdateType } from './managers/UpdateTypes';

/**
 * Creates a scheduler helper with a consistent component ID
 *
 * @param componentId - Base component ID to use
 * @returns Object with utility methods for scheduling updates
 */
export const createSchedulerHelper = (componentId: string) => {
    // Get the scheduler instance
    const scheduler = RenderScheduler.getInstance();

    // Create a unique component ID if not provided
    const id = componentId || `slider-${Math.random().toString(36).substring(2, 9)}`;

    return {
        /**
         * Schedule a visual update with normal priority
         */
        scheduleVisualUpdate: (callback: () => void, suffix?: string) => {
            return scheduler.scheduleTypedUpdate(
                id,
                UpdateType.FILTER_UPDATE,
                callback,
                suffix
            );
        },

        /**
         * Schedule a high-priority mouse response update
         */
        scheduleMouseResponse: (callback: () => void, suffix?: string) => {
            return scheduler.scheduleTypedUpdate(
                id,
                UpdateType.MOUSE_RESPONSE,
                callback,
                suffix
            );
        },

        /**
         * Schedule a critical transition update
         */
        scheduleTransition: (callback: () => void, suffix?: string) => {
            return scheduler.scheduleTypedUpdate(
                id,
                UpdateType.SLIDE_TRANSITION,
                callback,
                suffix
            );
        },

        /**
         * Schedule a displacement effect update
         */
        scheduleDisplacementEffect: (callback: () => void, suffix?: string) => {
            return scheduler.scheduleTypedUpdate(
                id,
                UpdateType.DISPLACEMENT_EFFECT,
                callback,
                suffix
            );
        },

        /**
         * Schedule an immediate update with critical priority
         */
        scheduleImmediate: (callback: () => void) => {
            scheduler.executeImmediate(callback);
        },

        /**
         * Cancel a specific update
         */
        cancelUpdate: (updateType: UpdateType, suffix?: string) => {
            return scheduler.cancelTypedUpdate(id, updateType, suffix);
        },

        /**
         * Clear all updates for this component
         */
        clearAllUpdates: () => {
            Object.values(UpdateType).forEach(type => {
                scheduler.cancelTypedUpdate(id, type as UpdateType);
            });
        },

        /**
         * Get the component ID
         */
        getComponentId: () => id
    };
};

/**
 * Creates a component-level scheduler helper using element ID or generated ID
 *
 * @param element - DOM element to get ID from
 * @returns Scheduler helper object
 */
export const createElementSchedulerHelper = (element: HTMLElement | null) => {
    const elementId = element?.id || `slider-${Math.random().toString(36).substring(2, 9)}`;
    return createSchedulerHelper(elementId);
};

/**
 * Check if frame throttling should be applied based on priority
 *
 * @param frameThrottler - Frame throttler instance
 * @param priority - Update priority
 * @returns True if the frame should be processed
 */
export const shouldProcessFrame = (
    frameThrottler: import('./managers/FrameThrottler').FrameThrottler | null,
    priority: UpdatePriority = UpdatePriority.NORMAL
): boolean => {
    if (!frameThrottler) return true;
    return frameThrottler.shouldProcessFrame(priority);
};