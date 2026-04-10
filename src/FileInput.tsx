import {type ChangeEventHandler, type ReactEventHandler, useEffect, useRef, useState} from "react";
import {frameCache, useVideoStore} from "./store.ts";

const canvas = document.createElement('canvas')
const ctx  = canvas.getContext('2d')!

export function FileInput() {
    const [fileState, setFileState] = useState<File | null>(null);
    const {setVideoUrl, videoSrc, addFrame} = useVideoStore();
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

        let currentTime = 0

        while (currentTime < duration) {
            console.log('seeking to', currentTime)

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

            const bitmap = await captureFrame(videoEl)
            frameCache.set(currentTime, bitmap);
            addFrame(currentTime)

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

async function captureFrame(video: HTMLVideoElement) {
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    ctx.drawImage(video, 0, 0)

    return await createImageBitmap(canvas)
}