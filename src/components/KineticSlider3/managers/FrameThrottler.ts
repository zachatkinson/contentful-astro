// src/components/KineticSlider3/managers/FrameThrottler.ts

/**
 * @file FrameThrottler.ts
 * @description Provides advanced frame timing controls to optimize rendering performance.
 * Offers various throttling strategies to consolidate updates and reduce GPU load.
 */

/**
 * Frame throttling strategies that determine how updates are scheduled
 * @enum {string}
 */
export enum ThrottleStrategy {
    /** Fixed frames per second - aims for consistent frame timing */
    FIXED_FPS = 'fixed_fps',

    /** Adaptive - adjusts timing based on device performance */
    ADAPTIVE = 'adaptive',

    /** Priority-based - only throttles lower priority updates */
    PRIORITY = 'priority',

    /** None - no throttling applied (use with caution) */
    NONE = 'none'
}

/**
 * Configuration options for the FrameThrottler
 * @interface
 */
export interface ThrottlerConfig {
    /** Target frames per second (for FIXED_FPS strategy) */
    targetFps?: number;

    /** Minimum acceptable frames per second (for ADAPTIVE strategy) */
    minFps?: number;

    /** Maximum acceptable frames per second (for ADAPTIVE strategy) */
    maxFps?: number;

    /** Selected throttling strategy */
    strategy?: ThrottleStrategy;

    /** Enable performance monitoring and auto-adjustment */
    enableMonitoring?: boolean;
}

/**
 * Default configuration values
 * @type {ThrottlerConfig}
 */
const DEFAULT_CONFIG: ThrottlerConfig = {
    targetFps: 60,
    minFps: 30,
    maxFps: 120,
    strategy: ThrottleStrategy.FIXED_FPS,
    enableMonitoring: true
};

/**
 * Performance data for monitoring and auto-adjustment
 * @interface
 */
interface PerformanceData {
    /** Array of recent frame durations */
    frameTimes: number[];

    /** Current average FPS */
    currentFps: number;

    /** Number of frames processed */
    frameCount: number;

    /** Timestamp of last performance adjustment */
    lastAdjustment: number;

    /** Current throttle interval in milliseconds */
    currentInterval: number;
}

/**
 * Manages frame timing and throttling for optimal performance
 */
export class FrameThrottler {
    /** Active configuration */
    private config: ThrottlerConfig;

    /** Performance monitoring data */
    private performance: PerformanceData;

    /** Timestamp of the last processed frame */
    private lastFrameTime: number = 0;

    /**
     * Create a new FrameThrottler with the specified configuration
     *
     * @param {ThrottlerConfig} [config] - Configuration options
     */
    constructor(config?: Partial<ThrottlerConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };

        // Initialize performance data
        this.performance = {
            frameTimes: [],
            currentFps: this.config.targetFps!,
            frameCount: 0,
            lastAdjustment: performance.now(),
            currentInterval: this.calculateInterval(this.config.targetFps!)
        };

        this.lastFrameTime = performance.now();
    }

    /**
     * Calculate the frame interval in milliseconds from FPS
     *
     * @param {number} fps - Frames per second
     * @returns {number} Interval in milliseconds
     * @private
     */
    private calculateInterval(fps: number): number {
        return 1000 / fps;
    }

    /**
     * Check if enough time has passed to process the next frame
     *
     * @param {number} [priority] - Optional priority level to consider
     * @returns {boolean} True if should process, false if should skip
     */
    public shouldProcessFrame(priority?: number): boolean {
        const now = performance.now();
        const elapsed = now - this.lastFrameTime;

        // Handle different strategies
        switch (this.config.strategy) {
            case ThrottleStrategy.NONE:
                return true;

            case ThrottleStrategy.PRIORITY:
                // High priority updates bypass throttling
                if (priority !== undefined && priority >= 2) {
                    return true;
                }
                // Otherwise use fixed fps throttling
                return elapsed >= this.performance.currentInterval;

            case ThrottleStrategy.ADAPTIVE:
                // Adaptively adjust the interval based on recent performance
                this.updateAdaptivePerformance(now);
                return elapsed >= this.performance.currentInterval;

            case ThrottleStrategy.FIXED_FPS:
            default:
                // Simple fixed interval throttling
                return elapsed >= this.performance.currentInterval;
        }
    }

    /**
     * Mark the current frame as processed and update timing
     */
    public frameProcessed(): void {
        const now = performance.now();
        const frameDuration = now - this.lastFrameTime;
        this.lastFrameTime = now;

        // Update performance metrics
        if (this.config.enableMonitoring) {
            this.updatePerformanceMetrics(frameDuration);
        }
    }

    /**
     * Update performance metrics with the latest frame duration
     *
     * @param {number} frameDuration - Duration of the last frame in ms
     * @private
     */
    private updatePerformanceMetrics(frameDuration: number): void {
        // Add to the frame times array (keep last 60 frames)
        this.performance.frameTimes.push(frameDuration);
        if (this.performance.frameTimes.length > 60) {
            this.performance.frameTimes.shift();
        }

        // Calculate current FPS
        const avgFrameDuration = this.performance.frameTimes.reduce((sum, time) => sum + time, 0) /
            this.performance.frameTimes.length;
        this.performance.currentFps = 1000 / avgFrameDuration;

        // Increment frame count
        this.performance.frameCount++;
    }

    /**
     * Update adaptive performance settings based on recent metrics
     *
     * @param {number} now - Current timestamp
     * @private
     */
    private updateAdaptivePerformance(now: number): void {
        // Only adjust every 1 second
        if (now - this.performance.lastAdjustment < 1000 ||
            this.performance.frameTimes.length < 10) {
            return;
        }

        // Calculate average FPS
        const avgFps = this.performance.currentFps;

        // Adjust based on performance
        let targetFps = this.config.targetFps!;

        if (avgFps < this.config.minFps!) {
            // Performance is too low, reduce target FPS
            targetFps = Math.max(this.config.minFps!, targetFps * 0.8);
        } else if (avgFps > this.config.maxFps!) {
            // Performance is very good, increase target FPS up to max
            targetFps = Math.min(this.config.maxFps!, targetFps * 1.2);
        } else if (avgFps > targetFps * 1.2) {
            // We have headroom, gradually increase target FPS
            targetFps = Math.min(this.config.maxFps!, targetFps * 1.1);
        }

        // Update the interval
        this.performance.currentInterval = this.calculateInterval(targetFps);
        this.performance.lastAdjustment = now;
    }

    /**
     * Set a specific throttling strategy
     *
     * @param {ThrottleStrategy} strategy - The throttling strategy to use
     */
    public setStrategy(strategy: ThrottleStrategy): void {
        this.config.strategy = strategy;
    }

    /**
     * Set a specific target FPS
     *
     * @param {number} fps - Target frames per second
     */
    public setTargetFps(fps: number): void {
        this.config.targetFps = Math.max(1, fps);

        // Update the interval if using fixed FPS
        if (this.config.strategy === ThrottleStrategy.FIXED_FPS) {
            this.performance.currentInterval = this.calculateInterval(this.config.targetFps);
        }
    }

    /**
     * Get current performance metrics
     *
     * @returns {Object} Performance information
     */
    public getPerformanceMetrics(): {
        currentFps: number;
        targetInterval: number;
        frameCount: number;
        strategy: ThrottleStrategy;
    } {
        return {
            currentFps: this.performance.currentFps,
            targetInterval: this.performance.currentInterval,
            frameCount: this.performance.frameCount,
            strategy: this.config.strategy!
        };
    }
}