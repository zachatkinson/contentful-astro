/**
 * Helper to handle dynamic imports for the KineticSlider
 */

// Cache for imported modules
const importCache = new Map<string, any>();

/**
 * Load GSAP and related plugins
 */
export const loadGSAP = async () => {
    if (importCache.has('gsap')) {
        return importCache.get('gsap');
    }

    try {
        const gsapModule = await import('gsap');

        // Load and register PixiPlugin
        try {
            const { default: PixiPlugin } = await import('gsap/PixiPlugin');
            gsapModule.gsap.registerPlugin(PixiPlugin);
        } catch (error) {
            console.warn('Failed to load PixiPlugin for GSAP:', error);
        }

        importCache.set('gsap', gsapModule.gsap);
        return gsapModule.gsap;
    } catch (error) {
        console.error('Failed to load GSAP:', error);
        throw error;
    }
};

/**
 * Load PixiJS
 */
export const loadPixi = async () => {
    if (importCache.has('pixi')) {
        return importCache.get('pixi');
    }

    try {
        const pixiModule = await import('pixi.js');
        importCache.set('pixi', pixiModule);
        return pixiModule;
    } catch (error) {
        console.error('Failed to load PixiJS:', error);
        throw error;
    }
};

/**
 * Load Pixi Filters
 */
export const loadPixiFilters = async () => {
    if (importCache.has('pixiFilters')) {
        return importCache.get('pixiFilters');
    }

    try {
        const filtersModule = await import('pixi-filters');
        importCache.set('pixiFilters', filtersModule);
        return filtersModule;
    } catch (error) {
        console.error('Failed to load Pixi Filters:', error);
        throw error;
    }
};

/**
 * Load all required libraries for the KineticSlider
 */
export const loadKineticSliderDependencies = async () => {
    try {
        const [gsap, pixi, pixiFilters] = await Promise.all([
            loadGSAP(),
            loadPixi(),
            loadPixiFilters()
        ]);

        return { gsap, pixi, pixiFilters };
    } catch (error) {
        console.error('Failed to load KineticSlider dependencies:', error);
        throw error;
    }
};

/**
 * Load all hooks for the KineticSlider
 */
export const loadKineticSliderHooks = async () => {
    if (importCache.has('hooks')) {
        return importCache.get('hooks');
    }

    try {
        const hooks = await import('./hooks');
        importCache.set('hooks', hooks);
        return hooks;
    } catch (error) {
        console.error('Failed to load KineticSlider hooks:', error);
        throw error;
    }
};