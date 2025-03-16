/**
 * @file AnimationCoordinator.ts
 * @description Coordinates animations across different hooks to ensure they start and end together.
 * Provides a central service for grouping related animations and managing their lifecycle.
 */

import { gsap } from 'gsap';
import RenderScheduler from './RenderScheduler';
import { UpdateType, UpdatePriority } from './UpdateTypes';
import ResourceManager from './ResourceManager';

// Define TweenTarget type to match GSAP's expected types
type TweenTarget = gsap.TweenTarget;

/**
 * Animation group types for coordinating related animations
 */
export enum AnimationGroupType {
    /** Mouse movement related animations */
    MOUSE_MOVEMENT = 'mouse_movement',

    /** Slide transition animations */
    SLIDE_TRANSITION = 'slide_transition',

    /** Text effects animations */
    TEXT_EFFECTS = 'text_effects',

    /** Filter effect animations */
    FILTER_EFFECTS = 'filter_effects',

    /** Displacement effect animations */
    DISPLACEMENT_EFFECTS = 'displacement_effects',

    /** Idle animations */
    IDLE_EFFECTS = 'idle_effects'
}

/**
 * Interface for animation registration
 */
export interface AnimationRegistration {
    /** The animation tween */
    tween: gsap.core.Tween;

    /** The animation group this belongs to */
    group: AnimationGroupType;

    /** Priority level for this animation */
    priority: UpdatePriority;

    /** Timestamp when the animation was registered */
    timestamp: number;

    /** Whether this animation is critical for the group */
    isCritical: boolean;
}

/**
 * Singleton service to coordinate animations across hooks
 */
export class AnimationCoordinator {
    /** Singleton instance */
    private static instance: AnimationCoordinator;

    /** Map of animation groups */
    private animationGroups: Map<AnimationGroupType, AnimationRegistration[]> = new Map();

    /** Reference to the scheduler */
    private scheduler: RenderScheduler;

    /** Reference to the resource manager */
    private resourceManager: ResourceManager | null = null;

    /** Whether animations are currently being processed */
    private isProcessing: boolean = false;

    /** Timeout ID for batch processing */
    private batchTimeoutId: number | null = null;

    /** Batch processing delay in ms */
    private batchDelay: number = 16; // ~60fps

    /**
     * Get the singleton instance
     */
    public static getInstance(): AnimationCoordinator {
        if (!AnimationCoordinator.instance) {
            AnimationCoordinator.instance = new AnimationCoordinator();
        }
        return AnimationCoordinator.instance;
    }

    /**
     * Private constructor for singleton pattern
     */
    private constructor() {
        this.scheduler = RenderScheduler.getInstance();

        // Initialize empty groups for all animation types
        Object.values(AnimationGroupType).forEach(groupType => {
            this.animationGroups.set(groupType as AnimationGroupType, []);
        });
    }

    /**
     * Set the resource manager reference
     */
    public setResourceManager(resourceManager: ResourceManager): void {
        this.resourceManager = resourceManager;
    }

    /**
     * Register an animation with a specific group
     */
    public registerAnimation(
        tween: gsap.core.Tween,
        group: AnimationGroupType,
        priority: UpdatePriority = UpdatePriority.NORMAL,
        isCritical: boolean = false
    ): void {
        const animations = this.animationGroups.get(group) || [];

        animations.push({
            tween,
            group,
            priority,
            timestamp: performance.now(),
            isCritical
        });

        this.animationGroups.set(group, animations);

        // Track the animation with resource manager if available
        if (this.resourceManager) {
            this.resourceManager.trackAnimation(tween);
        }

        // Start batch processing if not already running
        this.startBatchProcessing();
    }

    /**
     * Create and register a GSAP animation
     * @param target - The target object to animate (must be compatible with GSAP's TweenTarget)
     * @param props - The animation properties
     * @param group - The animation group this belongs to
     * @param priority - The priority level for this animation
     * @param isCritical - Whether this animation is critical for the group
     * @returns The created GSAP tween
     */
    public createAnimation(
        target: TweenTarget,
        props: gsap.TweenVars,
        group: AnimationGroupType,
        priority: UpdatePriority = UpdatePriority.NORMAL,
        isCritical: boolean = false
    ): gsap.core.Tween {
        const tween = gsap.to(target, props);
        this.registerAnimation(tween, group, priority, isCritical);
        return tween;
    }

    /**
     * Start batch processing of animations
     */
    private startBatchProcessing(): void {
        if (this.isProcessing || this.batchTimeoutId !== null) return;

        this.batchTimeoutId = window.setTimeout(() => {
            this.batchTimeoutId = null;
            this.processBatch();
        }, this.batchDelay);
    }

    /**
     * Process a batch of animations
     */
    private processBatch(): void {
        this.isProcessing = true;

        try {
            // Process each animation group
            this.animationGroups.forEach((animations, group) => {
                if (animations.length === 0) return;

                // Determine the highest priority in this group
                const highestPriority = Math.max(...animations.map(a => a.priority));

                // Schedule the group execution based on highest priority
                this.scheduler.scheduleUpdate(
                    `animation-group-${group}`,
                    () => this.executeAnimationGroup(group),
                    highestPriority
                );
            });
        } catch (error) {
            console.error('Error processing animation batch:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Execute all animations in a group
     */
    private executeAnimationGroup(group: AnimationGroupType): void {
        const animations = this.animationGroups.get(group) || [];
        if (animations.length === 0) return;

        // Execute all animations in the group
        animations.forEach(animation => {
            // Ensure the tween is properly started
            if (!animation.tween.isActive()) {
                animation.tween.play();
            }
        });

        // Clear the group
        this.animationGroups.set(group, []);
    }

    /**
     * Kill all animations in a specific group
     */
    public killAnimationGroup(group: AnimationGroupType): void {
        const animations = this.animationGroups.get(group) || [];

        // Kill all tweens
        animations.forEach(animation => {
            if (animation.tween.isActive()) {
                animation.tween.kill();
            }
        });

        // Clear the group
        this.animationGroups.set(group, []);
    }

    /**
     * Kill all animations
     */
    public killAllAnimations(): void {
        Object.values(AnimationGroupType).forEach(group => {
            this.killAnimationGroup(group as AnimationGroupType);
        });
    }

    /**
     * Map UpdateType to AnimationGroupType
     */
    public static mapUpdateTypeToAnimationGroup(updateType: UpdateType): AnimationGroupType {
        switch (updateType) {
            case UpdateType.MOUSE_RESPONSE:
                return AnimationGroupType.MOUSE_MOVEMENT;

            case UpdateType.SLIDE_TRANSITION:
            case UpdateType.SLIDE_TRANSFORM:
                return AnimationGroupType.SLIDE_TRANSITION;

            case UpdateType.TEXT_POSITION:
                return AnimationGroupType.TEXT_EFFECTS;

            case UpdateType.FILTER_UPDATE:
                return AnimationGroupType.FILTER_EFFECTS;

            case UpdateType.DISPLACEMENT_EFFECT:
                return AnimationGroupType.DISPLACEMENT_EFFECTS;

            case UpdateType.IDLE_EFFECT:
                return AnimationGroupType.IDLE_EFFECTS;

            default:
                return AnimationGroupType.MOUSE_MOVEMENT;
        }
    }
}

export default AnimationCoordinator;