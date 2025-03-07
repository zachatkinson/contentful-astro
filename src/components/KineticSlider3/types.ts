import { Application, Sprite, Container, DisplacementFilter, Filter } from 'pixi.js';
import type TextureManager from "./managers/textureManager.ts";
import type AnimationManager from "./managers/animationManager.ts";
import PerformanceMonitor, { QualityLevel } from "./managers/performanceMonitor.ts";
import type EventManager from "./managers/eventManager.ts";
import type FilterManager from "./managers/filterManager.ts";

export type NavElement = {
    prev: string;
    next: string;
};

export type TextPair = [string, string]; // [title, subtitle]

/**
 * Configuration for filter settings
 */
export interface FilterConfig {
    enabled: boolean;
    intensity: number;
    type: string;
    options?: Record<string, any>;
}

/**
 * Props for the KineticSlider component
 */
export interface KineticSliderProps {
    // Content sources
    images: string[];
    texts: TextPair[];

    // Displacement image sources
    backgroundDisplacementSpriteLocation?: string;
    cursorDisplacementSpriteLocation?: string;

    // Cursor effect settings
    cursorImgEffect?: boolean;
    cursorTextEffect?: boolean;
    cursorScaleIntensity?: number;
    cursorMomentum?: number;

    // Filter configurations
    imageFilters?: FilterConfig | FilterConfig[];
    textFilters?: FilterConfig | FilterConfig[];

    // Text styling props
    textTitleColor?: string;
    textTitleSize?: number;
    mobileTextTitleSize?: number;
    textTitleLetterspacing?: number;
    textTitleFontFamily?: string;
    textSubTitleColor?: string;
    textSubTitleSize?: number;
    mobileTextSubTitleSize?: number;
    textSubTitleLetterspacing?: number;
    textSubTitleOffsetTop?: number;
    mobileTextSubTitleOffsetTop?: number;
    textSubTitleFontFamily?: string;

    // Movement and animation settings
    maxContainerShiftFraction?: number;
    swipeScaleIntensity?: number;
    transitionScaleIntensity?: number;

    // Navigation settings
    externalNav?: boolean;
    navElement?: NavElement;
    buttonMode?: boolean;
}

/**
 * Enhanced Sprite with additional properties
 */
export interface EnhancedSprite extends Sprite {
    baseScale?: number;
}

/**
 * References to core PIXI objects used across hooks
 */
export interface PixiRefs {
    app: React.RefObject<Application | null>;
    slides: React.RefObject<EnhancedSprite[]>;
    textContainers: React.RefObject<Container[]>;
    backgroundDisplacementSprite: React.RefObject<Sprite | null>;
    cursorDisplacementSprite: React.RefObject<Sprite | null>;
    bgDispFilter: React.RefObject<DisplacementFilter | null>;
    cursorDispFilter: React.RefObject<DisplacementFilter | null>;
    currentIndex: React.RefObject<number>;
}


/**
 * Filter application result containing the filter instance
 */
export interface FilterResult {
    filter: Filter | Filter[];
    updateIntensity: (intensity: number) => void;
    reset: () => void;
    dispose?: () => void;

}


export interface ManagedFilter {
    target: Container;
    result: FilterResult;
    config: FilterConfig;
}
/**
 * Shared hook parameters containing refs and props
 */
export interface HookParams {
    sliderRef: React.RefObject<HTMLDivElement | null>;
    pixi: PixiRefs;
    props: KineticSliderProps;
}


/**
 * Combined interface for all managers
 */
export interface ManagerRefs {
    textureManager: TextureManager;
    animationManager: AnimationManager;
    filterManager: FilterManager;
    eventManager: EventManager;
    performanceMonitor: PerformanceMonitor | null;
}

/**
 * Enhanced hook parameters that include managers
 * This extends the base HookParams with managers and quality level
 */
export interface EnhancedHookParams extends HookParams {
    managers: ManagerRefs;
    qualityLevel: QualityLevel;
}

/**
 * Enhanced Sprite with additional properties
 */
export interface EnhancedSprite extends Sprite {
    baseScale?: number;
}

export interface LoadingIndicatorProps {
    message?: string;
}