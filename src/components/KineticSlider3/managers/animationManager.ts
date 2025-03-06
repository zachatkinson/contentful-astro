/**
 * AnimationManager for KineticSlider
 * Centralized management of GSAP animations to prevent memory leaks
 */
import { gsap } from 'gsap';

class AnimationManager {
    // Track all active animations
    private activeAnimations = new Set<gsap.core.Tween | gsap.core.Timeline>();
    private moduleAnimations = new Map<string, Set<gsap.core.Tween | gsap.core.Timeline>>();
    private disposed = false;

    /**
     * Track a new animation
     * @param animation GSAP animation to track
     * @param module Optional module name for grouped cleanup
     * @returns The original animation for chaining
     */
    track<T extends gsap.core.Tween | gsap.core.Timeline>(
        animation: T,
        module?: string
    ): T {
        if (this.disposed) {
            console.warn('AnimationManager has been disposed, animation not tracked');
            return animation;
        }

        // Add to global tracking
        this.activeAnimations.add(animation);

        // Add to module tracking if specified
        if (module) {
            if (!this.moduleAnimations.has(module)) {
                this.moduleAnimations.set(module, new Set());
            }
            this.moduleAnimations.get(module)!.add(animation);
        }

        // Set up auto-cleanup when animation completes
        animation.eventCallback('onComplete', () => {
            this.untrack(animation, module);
        });

        return animation;
    }

    /**
     * Stop tracking an animation
     * @param animation GSAP animation to untrack
     * @param module Optional module name for grouped cleanup
     */
    untrack(animation: gsap.core.Tween | gsap.core.Timeline, module?: string): void {
        // Remove from global tracking
        this.activeAnimations.delete(animation);

        // Remove from module tracking if specified
        if (module && this.moduleAnimations.has(module)) {
            this.moduleAnimations.get(module)!.delete(animation);
            // Clean up empty sets
            if (this.moduleAnimations.get(module)!.size === 0) {
                this.moduleAnimations.delete(module);
            }
        }
    }

    /**
     * Kill all animations for a specific module
     * @param module Name of the module to clean up
     */
    killModuleAnimations(module: string): void {
        if (!this.moduleAnimations.has(module)) return;

        const moduleAnims = this.moduleAnimations.get(module)!;
        moduleAnims.forEach(anim => {
            // Kill the animation
            anim.kill();
            // Remove from global tracking
            this.activeAnimations.delete(anim);
        });

        // Clear the module set
        moduleAnims.clear();
        this.moduleAnimations.delete(module);
    }

    /**
     * Create a tracked GSAP tween
     * @param targets Target element(s) to animate
     * @param vars Animation variables
     * @param module Optional module name for grouped cleanup
     * @returns The created and tracked tween
     */
    to(
        targets: gsap.TweenTarget,
        vars: gsap.TweenVars,
        module?: string
    ): gsap.core.Tween {
        const tween = gsap.to(targets, vars);
        return this.track(tween, module);
    }

    /**
     * Create a tracked GSAP timeline
     * @param vars Timeline variables
     * @param module Optional module name for grouped cleanup
     * @returns The created and tracked timeline
     */
    timeline(
        vars?: gsap.TimelineVars,
        module?: string
    ): gsap.core.Timeline {
        const timeline = gsap.timeline(vars);
        return this.track(timeline, module);
    }

    /**
     * Get the count of active animations
     * @param module Optional module name to get count for just that module
     * @returns Number of active animations
     */
    getActiveCount(module?: string): number {
        if (module) {
            return this.moduleAnimations.has(module)
                ? this.moduleAnimations.get(module)!.size
                : 0;
        }
        return this.activeAnimations.size;
    }

    /**
     * Kill all animations and clean up
     */
    dispose(): void {
        if (this.disposed) return;

        // Kill all animations
        this.activeAnimations.forEach(anim => {
            anim.kill();
        });

        // Clear all tracking
        this.activeAnimations.clear();
        this.moduleAnimations.clear();
        this.disposed = true;
    }
}

export default AnimationManager;