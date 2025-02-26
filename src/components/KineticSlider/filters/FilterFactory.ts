import { Filter as PixiFilter, ColorMatrixFilter, AlphaFilter, BlurFilter, NoiseFilter, DisplacementFilter, Texture, Sprite, type ColorMatrix } from 'pixi.js';
import * as filters from 'pixi-filters';
import {
    type FilterConfig,
    type FilterResult,
    type FilterType,
    // Filter type interfaces
    type RGBSplitFilterConfig,
    type AdjustmentFilterConfig,
    type AdvancedBloomFilterConfig,
    type AsciiFilterConfig,
    type BackdropBlurFilterConfig,
    type BevelFilterConfig,
    type BloomFilterConfig,
    type BulgePinchFilterConfig,
    type ColorGradientFilterConfig,
    type ColorMapFilterConfig,
    type ColorOverlayFilterConfig,
    type ColorReplaceFilterConfig,
    type ConvolutionFilterConfig,
    type CrossHatchFilterConfig,
    type CRTFilterConfig,
    type DotFilterConfig,
    type DropShadowFilterConfig,
    type EmbossFilterConfig,
    type GlitchFilterConfig,
    type GlowFilterConfig,
    type GodrayFilterConfig,
    type GrayscaleFilterConfig,
    type HslAdjustmentFilterConfig,
    type KawaseBlurFilterConfig,
    type MotionBlurFilterConfig,
    type MultiColorReplaceFilterConfig,
    type OldFilmFilterConfig,
    type OutlineFilterConfig,
    type PixelateFilterConfig,
    type RadialBlurFilterConfig,
    type ReflectionFilterConfig,
    type ShockwaveFilterConfig,
    type SimpleLightmapFilterConfig,
    type SimplexNoiseFilterConfig,
    type TiltShiftFilterConfig,
    type TwistFilterConfig,
    type ZoomBlurFilterConfig,
    // Built-in filter interfaces
    type AlphaFilterConfig,
    type BlurFilterConfig,
    type ColorMatrixFilterConfig,
    type DisplacementFilterConfig,
    type NoiseFilterConfig,
    // Custom filter
    type CustomFilterConfig,
    type ColorMatrixPreset
} from './types';

/**
 * Factory for creating and managing different types of PIXI filters
 */
export class FilterFactory {
    /**
     * Create a filter based on the provided configuration
     *
     * @param config - Configuration for the filter
     * @returns Object containing the filter instance and control functions
     */
    static createFilter(config: FilterConfig): FilterResult {
        if (!config.enabled) {
            throw new Error('Cannot create a disabled filter');
        }

        // Map filter type to creator method
        switch (config.type) {
            // PIXI Filters
            case 'rgb-split': return this.createRGBSplitFilter(config as RGBSplitFilterConfig);
            case 'adjustment': return this.createAdjustmentFilter(config as AdjustmentFilterConfig);
            case 'advanced-bloom': return this.createAdvancedBloomFilter(config as AdvancedBloomFilterConfig);
            case 'ascii': return this.createAsciiFilter(config as AsciiFilterConfig);
            case 'backdrop-blur': return this.createBackdropBlurFilter(config as BackdropBlurFilterConfig);
            case 'bevel': return this.createBevelFilter(config as BevelFilterConfig);
            case 'bloom': return this.createBloomFilter(config as BloomFilterConfig);
            case 'bulge-pinch': return this.createBulgePinchFilter(config as BulgePinchFilterConfig);
            case 'color-gradient': return this.createColorGradientFilter(config as ColorGradientFilterConfig);
            case 'color-map': return this.createColorMapFilter(config as ColorMapFilterConfig);
            case 'color-overlay': return this.createColorOverlayFilter(config as ColorOverlayFilterConfig);
            case 'color-replace': return this.createColorReplaceFilter(config as ColorReplaceFilterConfig);
            case 'convolution': return this.createConvolutionFilter(config as ConvolutionFilterConfig);
            case 'cross-hatch': return this.createCrossHatchFilter(config as CrossHatchFilterConfig);
            case 'crt': return this.createCRTFilter(config as CRTFilterConfig);
            case 'dot': return this.createDotFilter(config as DotFilterConfig);
            case 'drop-shadow': return this.createDropShadowFilter(config as DropShadowFilterConfig);
            case 'emboss': return this.createEmbossFilter(config as EmbossFilterConfig);
            case 'glitch': return this.createGlitchFilter(config as GlitchFilterConfig);
            case 'glow': return this.createGlowFilter(config as GlowFilterConfig);
            case 'godray': return this.createGodrayFilter(config as GodrayFilterConfig);
            case 'grayscale': return this.createGrayscaleFilter(config as GrayscaleFilterConfig);
            case 'hsl-adjustment': return this.createHslAdjustmentFilter(config as HslAdjustmentFilterConfig);
            case 'kawase-blur': return this.createKawaseBlurFilter(config as KawaseBlurFilterConfig);
            case 'motion-blur': return this.createMotionBlurFilter(config as MotionBlurFilterConfig);
            case 'multi-color-replace': return this.createMultiColorReplaceFilter(config as MultiColorReplaceFilterConfig);
            case 'old-film': return this.createOldFilmFilter(config as OldFilmFilterConfig);
            case 'outline': return this.createOutlineFilter(config as OutlineFilterConfig);
            case 'pixelate': return this.createPixelateFilter(config as PixelateFilterConfig);
            case 'radial-blur': return this.createRadialBlurFilter(config as RadialBlurFilterConfig);
            case 'reflection': return this.createReflectionFilter(config as ReflectionFilterConfig);
            case 'shockwave': return this.createShockwaveFilter(config as ShockwaveFilterConfig);
            case 'simple-lightmap': return this.createSimpleLightmapFilter(config as SimpleLightmapFilterConfig);
            case 'simplex-noise': return this.createSimplexNoiseFilter(config as SimplexNoiseFilterConfig);
            case 'tilt-shift': return this.createTiltShiftFilter(config as TiltShiftFilterConfig);
            case 'twist': return this.createTwistFilter(config as TwistFilterConfig);
            case 'zoom-blur': return this.createZoomBlurFilter(config as ZoomBlurFilterConfig);

            // Built-in Filters
            case 'alpha': return this.createAlphaFilter(config as AlphaFilterConfig);
            case 'blur': return this.createBlurFilter(config as BlurFilterConfig);
            case 'color-matrix': return this.createColorMatrixFilter(config as ColorMatrixFilterConfig);
            case 'displacement': return this.createDisplacementFilter(config as DisplacementFilterConfig);
            case 'noise': return this.createNoiseFilter(config as NoiseFilterConfig);

            // Custom Filter
            case 'custom': return this.createCustomFilter(config as CustomFilterConfig);

            default:
                throw new Error(`Unsupported filter type: ${(config as any).type}`);
        }
    }

    // --- PIXI Filters Implementation ---

    /**
     * Create an RGB Split filter
     */
    private static createRGBSplitFilter(config: RGBSplitFilterConfig): FilterResult {
        const filter = new filters.RGBSplitFilter({
            red: config.redOffset || { x: 0, y: 0 },
            green: config.greenOffset || { x: 0, y: 0 },
            blue: config.blueOffset || { x: 0, y: 0 }
        });

        const updateIntensity = (intensity: number): void => {
            filter.red.x = intensity;
            filter.blue.x = -intensity;
            filter.red.y = 0;
            filter.blue.y = 0;
        };

        // Set initial intensity
        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.red.x = 0;
            filter.blue.x = 0;
            filter.red.y = 0;
            filter.blue.y = 0;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create an Adjustment filter
     */
    private static createAdjustmentFilter(config: AdjustmentFilterConfig): FilterResult {
        const filter = new filters.AdjustmentFilter({
            gamma: config.gamma ?? 1,
            saturation: config.saturation ?? 1,
            contrast: config.contrast ?? 1,
            brightness: config.brightness ?? 1,
            red: config.red ?? 1,
            green: config.green ?? 1,
            blue: config.blue ?? 1,
            alpha: config.alpha ?? 1
        });

        // Base intensity maps to saturation and contrast by default
        const updateIntensity = (intensity: number): void => {
            // Map intensity value to saturation and contrast
            // 0 intensity = normal (1.0), higher values increase effect
            const normalizedIntensity = 1 + (intensity / 10);
            filter.saturation = normalizedIntensity;
            filter.contrast = normalizedIntensity;
        };

        // Set initial intensity
        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.gamma = 1;
            filter.saturation = 1;
            filter.contrast = 1;
            filter.brightness = 1;
            filter.red = 1;
            filter.green = 1;
            filter.blue = 1;
            filter.alpha = 1;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create an Advanced Bloom filter
     */
    private static createAdvancedBloomFilter(config: AdvancedBloomFilterConfig): FilterResult {
        const filter = new filters.AdvancedBloomFilter({
            threshold: config.threshold ?? 0.5,
            bloomScale: config.bloomScale ?? 1.0,
            brightness: config.brightness ?? 1.0,
            // Fixed: 'blur' is not a valid property in AdvancedBloomFilterOptions
            // Using individual blur or quality params instead
            quality: config.quality ?? 4
        });

        const updateIntensity = (intensity: number): void => {
            // Map intensity value to bloom parameters
            filter.bloomScale = intensity / 5;
            filter.brightness = 1 + (intensity / 10);
        };

        // Set initial intensity
        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.threshold = 0.5;
            filter.bloomScale = 1.0;
            filter.brightness = 1.0;
            // filter.blur property removed as it doesn't exist
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create an ASCII filter
     */
    private static createAsciiFilter(config: AsciiFilterConfig): FilterResult {
        const filter = new filters.AsciiFilter(config.size ?? 8);

        // AsciiFilter expects a ColorSource (number, string, etc.), not a boolean
        if (typeof config.color !== 'undefined') {
            filter.color = typeof config.color === 'boolean' ? 0xFFFFFF : config.color;
        }

        const updateIntensity = (intensity: number): void => {
            // Map intensity to size (inversely proportional)
            // Higher intensity = smaller size = more detailed ASCII
            const size = Math.max(2, Math.round(16 - intensity));
            filter.size = size;
        };

        // Set initial intensity
        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.size = 8;
            // Reset to default white color
            filter.color = 0xFFFFFF;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Backdrop Blur filter
     */
    private static createBackdropBlurFilter(config: BackdropBlurFilterConfig): FilterResult {
        // Fixed: Using an appropriate constructor approach
        const filter = new filters.BackdropBlurFilter({
            // 'blur' is not a valid property, use quality and strength instead
            quality: config.quality ?? 4
        });

        const updateIntensity = (intensity: number): void => {
            // Access appropriate property instead of 'blur'
            filter.strength = intensity;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.strength = 0;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Bevel filter
     */
    private static createBevelFilter(config: BevelFilterConfig): FilterResult {
        const filter = new filters.BevelFilter({
            rotation: config.rotation ?? 45,
            thickness: config.thickness ?? 2,
            lightColor: config.lightColor ?? 0xffffff,
            shadowColor: config.shadowColor ?? 0x000000,
            lightAlpha: config.lightAlpha ?? 0.7,
            shadowAlpha: config.shadowAlpha ?? 0.7
        });

        const updateIntensity = (intensity: number): void => {
            filter.thickness = intensity / 5;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.thickness = 2;
            filter.lightAlpha = 0.7;
            filter.shadowAlpha = 0.7;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Bloom filter
     */
    private static createBloomFilter(config: BloomFilterConfig): FilterResult {
        // Fixed: Use the direct constructor approach with only the parameters from BloomFilterConfig
        const filter = new filters.BloomFilter(
            config.intensity ?? 8,  // Use as blur/strength
            config.quality ?? 4
        );

        const updateIntensity = (intensity: number): void => {
            // Access appropriate property for this filter
            filter.strength = intensity;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.strength = 0;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Bulge Pinch filter
     */
    private static createBulgePinchFilter(config: BulgePinchFilterConfig): FilterResult {
        const filter = new filters.BulgePinchFilter({
            radius: config.radius ?? 100,
            strength: config.strength ?? 0.5,
            center: config.center ?? [0.5, 0.5]
        });

        const updateIntensity = (intensity: number): void => {
            // Map intensity to strength (-1 to 1 range)
            // Negative values create a pinch effect, positive values a bulge
            filter.strength = (intensity / 10) - 0.5;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.strength = 0;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Color Gradient filter
     */
    private static createColorGradientFilter(config: ColorGradientFilterConfig): FilterResult {
        // Fixed: ColorGradientFilter initializing properly
        const filter = new filters.ColorGradientFilter({
            // Type issue: css should be a string, not a boolean
            css: 'linear-gradient(to right, #000000, #ffffff)',
            alpha: config.alpha ?? 1
        });

        if (config.gradient) {
            // Fixed: Handle gradient assignment without using setGradient
            // @ts-ignore - Assigning gradient property which may exist at runtime
            if (typeof filter.gradient !== 'undefined') {
                // @ts-ignore
                filter.gradient = config.gradient;
            }
        }

        const updateIntensity = (intensity: number): void => {
            filter.alpha = intensity / 10;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.alpha = 1;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Color Map filter
     */
    private static createColorMapFilter(config: ColorMapFilterConfig): FilterResult {
        // This filter requires a texture, so we need a default
        const defaultTexture = Texture.WHITE;

        const filter = new filters.ColorMapFilter(
            config.colorMap ? Texture.from(config.colorMap) : defaultTexture,
            config.nearest ?? false
        );

        const updateIntensity = (intensity: number): void => {
            // ColorMapFilter doesn't have direct intensity parameters
            // We could implement some blend between original and mapped
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            // Reset would require reapplying the original color map
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Color Overlay filter
     */
    private static createColorOverlayFilter(config: ColorOverlayFilterConfig): FilterResult {
        // Fixed: Ensure color is a number for ColorOverlayFilter
        const color = typeof config.color === 'string' ? parseInt(config.color.replace('#', '0x'), 16) : (config.color ?? 0xff0000);

        const filter = new filters.ColorOverlayFilter(
            color,
            config.alpha ?? 0.5
        );

        const updateIntensity = (intensity: number): void => {
            filter.alpha = intensity / 10;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.alpha = 0;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Color Replace filter
     */
    private static createColorReplaceFilter(config: ColorReplaceFilterConfig): FilterResult {
        // Fixed: Ensure colors are numbers for ColorReplaceFilter
        const originalColor = typeof config.originalColor === 'string'
            ? parseInt(config.originalColor.replace('#', '0x'), 16)
            : (config.originalColor ?? 0xff0000);

        const newColor = typeof config.newColor === 'string'
            ? parseInt(config.newColor.replace('#', '0x'), 16)
            : (config.newColor ?? 0x0000ff);

        const filter = new filters.ColorReplaceFilter(
            originalColor,
            newColor,
            config.epsilon ?? 0.4
        );

        const updateIntensity = (intensity: number): void => {
            // Map intensity to epsilon (0.01 to 0.5)
            filter.epsilon = (intensity / 20) + 0.01;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.epsilon = 0.4;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Convolution filter
     */
    private static createConvolutionFilter(config: ConvolutionFilterConfig): FilterResult {
        // Default to a simple edge detection matrix if none provided
        const defaultMatrix = [0, -1, 0, -1, 4, -1, 0, -1, 0];

        const filter = new filters.ConvolutionFilter(
            config.matrix ?? defaultMatrix,
            config.width ?? 3,
            config.height ?? 3
        );

        const updateIntensity = (intensity: number): void => {
            // Convolution doesn't have a direct intensity parameter
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            // Reset would require reapplying the original matrix
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Cross Hatch filter
     */
    private static createCrossHatchFilter(config: CrossHatchFilterConfig): FilterResult {
        const filter = new filters.CrossHatchFilter();

        const updateIntensity = (intensity: number): void => {
            // CrossHatchFilter doesn't have direct intensity parameters
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            // Nothing to reset
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a CRT filter
     */
    private static createCRTFilter(config: CRTFilterConfig): FilterResult {
        const filter = new filters.CRTFilter({
            curvature: config.curvature ?? 1,
            lineWidth: config.lineWidth ?? 1,
            lineContrast: config.lineContrast ?? 0.25,
            noise: config.noise ?? 0.3,
            noiseSize: config.noiseSize ?? 1,
            seed: config.seed ?? Math.random(),
            vignetting: config.vignetting ?? 0.3,
            vignettingAlpha: config.vignettingAlpha ?? 1,
            vignettingBlur: config.vignettingBlur ?? 0.3,
            time: config.time ?? 0
        });

        const updateIntensity = (intensity: number): void => {
            // Map intensity to multiple parameters
            filter.lineWidth = intensity / 10;
            filter.noise = intensity / 30;
            filter.vignetting = intensity / 30;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.lineWidth = 1;
            filter.noise = 0;
            filter.vignetting = 0;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Dot filter
     */
    private static createDotFilter(config: DotFilterConfig): FilterResult {
        const filter = new filters.DotFilter({
            scale: config.scale ?? 1,
            angle: config.angle ?? 5
        });

        const updateIntensity = (intensity: number): void => {
            filter.scale = intensity / 5;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.scale = 1;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Drop Shadow filter
     */
    private static createDropShadowFilter(config: DropShadowFilterConfig): FilterResult {
        // Fixed: DropShadowFilter options structure - removing rotation that doesn't exist
        const filter = new filters.DropShadowFilter({
            alpha: config.alpha ?? 0.5,
            offset: { x: config.distance ?? 5, y: config.distance ?? 5 },
            blur: config.blur ?? 2,
            color: config.color ?? 0x000000,
            quality: config.quality ?? 3,
            pixelSize: config.pixelSize ?? 1
            // Removed rotation as it doesn't exist in DropShadowFilterOptions
        });

        const updateIntensity = (intensity: number): void => {
            // Fixed: Use offset property instead of distance
            filter.offset.x = intensity;
            filter.offset.y = intensity;
            filter.blur = intensity / 2;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            // Fixed: Use offset property
            filter.offset.x = 5;
            filter.offset.y = 5;
            filter.blur = 2;
            filter.alpha = 0.5;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create an Emboss filter
     */
    private static createEmbossFilter(config: EmbossFilterConfig): FilterResult {
        const filter = new filters.EmbossFilter(config.strength ?? 5);

        const updateIntensity = (intensity: number): void => {
            filter.strength = intensity;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.strength = 5;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Glitch filter
     */
    private static createGlitchFilter(config: GlitchFilterConfig): FilterResult {
        const filter = new filters.GlitchFilter({
            slices: config.slices ?? 5,
            offset: config.offset ?? 100,
            direction: config.direction ?? 0,
            fillMode: config.fillMode ?? 0,
            seed: config.seed ?? 0,
            average: config.average ?? false,
            minSize: config.minSize ?? 8,
            sampleSize: config.sampleSize ?? 512
        });

        const updateIntensity = (intensity: number): void => {
            filter.slices = Math.max(2, Math.round(intensity));
            filter.offset = intensity * 10;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.slices = 5;
            filter.offset = 100;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Glow filter
     */
    private static createGlowFilter(config: GlowFilterConfig): FilterResult {
        const filter = new filters.GlowFilter({
            distance: config.distance ?? 10,
            outerStrength: config.outerStrength ?? 4,
            innerStrength: config.innerStrength ?? 0,
            color: config.color ?? 0xffffff,
            quality: config.quality ?? 0.1
        });

        const updateIntensity = (intensity: number): void => {
            filter.outerStrength = intensity / 2;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.outerStrength = 4;
            filter.innerStrength = 0;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Godray filter
     */
    private static createGodrayFilter(config: GodrayFilterConfig): FilterResult {
        const filter = new filters.GodrayFilter({
            angle: config.angle ?? 30,
            gain: config.gain ?? 0.5,
            lacunarity: config.lacunarity ?? 2.5,
            time: config.time ?? 0,
            parallel: config.parallel ?? true,
            center: config.center ?? [0.5, 0.5]
        });

        const updateIntensity = (intensity: number): void => {
            filter.gain = intensity / 10;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.gain = 0.5;
            filter.time = 0;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Grayscale filter
     */
    private static createGrayscaleFilter(config: GrayscaleFilterConfig): FilterResult {
        // Fixed: GrayscaleFilter constructor doesn't take arguments in latest version
        const filter = new filters.GrayscaleFilter();

        // Set initial amount if defined via custom property
        if (typeof config.amount !== 'undefined') {
            // Fixed: Set grayscale via a custom method or property if available
            // Use a custom property to store the amount
            // @ts-ignore - Adding a custom property
            filter._amount = config.amount ?? 1;
        }

        const updateIntensity = (intensity: number): void => {
            // Fixed: Store the intensity value as a custom property
            // @ts-ignore - Updating custom property
            filter._amount = intensity / 10;

            // Update the filter's internal matrix if needed
            // This depends on the specific implementation of GrayscaleFilter
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            // Fixed: Reset custom property
            // @ts-ignore - Resetting custom property
            filter._amount = 0;

            // Reset the filter's internal matrix if needed
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create an HSL Adjustment filter
     */
    private static createHslAdjustmentFilter(config: HslAdjustmentFilterConfig): FilterResult {
        // Fixed: Include the required properties for HslAdjustmentFilterOptions
        const filter = new filters.HslAdjustmentFilter({
            hue: config.hue ?? 0,
            saturation: config.saturation ?? 0,
            lightness: config.lightness ?? 0,
            colorize: false, // Set default value for required property
            alpha: 1.0      // Set default value for required property
        });

        const updateIntensity = (intensity: number): void => {
            // Map intensity to hue rotation (0 to 360)
            filter.hue = (intensity / 10) * 360;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.hue = 0;
            filter.saturation = 0;
            filter.lightness = 0;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Kawase Blur filter
     */
    private static createKawaseBlurFilter(config: KawaseBlurFilterConfig): FilterResult {
        // Fixed: Use the direct constructor approach instead of options object
        const filter = new filters.KawaseBlurFilter(
            config.intensity ?? 4,  // Use as blur strength
            config.quality ?? 3,
            config.clamp ?? false
        );

        const updateIntensity = (intensity: number): void => {
            // Fixed: Access appropriate property
            filter.strength = intensity;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.strength = 0;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Motion Blur filter
     */
    private static createMotionBlurFilter(config: MotionBlurFilterConfig): FilterResult {
        const filter = new filters.MotionBlurFilter([
            config.velocity?.[0] ?? 40,
            config.velocity?.[1] ?? 40
        ], config.kernelSize ?? 5, config.offset ?? 0);

        const updateIntensity = (intensity: number): void => {
            const value = intensity * 4;
            filter.velocity = [value, value];
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.velocity = [0, 0];
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Multi Color Replace filter
     */
    private static createMultiColorReplaceFilter(config: MultiColorReplaceFilterConfig): FilterResult {
        // Fixed: Create replacements in the format expected by MultiColorReplaceFilter
        const defaultReplacements: [number, number][] = [
            [0xff0000, 0x0000ff]
        ];

        let replacements: [number, number][];

        if (config.replacements) {
            // Convert the incoming format to the expected format
            replacements = config.replacements.map(item => {
                const originalColor = typeof item.originalColor === 'string'
                    ? parseInt(item.originalColor.replace('#', '0x'), 16)
                    : item.originalColor as number;

                const newColor = typeof item.newColor === 'string'
                    ? parseInt(item.newColor.replace('#', '0x'), 16)
                    : item.newColor as number;

                return [originalColor, newColor] as [number, number];
            });
        } else {
            replacements = defaultReplacements;
        }

        // Fixed: Create the filter with the correctly formatted replacements array
        const filter = new filters.MultiColorReplaceFilter(replacements);

        // Store the original epsilon values for intensity adjustments
        const epsilonValue = config.replacements?.[0]?.epsilon ?? 0.4;

        const updateIntensity = (intensity: number): void => {
            // Can't directly update epsilon on the replacements array
            // Need to create a new replacement array with updated values
            const updatedReplacements = replacements.map(([original, replacement]) => {
                return [original, replacement] as [number, number];
            });

            // Apply the epsilon directly to the filter if it supports it
            // @ts-ignore - Some versions may support this
            if (typeof filter.epsilon !== 'undefined') {
                // @ts-ignore
                filter.epsilon = intensity / 20;
            }
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            // Create new replacements with the default epsilon
            const resetReplacements = replacements.map(([original, replacement]) => {
                return [original, replacement] as [number, number];
            });

            // Apply them to the filter
            filter.replacements = resetReplacements;

            // Reset epsilon if available
            // @ts-ignore - Some versions may support this
            if (typeof filter.epsilon !== 'undefined') {
                // @ts-ignore
                filter.epsilon = 0.4;
            }
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create an Old Film filter
     */
    private static createOldFilmFilter(config: OldFilmFilterConfig): FilterResult {
        const filter = new filters.OldFilmFilter({
            sepia: config.sepia ?? 0.3,
            noise: config.noise ?? 0.3,
            noiseSize: config.noiseSize ?? 1,
            scratch: config.scratch ?? 0.5,
            scratchDensity: config.scratchDensity ?? 0.3,
            scratchWidth: config.scratchWidth ?? 1,
            vignetting: config.vignetting ?? 0.3,
            vignettingAlpha: config.vignettingAlpha ?? 1,
            vignettingBlur: config.vignettingBlur ?? 0.3
        });

        const updateIntensity = (intensity: number): void => {
            const value = intensity / 10;
            filter.sepia = value;
            filter.noise = value;
            filter.scratch = value;
            filter.vignetting = value;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.sepia = 0;
            filter.noise = 0;
            filter.scratch = 0;
            filter.vignetting = 0;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create an Outline filter
     */
    private static createOutlineFilter(config: OutlineFilterConfig): FilterResult {
        // Fixed: Convert color to number if it's a string
        const color = typeof config.color === 'string'
            ? parseInt(config.color.replace('#', '0x'), 16)
            : (config.color ?? 0x000000);

        const filter = new filters.OutlineFilter(
            config.thickness ?? 1,
            color,
            config.quality ?? 0.1
        );

        const updateIntensity = (intensity: number): void => {
            filter.thickness = intensity / 2;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.thickness = 1;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Pixelate filter
     */
    private static createPixelateFilter(config: PixelateFilterConfig): FilterResult {
        const filter = new filters.PixelateFilter(config.size ?? 10);

        const updateIntensity = (intensity: number): void => {
            // Inverse relationship: higher intensity = smaller pixels
            filter.size = Math.max(1, 20 - intensity);
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.size = 10;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Radial Blur filter
     */
    private static createRadialBlurFilter(config: RadialBlurFilterConfig): FilterResult {
        const filter = new filters.RadialBlurFilter({
            angle: config.angle ?? 10,
            center: config.center ?? [0.5, 0.5],
            radius: config.radius ?? -1
        });

        const updateIntensity = (intensity: number): void => {
            filter.angle = intensity;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.angle = 0;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Reflection filter
     */
    private static createReflectionFilter(config: ReflectionFilterConfig): FilterResult {
        // Fixed: Convert number arrays to Float32Array for Range type
        const filter = new filters.ReflectionFilter({
            mirror: config.mirror ?? true,
            boundary: config.boundary ?? 0.5,
            amplitude: config.amplitude ? new Float32Array(config.amplitude) : new Float32Array([0, 20]),
            waveLength: config.waveLength ? new Float32Array(config.waveLength) : new Float32Array([30, 100]),
            alpha: config.alpha ? new Float32Array(config.alpha) : new Float32Array([1, 1]),
            time: config.time ?? 0
        });

        const updateIntensity = (intensity: number): void => {
            // Fixed: Create a new Float32Array for amplitude
            filter.amplitude = new Float32Array([0, intensity * 2]);
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.amplitude = new Float32Array([0, 0]);
            filter.time = 0;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Shockwave filter
     */
    private static createShockwaveFilter(config: ShockwaveFilterConfig): FilterResult {
        // Fixed: Use proper constructor approach for ShockwaveFilter
        // Convert center array to PointData object
        const centerPoint = config.center ? { x: config.center[0], y: config.center[1] } : { x: 0.5, y: 0.5 };

        const filter = new filters.ShockwaveFilter(centerPoint, {
            amplitude: config.amplitude ?? 30,
            wavelength: config.wavelength ?? 160,
            speed: config.speed ?? 500,
            radius: config.radius ?? -1,
            brightness: config.brightness ?? 1
        }, config.time ?? 0);

        const updateIntensity = (intensity: number): void => {
            filter.amplitude = intensity * 3;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.amplitude = 0;
            filter.time = 0;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Simple Lightmap filter
     */
    private static createSimpleLightmapFilter(config: SimpleLightmapFilterConfig): FilterResult {
        // This filter requires a lightmap texture
        const defaultTexture = Texture.WHITE;

        const filter = new filters.SimpleLightmapFilter(
            config.lightMap ? Texture.from(config.lightMap) : defaultTexture,
            config.scale ?? 0.5,
            config.alpha ?? 1
        );

        const updateIntensity = (intensity: number): void => {
            filter.alpha = intensity / 10;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.alpha = 1;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Simplex Noise filter
     */
    private static createSimplexNoiseFilter(config: SimplexNoiseFilterConfig): FilterResult {
        // Fixed: Use proper constructor approach for SimplexNoiseFilter
        const filter = new filters.SimplexNoiseFilter();

        // Set properties individually after construction
        if (config.seed !== undefined) {
            // @ts-ignore - Accessing property that might not exist in type definition
            filter.seed = config.seed;
        }

        // @ts-ignore - Accessing property that might not exist in type definition
        if (filter.scale !== undefined && config.scale !== undefined) {
            // @ts-ignore
            filter.scale = config.scale;
        }

        const updateIntensity = (intensity: number): void => {
            // @ts-ignore - Accessing property that might not exist in type definition
            if (filter.scale !== undefined) {
                // @ts-ignore
                filter.scale = intensity / 5;
            }
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            // @ts-ignore - Accessing property that might not exist in type definition
            if (filter.scale !== undefined) {
                // @ts-ignore
                filter.scale = 1;
            }

            // @ts-ignore - Accessing property that might not exist in type definition
            if (filter.time !== undefined) {
                // @ts-ignore
                filter.time = 0;
            }
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Tilt Shift filter
     */
    private static createTiltShiftFilter(config: TiltShiftFilterConfig): FilterResult {
        // Fixed: Convert start and end arrays to PointData objects
        const filter = new filters.TiltShiftFilter({
            blur: config.blur ?? 100,
            gradientBlur: config.gradientBlur ?? 600,
            start: config.start ? { x: config.start[0], y: config.start[1] } : { x: 0, y: 0 },
            end: config.end ? { x: config.end[0], y: config.end[1] } : { x: 600, y: 600 }
        });

        const updateIntensity = (intensity: number): void => {
            filter.blur = intensity * 10;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.blur = 0;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Twist filter
     */
    private static createTwistFilter(config: TwistFilterConfig): FilterResult {

        const filter = new filters.TwistFilter({
            radius: config.radius ?? 200,
            angle: config.angle ?? 4,
            padding: config.padding ?? 20,
            offset: config.offset ?? {x: 0, y: 0},
        });

        const updateIntensity = (intensity: number): void => {
            filter.angle = intensity / 2.5;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.angle = 0;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Zoom Blur filter
     */
    private static createZoomBlurFilter(config: ZoomBlurFilterConfig): FilterResult {
        // Fixed: Convert center array to PointData object
        const centerPoint = config.center ? { x: config.center[0], y: config.center[1] } : { x: 0.5, y: 0.5 };

        const filter = new filters.ZoomBlurFilter({
            strength: config.strength ?? 0.1,
            center: centerPoint,
            innerRadius: config.innerRadius ?? 0,
            radius: config.radius ?? -1
        });

        const updateIntensity = (intensity: number): void => {
            filter.strength = intensity / 100;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.strength = 0;
        };

        return { filter, updateIntensity, reset };
    }

    // --- BUILT-IN FILTERS IMPLEMENTATION ---

    /**
     * Create an Alpha filter
     */
    private static createAlphaFilter(config: AlphaFilterConfig): FilterResult {
        // Fixed: Use proper constructor approach
        const filter = new AlphaFilter();

        if (config.alpha !== undefined) {
            filter.alpha = config.alpha;
        }

        const updateIntensity = (intensity: number): void => {
            filter.alpha = intensity / 10;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.alpha = 1;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Blur filter
     */
    private static createBlurFilter(config: BlurFilterConfig): FilterResult {
        const filter = new BlurFilter(
            config.strength ?? 8,
            config.quality ?? 4,
            config.resolution ?? 1,
            config.kernelSize ?? 5
        );

        const updateIntensity = (intensity: number): void => {
            filter.blur = intensity;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.blur = 0;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Color Matrix filter
     */
    private static createColorMatrixFilter(config: ColorMatrixFilterConfig): FilterResult {
        const filter = new ColorMatrixFilter();


        // Apply preset if provided
        if (config.preset) {
            switch (config.preset) {
                case 'contrast':
                    if (config.amount !== undefined) {
                        filter.contrast(config.amount, config.multiply ?? false);
                    }
                    else {
                        filter.contrast(1, false);
                    }
                    break;
                case 'desaturate':
                    filter.desaturate();
                    break;
                case 'kodachrome':
                    // Apply kodachrome effect using matrix
                    const kodachromeMatrix: ColorMatrix = [
                        1.1285582396593525, -0.3967382283601348, -0.03992559172921793, 0, 63.72958762196502,
                        -0.16404339962244616, 1.0835251566291304, -0.05498805115633132, 0, 24.732407896706203,
                        -0.16786010706155763, -0.5603416277695248, 1.6014850761964943, 0, 35.62982807460946,
                        0, 0, 0, 1, 0
                    ] as unknown as ColorMatrix;

                    filter.matrix = kodachromeMatrix;
                    break;
                case 'lsd':
                    // Apply LSD effect using matrix
                    const lsdMatrix: ColorMatrix = [
                        2, -0.4, 0.5, 0, 0,
                        -0.5, 2, -0.4, 0, 0,
                        -0.4, -0.5, 3, 0, 0,
                        0, 0, 0, 1, 0
                    ] as unknown as ColorMatrix;

                    filter.matrix = lsdMatrix;
                    break;
                case 'negative':
                    filter.negative(config.multiply ? config.multiply : true);
                    break;
                case 'polaroid':
                    // Apply polaroid effect - Fixed: Removed second parameter from sepia call
                    filter.saturate(-1, config.multiply ? config.multiply : true);
                    filter.sepia( config.multiply ? config.multiply : true);
                    filter.brightness(1.2,  config.multiply ? config.multiply : true);
                    break;
                case 'predator':
                    // Apply predator thermal vision effect
                    const predatorMatrix: ColorMatrix = [
                        0.5, 0.5, 0.5, 0, 0.5,
                        0.5, 0.5, 0.5, 0, 0.5,
                        0.5, 0.5, 0.5, 0, 0.5,
                        0, 0, 0, 1, 0,
                    ] as unknown as ColorMatrix;

                    filter.matrix = predatorMatrix;
                    break;
                case 'saturate':
                    filter.saturate(config.amount ?? 1);
                    break;
                case 'sepia':
                    filter.sepia(true);
                    break;
                default:
                    // No preset or unknown preset
                    break;
            }
        } else if (config.matrix) {
            // Use custom matrix if provided
            filter.matrix = config.matrix as unknown as ColorMatrix;
        }

        const updateIntensity = (intensity: number): void => {
            // Intensity update depends on the preset
            if (config.preset === 'contrast') {
                filter.contrast(intensity / 5, config.multiply ?? false);
            } else if (config.preset === 'saturate') {
                filter.saturate(intensity / 5);
            } else if (config.preset === 'sepia') {
                filter.sepia(true);
            }
            // Other presets don't have a simple intensity parameter
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.reset();
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Displacement filter
     * Note: This is for standalone use, not the one used for the main displacement effect
     */
    private static createDisplacementFilter(config: DisplacementFilterConfig): FilterResult {
        // This requires a sprite to work properly
        const sprite = new Sprite(Texture.WHITE);
        if (config.displacementSprite) {
            sprite.texture = Texture.from(config.displacementSprite);
        }

        const filter = new DisplacementFilter(sprite);

        if (config.scale) {
            filter.scale.x = config.scale.x;
            filter.scale.y = config.scale.y;
        }

        const updateIntensity = (intensity: number): void => {
            filter.scale.x = intensity;
            filter.scale.y = intensity;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.scale.x = 0;
            filter.scale.y = 0;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a Noise filter
     */
    private static createNoiseFilter(config: NoiseFilterConfig): FilterResult {
        // Create filter with default constructor (no parameters)
        const filter = new NoiseFilter();

        // Set properties after construction
        if (config.noise !== undefined) {
            filter.noise = config.noise;
        }

        if (config.seed !== undefined && 'seed' in filter) {
            // @ts-ignore - Access seed property if it exists
            filter.seed = config.seed;
        }

        const updateIntensity = (intensity: number): void => {
            filter.noise = intensity / 10;
        };

        updateIntensity(config.intensity);

        const reset = (): void => {
            filter.noise = 0;
        };

        return { filter, updateIntensity, reset };
    }

    /**
     * Create a custom filter with user-provided callbacks
     */
    private static createCustomFilter(config: CustomFilterConfig): FilterResult {
        const { filter, updateIntensity: userUpdateIntensity } = config;

        const updateIntensity = (intensity: number): void => {
            userUpdateIntensity(filter, intensity);
        };

        // Initial update
        updateIntensity(config.intensity);

        const reset = (): void => {
            // Reset is not really defined for custom filters
            // but we provide a base implementation
            updateIntensity(0);
        };

        return { filter, updateIntensity, reset };
    }
}