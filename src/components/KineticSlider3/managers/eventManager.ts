/**
 * EventManager for KineticSlider
 * Centralized management of event listeners to prevent memory leaks
 */

type EventHandler = (event: Event) => void;

interface RegisteredEvent {
    target: EventTarget;
    type: string;
    handler: EventHandler;
    options?: boolean | AddEventListenerOptions;
}

class EventManager {
    // Track all registered events
    private events: RegisteredEvent[] = [];
    private disposed = false;

    /**
     * Register and attach an event listener
     * @param target DOM element or object to attach event to
     * @param type Event type (e.g., 'click', 'mousemove')
     * @param handler Event handler function
     * @param options Optional event listener options
     * @returns Function to remove just this event listener
     */
    on<T extends EventTarget>(
        target: T,
        type: string,
        handler: EventHandler,
        options?: boolean | AddEventListenerOptions
    ): () => void {
        if (this.disposed) {
            console.warn('EventManager has been disposed, event not registered');
            // Return no-op function
            return () => {};
        }

        // Register and attach the event
        target.addEventListener(type, handler, options);

        // Store in our tracking array
        const eventRecord: RegisteredEvent = {
            target,
            type,
            handler,
            options
        };

        this.events.push(eventRecord);

        // Return a function to remove just this event
        return () => this.off(target, type, handler);
    }

    /**
     * Remove a specific event listener
     * @param target DOM element or object with the event
     * @param type Event type
     * @param handler Event handler to remove
     */
    off<T extends EventTarget>(target: T, type: string, handler: EventHandler): void {
        // Find the event in our tracking array
        const index = this.events.findIndex(event =>
            event.target === target &&
            event.type === type &&
            event.handler === handler
        );

        if (index !== -1) {
            // Remove the event listener
            const event = this.events[index];
            event.target.removeEventListener(event.type, event.handler, event.options);

            // Remove from tracking array
            this.events.splice(index, 1);
        }
    }

    /**
     * Remove all event listeners for a specific target
     * @param target DOM element or object to clear events from
     */
    clearTarget<T extends EventTarget>(target: T): void {
        // Find all events for this target
        const targetEvents = this.events.filter(event => event.target === target);

        // Remove each event
        targetEvents.forEach(event => {
            event.target.removeEventListener(event.type, event.handler, event.options);
        });

        // Remove all these events from tracking array
        this.events = this.events.filter(event => event.target !== target);
    }

    /**
     * Remove all events of a specific type
     * @param type Event type to remove
     */
    clearEventType(type: string): void {
        // Find all events of this type
        const typeEvents = this.events.filter(event => event.type === type);

        // Remove each event
        typeEvents.forEach(event => {
            event.target.removeEventListener(event.type, event.handler, event.options);
        });

        // Remove all these events from tracking array
        this.events = this.events.filter(event => event.type !== type);
    }

    /**
     * Get count of registered events
     * @returns Number of registered events
     */
    getEventCount(): number {
        return this.events.length;
    }

    /**
     * Remove all event listeners and clean up
     */
    dispose(): void {
        if (this.disposed) return;

        // Remove all event listeners
        this.events.forEach(event => {
            try {
                event.target.removeEventListener(event.type, event.handler, event.options);
            } catch (error) {
                console.warn(`Error removing event listener: ${error}`);
            }
        });

        // Clear tracking array
        this.events = [];
        this.disposed = true;
    }
}

export default EventManager;