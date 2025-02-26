import { RGBSplitFilter as PixiRGBSplitFilter } from "pixi-filters";

interface RGBSplitFilterConfig {
    red?: { x: number; y: number };
    green?: { x: number; y: number };
    blue?: { x: number; y: number };
}

const defaultConfig: RGBSplitFilterConfig = {
    red: { x: 0, y: 0 },
    green: { x: 0, y: 0 },
    blue: { x: 0, y: 0 },
};

export function createRGBSplitFilter(config?: RGBSplitFilterConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return new PixiRGBSplitFilter(finalConfig);
}

export default createRGBSplitFilter;