// zustand store
import {create} from "zustand/react";

type Frame = {
    // id: number
    timestamp: number
    // blobUrl: string // URL.createObjectURL(blob)
}

interface VideoState {
    videoSrc: string,
    frames: Frame[],
    currentFrame: number,

    processing: {
        seekingMs: number,
        ocrMs: number,
    },

    setVideoUrl: (url: string) => void,
    addFrame: (timestamp: number) => void
}

// Create store using the curried form of `create`
export const useVideoStore = create<VideoState>()((set) => ({
    videoSrc: "",
    frames: [],
    currentFrame: 0,
    processing: {seekingMs: 0, ocrMs:0 },
    setVideoUrl: (videoSrc: string) => set(() => ({videoSrc})),
    addFrame: ((timestamp: number) => set(s => {
        console.log('adding')
        return ({
            ...s,
            frames: [...s.frames, {timestamp}]
        })
    }
   ))

}))

export const frameCache = new Map<number, ImageBitmap | Blob>()