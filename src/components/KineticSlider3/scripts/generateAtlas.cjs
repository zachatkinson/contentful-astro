/**
 * Texture Atlas Generator for KineticSlider
 *
 * This script generates texture atlases from individual image files.
 * It packages multiple images into a single atlas image and generates
 * a JSON file with the coordinates of each image within the atlas.
 *
 * Usage:
 *   node generateAtlas.cjs [options]
 *
 * Options:
 *   --input, -i      Directory containing images to pack (default: "public/images/slides")
 *   --output, -o     Output directory for atlas files (default: "public/atlas")
 *   --name, -n       Base name for the atlas files (default: "slides-atlas")
 *   --size, -s       Maximum atlas size (default: "4096x4096")
 *   --padding, -p    Padding between images (default: 2)
 *   --pot            Force power-of-two dimensions (default: true)
 *   --help, -h       Show help
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
    .option('input', {
        alias: 'i',
        description: 'Directory containing images to pack',
        type: 'string',
        default: 'public/images/slides'
    })
    .option('output', {
        alias: 'o',
        description: 'Output directory for atlas files',
        type: 'string',
        default: 'public/atlas'
    })
    .option('name', {
        alias: 'n',
        description: 'Base name for the atlas files',
        type: 'string',
        default: 'slides-atlas'
    })
    .option('size', {
        alias: 's',
        description: 'Maximum atlas size',
        type: 'string',
        default: '4096x4096'
    })
    .option('padding', {
        alias: 'p',
        description: 'Padding between images',
        type: 'number',
        default: 2
    })
    .option('pot', {
        description: 'Force power-of-two dimensions',
        type: 'boolean',
        default: true
    })
    .option('trim', {
        description: 'Trim transparent pixels from images',
        type: 'boolean',
        default: false
    })
    .option('verbose', {
        alias: 'v',
        description: 'Show detailed output',
        type: 'boolean',
        default: false
    })
    .help()
    .alias('help', 'h')
    .argv;

// Extract max width and height from size option
const [maxWidth, maxHeight] = argv.size.split('x').map(Number);
console.log(`Using atlas dimensions: ${maxWidth}x${maxHeight}, from input: ${argv.size}`);

// Ensure output directory exists
if (!fs.existsSync(argv.output)) {
    fs.mkdirSync(argv.output, { recursive: true });
    console.log(`Created output directory: ${argv.output}`);
}

/**
 * Get the next power of two greater than or equal to the input value
 */
function nextPowerOfTwo(n) {
    return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * Trim transparent pixels from an image
 * Returns the trimmed image and the trim data
 */
async function trimImage(imagePath) {
    try {
        const img = await loadImage(imagePath);
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');

        // Draw the image
        ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;

        // Find the bounds of the non-transparent pixels
        let left = img.width;
        let right = 0;
        let top = img.height;
        let bottom = 0;

        // Scan the image data
        for (let y = 0; y < img.height; y++) {
            for (let x = 0; x < img.width; x++) {
                const alpha = data[(y * img.width + x) * 4 + 3];
                if (alpha > 0) {
                    left = Math.min(left, x);
                    right = Math.max(right, x);
                    top = Math.min(top, y);
                    bottom = Math.max(bottom, y);
                }
            }
        }

        // Check if the image has any non-transparent pixels
        if (left > right || top > bottom) {
            return {
                trimmed: false,
                image: img,
                trim: {
                    x: 0,
                    y: 0,
                    width: img.width,
                    height: img.height
                }
            };
        }

        // Calculate the dimensions of the trimmed image
        const width = right - left + 1;
        const height = bottom - top + 1;

        // Create a new canvas for the trimmed image
        const trimmedCanvas = createCanvas(width, height);
        const trimmedCtx = trimmedCanvas.getContext('2d');

        // Draw the trimmed image
        trimmedCtx.drawImage(img, left, top, width, height, 0, 0, width, height);

        return {
            trimmed: true,
            image: await loadImage(trimmedCanvas.toBuffer()),
            trim: {
                x: left,
                y: top,
                width,
                height
            },
            originalSize: {
                width: img.width,
                height: img.height
            }
        };
    } catch (error) {
        console.error(`Error trimming image ${imagePath}:`, error);
        // Fall back to loading the original image
        const img = await loadImage(imagePath);
        return {
            trimmed: false,
            image: img,
            trim: {
                x: 0,
                y: 0,
                width: img.width,
                height: img.height
            }
        };
    }
}

/**
 * Find all image files in a directory
 */
function findImageFiles(dir) {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

    try {
        const files = fs.readdirSync(dir);
        return files
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return imageExtensions.includes(ext);
            })
            .map(file => path.join(dir, file));
    } catch (error) {
        console.error('Error reading input directory:', error);
        process.exit(1);
    }
}

/**
 * Pack images into an atlas using a simple bin-packing algorithm
 */
async function packImages(imagePaths) {
    // Load and process all images
    console.log('Loading and processing images...');

    const images = [];
    for (const imagePath of imagePaths) {
        try {
            const filename = path.basename(imagePath);

            // Process the image based on options
            let imgData;
            if (argv.trim) {
                imgData = await trimImage(imagePath);
            } else {
                const img = await loadImage(imagePath);
                imgData = {
                    trimmed: false,
                    image: img,
                    trim: {
                        x: 0,
                        y: 0,
                        width: img.width,
                        height: img.height
                    },
                    originalSize: {
                        width: img.width,
                        height: img.height
                    }
                };
            }

            images.push({
                path: imagePath,
                filename,
                ...imgData
            });

            if (argv.verbose) {
                console.log(`Loaded image: ${filename} (${imgData.image.width}x${imgData.image.height})`);
            }
        } catch (error) {
            console.error(`Error loading image ${imagePath}:`, error);
        }
    }

    // Sort images by height (typically gives better packing)
    images.sort((a, b) => b.image.height - a.image.height);

    // Initialize atlas data
    const atlas = {
        frames: {},
        meta: {
            app: "KineticSlider Atlas Generator",
            version: "1.0.0",
            format: "RGBA8888",
            size: { w: 0, h: 0 },
            scale: 1
        }
    };

    // Calculate initial atlas size based on total area
    let totalArea = 0;
    const maxImgWidth = Math.max(...images.map(img => img.image.width + argv.padding * 2));
    const maxImgHeight = Math.max(...images.map(img => img.image.height + argv.padding * 2));
    const totalImages = images.length;

    for (const img of images) {
        // Add padding to dimensions
        const paddedWidth = img.image.width + argv.padding * 2;
        const paddedHeight = img.image.height + argv.padding * 2;
        totalArea += paddedWidth * paddedHeight;
    }

    // Calculate average aspect ratio to determine optimal atlas shape
    const avgAspectRatio = images.reduce((sum, img) =>
        sum + (img.image.width / img.image.height), 0) / totalImages;

    // Calculate initial atlas size based on image characteristics
    let atlasWidth, atlasHeight;

    if (avgAspectRatio > 2) {
        // For wide/banner images, create a vertically-oriented atlas
        atlasWidth = Math.min(maxWidth, nextPowerOfTwo(maxImgWidth));
        // Calculate how many images we can stack vertically
        const estRows = Math.ceil(totalImages);
        atlasHeight = Math.min(maxHeight, nextPowerOfTwo(estRows * (maxImgHeight + argv.padding)));
    } else {
        // For more square images, use area-based estimation
        atlasWidth = Math.min(maxWidth, Math.ceil(Math.sqrt(totalArea)));
        atlasHeight = Math.min(maxHeight, Math.ceil(Math.sqrt(totalArea)));
    }

    // Ensure dimensions are power-of-two if requested
    if (argv.pot) {
        atlasWidth = nextPowerOfTwo(atlasWidth);
        atlasHeight = nextPowerOfTwo(atlasHeight);
    }

    // Enforce max dimensions set by user
    atlasWidth = Math.min(atlasWidth, maxWidth);
    atlasHeight = Math.min(atlasHeight, maxHeight);

    console.log(`Using atlas dimensions: ${atlasWidth}x${atlasHeight} (average aspect ratio: ${avgAspectRatio.toFixed(2)})`);

    // Initialize the atlas canvas
    const canvas = createCanvas(atlasWidth, atlasHeight);
    const ctx = canvas.getContext('2d');

    // Clear the canvas with transparent pixels
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Perform the actual packing
    console.log(`Packing images into ${atlasWidth}x${atlasHeight} atlas...`);

    // Simple row-based packing algorithm
    let currentX = argv.padding;
    let currentY = argv.padding;
    let rowHeight = 0;

    // Pack each image
    for (const img of images) {
        const width = img.image.width;
        const height = img.image.height;

        // Check if we need to move to the next row
        if (currentX + width + argv.padding > atlasWidth) {
            currentX = argv.padding;
            currentY += rowHeight + argv.padding;
            rowHeight = 0;
        }

        // Check if we've exceeded the atlas height
        if (currentY + height + argv.padding > atlasHeight) {
            console.error('Atlas dimensions too small for all images!');
            break;
        }

        // Store image info in the atlas data
        atlas.frames[img.filename] = {
            frame: {
                x: currentX,
                y: currentY,
                w: width,
                h: height
            },
            rotated: false,
            trimmed: img.trimmed,
            sourceSize: {
                w: img.originalSize ? img.originalSize.width : width,
                h: img.originalSize ? img.originalSize.height : height
            }
        };

        // If the image was trimmed, add the spriteSourceSize info
        if (img.trimmed) {
            atlas.frames[img.filename].spriteSourceSize = {
                x: img.trim.x,
                y: img.trim.y,
                w: img.trim.width,
                h: img.trim.height
            };
        }

        // Draw the image on the atlas
        ctx.drawImage(img.image, currentX, currentY);

        if (argv.verbose) {
            console.log(`Packed ${img.filename} at [${currentX}, ${currentY}]`);
        }

        // Update position and row height
        currentX += width + argv.padding;
        rowHeight = Math.max(rowHeight, height);
    }

    // Update atlas size metadata
    atlas.meta.size = {
        w: atlasWidth,
        h: atlasHeight
    };

    // Set the output image filename
    atlas.meta.image = `${argv.name}.png`;

    return {
        atlas,
        canvas
    };
}

/**
 * Save the atlas image and JSON data
 */
async function saveAtlas(atlas, canvas) {
    const jsonPath = path.join(argv.output, `${argv.name}.json`);
    const imagePath = path.join(argv.output, `${argv.name}.png`);

    // Save JSON data
    fs.writeFileSync(jsonPath, JSON.stringify(atlas, null, 2));
    console.log(`Saved atlas JSON to ${jsonPath}`);

    // Save image
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(imagePath, buffer);
    console.log(`Saved atlas image to ${imagePath}`);
}

/**
 * Main function to generate the atlas
 */
async function generateAtlas() {
    try {
        console.log('Starting atlas generation...');

        // Find image files
        const imagePaths = findImageFiles(argv.input);
        console.log(`Found ${imagePaths.length} images`);

        if (imagePaths.length === 0) {
            console.error('No images found in input directory!');
            process.exit(1);
        }

        // Pack images
        const { atlas, canvas } = await packImages(imagePaths);

        // Save the atlas
        await saveAtlas(atlas, canvas);

        console.log('Atlas generation complete!');
    } catch (error) {
        console.error('Error generating atlas:', error);
        process.exit(1);
    }
}

// Run the generator
generateAtlas();