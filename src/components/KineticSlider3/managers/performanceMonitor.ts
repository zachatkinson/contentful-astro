/**
 * PerformanceMonitor for KineticSlider
 * Monitors performance and adjusts quality settings as needed
 */
import { Application } from 'pixi.js';

// Quality level definitions
export enum QualityLevel {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high'
}

// Performance threshold settings
interface PerformanceThresholds {
    fps: {
        low: number;   // FPS below this triggers low quality
        medium: number; // FPS below this triggers medium quality
    };
    memory: {
        low: number;   // Memory usage (MB) above this triggers low quality
        medium: number; // Memory usage (MB) above this triggers medium quality
    };
}

// Quality settings for different levels
interface QualitySettings {
    [QualityLevel.LOW]: {
        filterQuality: number;
        maxFilters: number;
        displacementScale: number;
        animationDetail: number;
    };
    [QualityLevel.MEDIUM]: {
        filterQuality: number;
        maxFilters: number;
        displacementScale: number;
        animationDetail: number;
    };
    [QualityLevel.HIGH]: {
        filterQuality: number;
        maxFilters: number;
        displacementScale: number;
        animationDetail: number;
    };
}

// Performance sample data
interface PerformanceSample {
    fps: number;
    memory: number;
    timestamp: number;
}

// Default thresholds
const DEFAULT_THRESHOLDS: PerformanceThresholds = {
    fps: {
        low: 30,
        medium: 50
    },
    memory: {
        low: 200,  // MB
        medium: 100 // MB
    }
};

// Default quality settings
const DEFAULT_QUALITY_SETTINGS: QualitySettings = {
    [QualityLevel.LOW]: {
        filterQuality: 1,
        maxFilters: 1,
        displacementScale: 5,
        animationDetail: 0.5
    },
    [QualityLevel.MEDIUM]: {
        filterQuality: 2,
        maxFilters: 2,
        displacementScale: 10,
        animationDetail: 0.75
    },
    [QualityLevel.HIGH]: {
        filterQuality: 4,
        maxFilters: 4,
        displacementScale: 20,
        animationDetail: 1.0
    }
};

class PerformanceMonitor {
    private app: Application;
    private samples: PerformanceSample[] = [];
    private sampleCount = 30; // Number of samples to keep
    private sampleInterval = 1000; // Sample every second
    private timerId: number | null = null;
    private thresholds: PerformanceThresholds;
    private qualitySettings: QualitySettings;
    private currentQuality: QualityLevel = QualityLevel.HIGH;
    private qualityChangeCallback: ((quality: QualityLevel) => void) | null = null;
    private autoAdjust: boolean = true;
    private isVisible: boolean = true;
    private disposed: boolean = false;

    /**
     * Create a new performance monitor
     * @param app Pixi application instance
     * @param options Configuration options
     */
    constructor(
        app: Application,
        options: {
            thresholds?: Partial<PerformanceThresholds>;
            qualitySettings?: Partial<QualitySettings>;
            initialQuality?: QualityLevel;
            autoAdjust?: boolean;
            sampleInterval?: number;
            sampleCount?: number;
        } = {}
    ) {
        this.app = app;

        // Merge options with defaults
        this.thresholds = {
            ...DEFAULT_THRESHOLDS,
            ...(options.thresholds || {})
        };

        this.qualitySettings = {
            ...DEFAULT_QUALITY_SETTINGS,
            ...(options.qualitySettings || {})
        };

        this.currentQuality = options.initialQuality || QualityLevel.HIGH;
        this.autoAdjust = options.autoAdjust !== undefined ? options.autoAdjust : true;
        this.sampleInterval = options.sampleInterval || this.sampleInterval;
        this.sampleCount = options.sampleCount || this.sampleCount;
    }

    /**
     * Start monitoring performance
     */
    start(): void {
        if (this.disposed) {
            throw new Error('PerformanceMonitor has been disposed');
        }

        if (this.timerId !== null) {
            this.stop();
        }

        this.timerId = window.setInterval(() => {
            this.sample();
        }, this.sampleInterval);

        // Take an initial sample
        this.sample();
    }

    /**
     * Stop monitoring performance
     */
    stop(): void {
        if (this.timerId !== null) {
            window.clearInterval(this.timerId);
            this.timerId = null;
        }
    }

    /**
     * Take a performance sample
     */
    private sample(): void {
        if (!this.isVisible) return;

        // Get current FPS from Pixi application
        const fps = this.app.ticker.FPS;

        // Get memory usage if available
        const memory = (performance as any).memory?.usedJSHeapSize
            ? (performance as any).memory.usedJSHeapSize / (1024 * 1024) // Convert to MB
            : 0;

        // Create and store the sample
        const sample: PerformanceSample = {
            fps,
            memory,
            timestamp: Date.now()
        };

        this.samples.push(sample);

        // Keep only the last N samples
        if (this.samples.length > this.sampleCount) {
            this.samples.shift();
        }

        // Auto-adjust quality if enabled
        if (this.autoAdjust && this.samples.length >= 5) {
            this.adjustQuality();
        }
    }

    /**
     * Adjust quality based on performance samples
     */
    private adjustQuality(): void {
        // Calculate average FPS and memory usage from recent samples
        const recentSamples = this.samples.slice(-5);
        const avgFps = recentSamples.reduce((sum, sample) => sum + sample.fps, 0) / recentSamples.length;
        const avgMemory = recentSamples.reduce((sum, sample) => sum + sample.memory, 0) / recentSamples.length;

        // Determine appropriate quality level
        let newQuality: QualityLevel;

        if (avgFps < this.thresholds.fps.low || avgMemory > this.thresholds.memory.low) {
            newQuality = QualityLevel.LOW;
        } else if (avgFps < this.thresholds.fps.medium || avgMemory > this.thresholds.memory.medium) {
            newQuality = QualityLevel.MEDIUM;
        } else {
            newQuality = QualityLevel.HIGH;
        }

        // Only update if quality changed
        if (newQuality !== this.currentQuality) {
            console.log(`Adjusting quality from ${this.currentQuality} to ${newQuality} (FPS: ${avgFps.toFixed(1)}, Memory: ${avgMemory.toFixed(1)}MB)`);
            this.setQuality(newQuality);
        }
    }

    /**
     * Set the quality level
     * @param quality New quality level
     */
    setQuality(quality: QualityLevel): void {
        this.currentQuality = quality;

        if (this.qualityChangeCallback) {
            this.qualityChangeCallback(quality);
        }
    }

    /**
     * Get current quality settings
     * @returns Current quality settings object
     */
    getQualitySettings(): any {
        return { ...this.qualitySettings[this.currentQuality] };
    }

    /**
     * Set visibility state to pause/resume monitoring
     * @param visible Whether the component is visible
     */
    setVisibility(visible: boolean): void {
        this.isVisible = visible;
    }

    /**
     * Set callback for quality change events
     * @param callback Function to call when quality changes
     */
    onQualityChange(callback: (quality: QualityLevel) => void): void {
        this.qualityChangeCallback = callback;
    }

    /**
     * Manually force a specific quality level
     * @param quality Quality level to set
     * @param disableAutoAdjust Whether to disable auto-adjustment
     */
    forceQuality(quality: QualityLevel, disableAutoAdjust = true): void {
        if (disableAutoAdjust) {
            this.autoAdjust = false;
        }
        this.setQuality(quality);
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        if (this.disposed) return;

        this.stop();
        this.samples = [];
        this.qualityChangeCallback = null;
        this.disposed = true;
    }
}

export default PerformanceMonitor;