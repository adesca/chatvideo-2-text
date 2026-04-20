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
    setVideoProcessHandler: (inputFn: VideoState['videoProcessHandler']) => void,
    videoProcessHandler: (() => void) | undefined,
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
    incrementProcessCount: (input: number) => void,

    processingStartTimestamp: number,
    processingEndTimestamp: number,
    setProcessingStartTimestamp: (ts: number) => void,
    setProcessingEndTimestamp: (ts: number) => void

    transcriptInfo: Record<number, Page>
    setTranscriptInfo: (frameId: number, page: Page) => void,
    stitchInfo: {
        canvasEl: HTMLCanvasElement,
        fileSize: string,
        width: number,
        height: number
    } | null
    setStitchDataUrl: (input: VideoState['stitchInfo']) => void
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
    setProcessingMeta: ((videoDuration, samplingRate) => set(() => (
        {videoDuration, samplingRate, processingEndTimestamp: videoDuration, processingStartTimestamp: 0}
    ))),

    nextOcrFrame: 0,
    setNextOcrFrameToProcess: input => set(() => ({nextOcrFrame: input})),

    processedCount: 0,
    incrementProcessCount: increment => set((s) => ({processedCount: s.processedCount + increment})),

    processingStartTimestamp: 0,
    processingEndTimestamp: 5,
    setProcessingStartTimestamp: processingStartTimestamp => set(() => ({processingStartTimestamp})),
    setProcessingEndTimestamp: processingEndTimestamp => set(() => ({processingEndTimestamp})),
    transcriptInfo: {},
    setTranscriptInfo: (frameId, page) => set((s) => ({
        transcriptInfo: {...s.transcriptInfo, [frameId]: page}
    })),

    stitchInfo: null,
    setStitchDataUrl: (stitchInfo) => set(() => ({stitchInfo})),

    videoProcessHandler: undefined,
    setVideoProcessHandler: (videoProcessHandler) => set(() => ({videoProcessHandler})),
}))

// todo: revoke blob urls on clear
export const frameCache = new Map<number, { blob: Blob, url: string }>()
export const frameSliceCache = new Map<number, { blob: Blob, url: string }>()
export const imageDataCache = new Map<number, ImageData>