import { Application, Sprite, Container, DisplacementFilter, Text, Filter } from 'pixi.js';

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

    // Previous RGB effect settings (for backward compatibility)
    imagesRgbEffect?: boolean;
    imagesRgbIntensity?: number;
    textsRgbEffect?: boolean;
    textsRgbIntensity?: number;

    // Text styling props
    textTitleColor?: string;
    textTitleSize?: number;
    mobileTextTitleSize?: number;
    textTitleLetterspacing?: number;
    textSubTitleColor?: string;
    textSubTitleSize?: number;
    mobileTextSubTitleSize?: number;
    textSubTitleLetterspacing?: number;
    textSubTitleOffsetTop?: number;
    mobileTextSubTitleOffsetTop?: number;

    // Movement and animation settings
    maxContainerShiftFraction?: number;
    swipeScaleIntensity?: number;
    transitionScaleIntensity?: number;

    // Navigation settings
    externalNav?: boolean;
    navElement?: NavElement;
    navTextsRgbIntensity?: number;
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
    app: React.MutableRefObject<Application | null>;
    slides: React.MutableRefObject<EnhancedSprite[]>;
    textContainers: React.MutableRefObject<Container[]>;
    backgroundDisplacementSprite: React.MutableRefObject<Sprite | null>;
    cursorDisplacementSprite: React.MutableRefObject<Sprite | null>;
    bgDispFilter: React.MutableRefObject<DisplacementFilter | null>;
    cursorDispFilter: React.MutableRefObject<DisplacementFilter | null>;
    currentIndex: React.MutableRefObject<number>;
}

/**
 * Filter application result containing the filter instance
 */
export interface FilterApplicationResult {
    filter: Filter;
    updateIntensity: (intensity: number) => void;
    reset: () => void;
}

/**
 * Shared hook parameters containing refs and props
 */
export interface HookParams {
    sliderRef: React.RefObject<HTMLDivElement | null>;
    pixi: PixiRefs;
    props: KineticSliderProps;
}