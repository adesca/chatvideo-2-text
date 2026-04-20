import {frameSliceCache} from "./store.ts";
import {ImageRows} from "./ImageUtility.ts";

export let lastDownscaledData: Uint8ClampedArray | null = null
export let lastDownscaledImage: ImageData | null = null
export const downscaledCanvas = document.createElement("canvas")
const downscaledCtx = downscaledCanvas.getContext("2d")!
export const stitchCanvas = document.createElement("canvas")
export const stitchCtx = stitchCanvas.getContext("2d")!
export const fullCanvas = document.createElement("canvas")
const fullCtx = fullCanvas.getContext("2d")!

function extractFrames(video: HTMLVideoElement) {
    fullCtx.drawImage(
        video,
        0, 0, video.videoWidth, video.videoHeight,  // source (true pixels)
        0, 0, fullCanvas.width, fullCanvas.height   // destination
    )
    downscaledCtx.drawImage(video, 0, 0, downscaledCanvas.width, downscaledCanvas.height)

    return {
        fullImage: fullCanvas, // for stitching
        downscaled: downscaledCtx.getImageData(0, 0, downscaledCanvas.width, downscaledCanvas.height)
    }
}

function shouldCaptureFrame(
    current: ImageData,
    prevData: Uint8ClampedArray | null,
    threshold = 10
) {
    if (!prevData) return true

    const diff = computeTextAwareDiff(
        current.data,
        prevData,
        current.width,
        current.height,
        4
    )

    return diff >= threshold
}

function getNearestYWithoutText(inputY: number, imageData: ImageData, options: {areaToCheckHeight: number} = {areaToCheckHeight: 10}): number {
    const rows = new ImageRows(imageData);
    return rows.findNearestLowRowUp(inputY, 20)
}

function computeNewRegion(
    prev: ImageData,
    curr: ImageData,
    fullHeight: number,
    downscaledHeight: number
) {
    const {matchY} = findOverlapBand(prev, curr)
    const bandHeight = 20
    const finalY = getNearestYWithoutText(matchY + bandHeight, curr)

    const scale = fullHeight / downscaledHeight

    return Math.floor(finalY * scale)
}

function appendToStitch(
    sourceCanvas: HTMLCanvasElement,
    newContentStart: number,
    timestamp: number
) {
    const sliceHeight = sourceCanvas.height - newContentStart

    if (sliceHeight <= 0) return

    const stitchY = stitchCanvas.height

    // preserve existing content
    const temp = document.createElement("canvas")
    temp.width = stitchCanvas.width
    temp.height = stitchCanvas.height
    temp.getContext("2d")!.drawImage(stitchCanvas, 0, 0)

    // resize (this clears canvas)
    stitchCanvas.height = stitchCanvas.height + sliceHeight
    stitchCtx.drawImage(temp, 0, 0)



    const toStitchCanvas = document.createElement('canvas');
    toStitchCanvas.width = sourceCanvas.width;
    toStitchCanvas.height = sliceHeight;
    const toStitchCtx = toStitchCanvas.getContext('2d')!;
    toStitchCtx.drawImage(sourceCanvas,
        0, newContentStart,
        sourceCanvas.width, sliceHeight,
        0, 0,
        sourceCanvas.width, sliceHeight);
    canvasToBlob(toStitchCanvas, timestamp).then(blob => {

        frameSliceCache.set(timestamp, {blob, url: URL.createObjectURL(blob)})
    })



    // append new slice
    stitchCtx.drawImage(
        sourceCanvas,
        0, newContentStart,
        sourceCanvas.width, sliceHeight,
        0, stitchY,
        sourceCanvas.width, sliceHeight
    )
}

export async function captureFrame(video: HTMLVideoElement, timestamp: number) {
    const {fullImage, downscaled} = extractFrames(video)

    if (isProbablyBlank(downscaled)) return undefined

    // --- first frame ---
    if (!lastDownscaledData) {
        stitchCanvas.width = fullImage.width
        stitchCanvas.height = fullImage.height
        stitchCtx.drawImage(fullImage, 0, 0)

        lastDownscaledData = downscaled.data.slice()
        lastDownscaledImage = downscaled

        return await canvasToBlob(fullImage, timestamp)
    }

    // --- diff heuristic ---
    if (!shouldCaptureFrame(downscaled, lastDownscaledData)) {
        return undefined
    }

    // --- overlap detection ---
    const newContentStart = computeNewRegion(
        lastDownscaledImage!,
        downscaled,
        fullImage.height,
        downscaled.height
    )

    // --- stitching ---
    appendToStitch(fullImage, newContentStart, timestamp)

    // --- update state ---
    lastDownscaledData = downscaled.data.slice()
    lastDownscaledImage = downscaled

    // --- return blob for OCR ---
    return await canvasToBlob(fullImage, timestamp)
}

function canvasToBlob(
    sourceCanvas: HTMLCanvasElement,
    timestamp: number
): Promise<Blob> {
    console.log('canvas to blob')
    return new Promise((resolve, reject) => {
        sourceCanvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error(`Canvas @ ${timestamp} could not be converted to blob`))
                return
            }
            resolve(blob)
        })
    })
}

function isProbablyBlank(imageData: ImageData) {
    const data = imageData.data;
    let maxPixel = 0;
    let nonBlackCount = 0;

    const threshold = 10; // what counts as "non-black"
    const totalPixels = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // track max channel value
        if (r > maxPixel) maxPixel = r;
        if (g > maxPixel) maxPixel = g;
        if (b > maxPixel) maxPixel = b;

        // count non-black pixels
        if (r >= threshold || g >= threshold || b >= threshold) {
            nonBlackCount++;
        }
    }

    const nonBlackRatio = nonBlackCount / totalPixels;

    return maxPixel < 10 && nonBlackRatio < 0.005;
}

type OverlapResult = {
    matchY: number
    score: number
}

/**
 * Find vertical overlap between two ImageData objects
 */
export function findOverlapBand(
    oldImg: ImageData,
    newImg: ImageData,
    options?: {
        bandHeight?: number
        sampleStep?: number   // skip pixels for speed (e.g. 2 or 4)
    }
): OverlapResult {
    const {bandHeight = 20, sampleStep = 2} = options || {}

    const width = oldImg.width
    const oldData = oldImg.data
    const newData = newImg.data

    const oldHeight = oldImg.height
    const newHeight = newImg.height

    if (width !== newImg.width) {
        throw new Error("Images must have same width")
    }

    // --- 1. Extract band from bottom of old image ---
    const bandStartY = oldHeight - bandHeight

    let bestScore = Infinity
    let bestY = 0

    // --- 2. Slide over new image ---
    for (let y = 0; y <= newHeight - bandHeight; y++) {
        let diffSum = 0
        let count = 0

        for (let by = 0; by < bandHeight; by++) {
            const oldRow = (bandStartY + by) * width * 4
            const newRow = (y + by) * width * 4

            for (let x = 0; x < width * 4; x += 4 * sampleStep) {
                const iOld = oldRow + x
                const iNew = newRow + x

                // RGB diff (ignore alpha)
                const dr = oldData[iOld] - newData[iNew]
                const dg = oldData[iOld + 1] - newData[iNew + 1]
                const db = oldData[iOld + 2] - newData[iNew + 2]

                diffSum += Math.abs(dr) + Math.abs(dg) + Math.abs(db)
                count++
            }
        }

        const avgDiff = diffSum / count

        if (avgDiff < bestScore) {
            bestScore = avgDiff
            bestY = y
        }
    }

    return {matchY: bestY, score: bestScore}
}

/**

 * Text-aware frame difference metric.
 *
 * Instead of comparing raw RGB values (which are noisy and sensitive to color changes),
 * this function compares **luminance edges** between frames. It:
 *
 * 1. Converts pixels to luminance (perceptual grayscale)
 * 2. Computes simple edge strength using neighbor differences (right + bottom)
 * 3. Compares edge maps between frames
 *
 * Why:
 * * Text is defined by **edges and contrast**, not color
 * * Reduces noise from compression, color shifts, and minor lighting changes
 * * Better detects meaningful changes for OCR (new text, layout shifts)
 *
 * Tradeoffs:
 * * Slightly more compute than raw pixel diff (~2–3x per pixel)
 * * Thresholds differ from RGB diff (typically lower, e.g. ~10–25)
 *
 * Notes:
 * * Works best on downscaled frames for performance
 * * Sampling (sampleFactor) skips pixels to further reduce cost
 * * Can optionally ignore low-edge regions to focus on text-heavy areas
 */
function computeTextAwareDiff(
    data1: Uint8ClampedArray,
    data2: Uint8ClampedArray,
    width: number,
    height: number,
    sampleFactor = 4
) {
    let diff = 0
    let count = 0

    const step = sampleFactor

    for (let y = 0; y < height - 1; y += step) {
        for (let x = 0; x < width - 1; x += step) {
            const i = (y * width + x) * 4

            // luminance
            const g1 =
                0.299 * data1[i] +
                0.587 * data1[i + 1] +
                0.114 * data1[i + 2]

            const g2 =
                0.299 * data2[i] +
                0.587 * data2[i + 1] +
                0.114 * data2[i + 2]

            // neighbors (right + bottom)
            const ir = i + 4
            const ib = i + width * 4

            const g1r =
                0.299 * data1[ir] +
                0.587 * data1[ir + 1] +
                0.114 * data1[ir + 2]

            const g1b =
                0.299 * data1[ib] +
                0.587 * data1[ib + 1] +
                0.114 * data1[ib + 2]

            const g2r =
                0.299 * data2[ir] +
                0.587 * data2[ir + 1] +
                0.114 * data2[ir + 2]

            const g2b =
                0.299 * data2[ib] +
                0.587 * data2[ib + 1] +
                0.114 * data2[ib + 2]

            const edge1 = Math.abs(g1 - g1r) + Math.abs(g1 - g1b)
            const edge2 = Math.abs(g2 - g2r) + Math.abs(g2 - g2b)

            // if (edge1 < 10 && edge2 < 10) continue

            diff += Math.abs(edge1 - edge2)
            count++
        }
    }

    return count > 0 ? diff / count : 0
}

export function resetStitchState() {
    lastDownscaledData = null
    lastDownscaledImage = null

    stitchCanvas.width = 0
    stitchCanvas.height = 0

    stitchCtx.clearRect(0, 0, stitchCanvas.width, stitchCanvas.height)
}