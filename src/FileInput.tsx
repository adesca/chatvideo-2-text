import {type ChangeEventHandler, type ReactEventHandler, useEffect, useRef, useState} from "react";
import {frameCache, useVideoStore} from "./store.ts";

const canvas = document.createElement('canvas')
const ctx  = canvas.getContext('2d')!

export function FileInput() {
    const [fileState, setFileState] = useState<File | null>(null);
    const {setVideoUrl, videoSrc, addFrame, setProcessingMeta, processingStartTimestamp, processingEndTimestamp} = useVideoStore();
    const prevUrlRef = useRef<string | null>(null)


    useEffect(() => {
        if (prevUrlRef.current && prevUrlRef.current !== videoSrc) {
            URL.revokeObjectURL(prevUrlRef.current)
        }

        prevUrlRef.current = videoSrc

        return () => {
            if (prevUrlRef.current) {
                URL.revokeObjectURL(prevUrlRef.current)
            }
        }
    }, [videoSrc])

    const handler: ChangeEventHandler<HTMLInputElement> = async (ev) => {
        const file = ev.currentTarget.files?.[0];
        if (!file) return;

        setFileState(file);
        const freshBlob = new Blob([await file.arrayBuffer()], {type: file.type})
        setVideoUrl(URL.createObjectURL(freshBlob))
    }

    const onVideoLoaded: ReactEventHandler<HTMLVideoElement> = async (ev) => {
        console.log('entered')

        const videoEl = ev.currentTarget
        const duration = videoEl.duration
        setProcessingMeta(duration, .5)

        let currentTime = 0

        while (currentTime < duration && currentTime >= processingStartTimestamp && currentTime <= processingEndTimestamp) {
            const seekedPromise = new Promise<void>((resolve) => {
                const handler = () => {
                    videoEl.removeEventListener('seeked', handler)
                    resolve()
                }
                videoEl.addEventListener('seeked', handler)
            })

            if (Math.abs(videoEl.currentTime - currentTime) > 0.01) {
                videoEl.currentTime = currentTime
            } else {
                // avoid deadlock
                videoEl.dispatchEvent(new Event('seeked'))
            }

            await seekedPromise
            await waitForFrame(videoEl)
            // let video settle
            await new Promise(r => setTimeout(r, 30))

            const maybeBlob = await captureFrame(videoEl, currentTime)
            if (maybeBlob) {
                frameCache.set(currentTime, maybeBlob);
                addFrame(currentTime)
            } else {
                console.log('Skipped storing frame @ ', currentTime, ' because it\'s too similar to the previous frame');
            }

            currentTime += 0.5
        }
    }

    return  <div className="file has-name is-boxed">
        <label className="file-label">
            <input className="file-input" type="file" onChange={handler}/>
            <span className="file-cta">
              <span className="file-icon">
                <i className="fas fa-upload"></i>
              </span>
                <span className="file-label"> Choose a file… </span>
            </span>
            <span className="file-name"> {fileState ? fileState.name : ""} </span>
        </label>
        {videoSrc && <video src={videoSrc}  onLoadedMetadata={onVideoLoaded}/>}
    </div>
}

function waitForFrame(video: HTMLVideoElement) {
    if (video.readyState >= 2) return Promise.resolve()

    return new Promise<void>((resolve) => {
        const handler = () => {
            video.removeEventListener('loadeddata', handler)
            resolve()
        }
        video.addEventListener('loadeddata', handler)
    })
}

let lastCapturedFrameImageData: ImageDataArray | undefined = undefined;
const downscaledCanvas = document.createElement("canvas");
const downscaledCtx = downscaledCanvas.getContext("2d")!
async function captureFrame(video: HTMLVideoElement, timestamp: number) {
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    downscaledCanvas.width = Math.floor(video.videoWidth / 10);
    downscaledCanvas.height = Math.floor(video.videoHeight / 10)

    ctx.drawImage(video, 0, 0)
    downscaledCtx.drawImage(video, 0, 0 ,downscaledCanvas.width, downscaledCanvas.height)

    const currentImageData = downscaledCtx.getImageData(0, 0, downscaledCanvas.width, downscaledCanvas.height);

    if (isProbablyBlank(currentImageData))  return Promise.resolve(undefined);

    if (!lastCapturedFrameImageData) {
        console.log(currentImageData.data.slice())
        lastCapturedFrameImageData = currentImageData.data.slice();
    } else {
        const diff = computeTextAwareDiff(currentImageData.data, lastCapturedFrameImageData, downscaledCanvas.width, downscaledCanvas.height, 4)
        // suggested diff should be between 10 and 20 (let user decide?)
        if (diff >= 10) {
            lastCapturedFrameImageData = currentImageData.data.slice();
        } else {
            return Promise.resolve(undefined)
        }
    }

    return new Promise<Blob>(resolve => {
        canvas.toBlob(maybeBlob => {
            if (maybeBlob) resolve(maybeBlob)
            throw new Error(`Canvas @ ${timestamp} could not be converted to blob`)
        })
    })
}

// Taken directly from pilko studio, assumes no down sampling and works well with a threshold of 35
function computePixelDiff(data1: ImageDataArray, data2: ImageDataArray, sampleFactor = 4) { let diff = 0; let count = 0; const step = 4 * sampleFactor; for (let i = 0; i < data1.length; i += step) { diff += Math.abs(data1[i] - data2[i]) + Math.abs(data1[i+1] - data2[i+1]) + Math.abs(data1[i+2] - data2[i+2]); count++; } return count > 0 ? (diff / (count * 3)) : 0; }

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