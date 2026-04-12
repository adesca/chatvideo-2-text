// zustand store
import {create} from "zustand/react";
import type {Page} from "tesseract.js";

type Frame = {
    // id: number
    timestamp: number
    // blobUrl: string // URL.createObjectURL(blob)
}

interface VideoState {
    videoSrc: string,
    setVideoUrl: (url: string) => void,
    videoDuration: number,
    samplingRate: number,

    frames: Frame[],

    currentFrame: number,

    processing: {
        seekingMs: number,
        ocrMs: number,
    },
    addFrame: (timestamp: number) => void
    setProcessingMeta: (videoDuration: number, samplingRate: number) => void

    nextOcrFrame: number,
    setNextOcrFrameToProcess: (input: number) => void
    processedCount: number,
    setProcessedCount: (input: number) => void,

    processingStartTimestamp: number,
    processingEndTimestamp: number,
    setProcessingStartTimestamp: (ts: number) => void,
    setProcessingEndTimestamp: (ts: number) => void

    transcriptInfo: Record<number, Page>
    setTranscriptInfo: (frameId: number, page: Page) => void,
    stitchDataUrl: string,
    setStitchDataUrl: (str: string) => void
}

// Create store using the curried form of `create`
export const useVideoStore = create<VideoState>()((set) => ({
    videoSrc: "",
    frames: [],
    currentFrame: 0,
    processing: {seekingMs: 0, ocrMs:0 },
    samplingRate: .5,
    videoDuration: 0,
    setVideoUrl: (videoSrc: string) => set(() => ({videoSrc})),
    addFrame: ((timestamp: number) => set(s => {
        return ({
            frames: [...s.frames, {timestamp}]
        })
    }
   )),
    setProcessingMeta: ((videoDuration, samplingRate) => set(() => ({videoDuration, samplingRate}))),

    nextOcrFrame: 0,
    setNextOcrFrameToProcess: input => set(() => ({nextOcrFrame: input})),

    processedCount: 0,
    setProcessedCount: processedCount => set(() => ({processedCount})),

    processingStartTimestamp: 0,
    processingEndTimestamp: 5,
    setProcessingStartTimestamp: processingStartTimestamp => set(() => ({processingStartTimestamp})),
    setProcessingEndTimestamp: processingEndTimestamp => set(() => ({processingEndTimestamp})),
    transcriptInfo: {},
    setTranscriptInfo: (frameId, page) => set((s) => ({
        transcriptInfo: {...s.transcriptInfo, [frameId]: page}
    })),

    stitchDataUrl: "",
    setStitchDataUrl: (stitchDataUrl: string) => set(() => ({stitchDataUrl}))
}))

export const frameCache = new Map<number, Blob>()
export const imageDataCache = new Map<number, ImageData>