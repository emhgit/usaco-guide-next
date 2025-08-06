import fs from 'fs/promises';
import { mkdir } from 'fs/promises';
import sharp from 'sharp';
import path from 'path';
import generateRandomId from '../utils/generateRandomId';

// Types
export interface ImageMetadata {
    width: number;
    height: number;
    hasAlpha: boolean;
}

export interface ProcessedImage {
    base64: string;
    imageMetadata: ImageMetadata;
    src: string;
}

export interface OptimizeImageOptions {
    maxWidth?: number;
    quality?: number;
}

// Default options
const DEFAULT_OPTIONS: Required<OptimizeImageOptions> = {
    maxWidth: 1200,
    quality: 80,
};

export default async function processImage(
    imagePath: string,
    options: OptimizeImageOptions = {}
): Promise<ProcessedImage> {
    const { maxWidth, quality } = { ...DEFAULT_OPTIONS, ...options };
    let buffer: Buffer;
    let external = false;
    try {
        if (imagePath.startsWith('http')) {
            external = true;
            const response = await fetch(imagePath);
            if (!response.ok) {
                // Return a fallback response instead of throwing an error
                console.warn(`Failed to fetch image (${response.status}): ${imagePath}`);
                return {
                    base64: '',
                    imageMetadata: { width: 0, height: 0, hasAlpha: false },
                    src: ''
                };
            }
            buffer = Buffer.from(await response.arrayBuffer());
        } else {
            try {
                await fs.access(imagePath);
                buffer = await fs.readFile(imagePath);
            } catch (error) {
                throw new Error(`Image not found at path: ${imagePath}`);
            }
        }

        // Process image and get metadata in one pass
        const processed = await optimizeImage(buffer, { maxWidth, quality });
        const publicUrl = external ? imagePath : await saveOptimizedImage(processed.buffer, generateRandomId() + '.webp');
        const image: ProcessedImage = {
            base64: processed.src,
            imageMetadata: processed.imageMetadata,
            src: publicUrl
        };
        return image;
    } catch (error) {
        console.error('Error processing image:', error);
        throw error;
    }
}

export async function optimizeImage(
    input: Buffer,
    options: OptimizeImageOptions = {}
): Promise<{ buffer: Buffer; src: string; imageMetadata: ImageMetadata }> {
    const { maxWidth, quality } = { ...DEFAULT_OPTIONS, ...options };

    try {
        let sharpInstance = typeof input === 'string'
            ? sharp(input)
            : sharp(input);

        const metadata = await sharpInstance.metadata();
        const buffer = await sharpInstance
            .resize({ width: maxWidth, withoutEnlargement: true })
            .webp({ quality, alphaQuality: quality })
            .toBuffer();

        return {
            buffer,
            src: `data:image/webp;base64,${buffer.toString('base64')}`,
            imageMetadata: {
                width: metadata.width || 0,
                height: metadata.height || 0,
                hasAlpha: metadata.hasAlpha || false,
            },
        };
    } catch (error) {
        console.error('Error optimizing image:', error);
        throw error;
    }
}

export async function saveOptimizedImage(
    input: Buffer,
    outputPath: string,
): Promise<string> {
    try {
        const publicPath = path.join(process.cwd(), 'public');
        const fullOutputPath = path.join(publicPath, 'images', outputPath);
        const outputDir = path.dirname(fullOutputPath);

        // Create directory if it doesn't exist
        await mkdir(outputDir, { recursive: true });

        // Save the file
        await fs.writeFile(fullOutputPath, input);

        // Return the public URL path
        return `/${outputPath}`;
    } catch (error) {
        console.error('Error saving optimized image:', error);
        throw error;
    }
}