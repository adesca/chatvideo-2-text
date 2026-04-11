// zustand store
import {create} from "zustand/react";

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
    setNextOcrFrameToProcess: input => set(() => ({nextOcrFrame: input}))


}))

export const frameCache = new Map<number, Blob>()