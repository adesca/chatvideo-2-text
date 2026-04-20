import {type ChangeEventHandler, type ReactEventHandler, useEffect, useRef, useState} from "react";
import {frameCache, useVideoStore} from "./store.ts";
import {
    captureFrame,
    downscaledCanvas,
    fullCanvas,
    resetStitchState,
    stitchCanvas,
} from "./CaptureFrame.tsx";


export function FileInput() {
    const [fileState, setFileState] = useState<File | null>(null);
    const {
        setVideoUrl,
        setStitchDataUrl,
        videoSrc,
        addFrame,
        setProcessingMeta,
        setVideoProcessHandler,
        processingStartTimestamp,
        processingEndTimestamp,
        incrementProcessCount
    } = useVideoStore();
    const prevUrlRef = useRef<string | null>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const [userAttemptedUploadAgain, setUserAttemptedUploadAgain] = useState(false);


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

        if (videoSrc) {
            setUserAttemptedUploadAgain(true);
            return;
        }

        setFileState(file);
        const freshBlob = new Blob([await file.arrayBuffer()], {type: file.type})
        setVideoUrl(URL.createObjectURL(freshBlob))
    }

    const onVideoLoaded: ReactEventHandler<HTMLVideoElement> = async (ev) => {
        const duration = Math.ceil(ev.currentTarget.duration)
        setProcessingMeta(duration, .5)
        setVideoProcessHandler(() => {
            console.log('here', videoRef.current)
            if (videoRef.current) {
                runVideoProcessing(videoRef.current)
            } else {
                console.error("User ran processing before video was hooked up")
            }
        })
        // await runVideoProcessing(ev.currentTarget, true)
    }

    async function runVideoProcessing(videoEl: HTMLVideoElement) {
        if (!document.getElementsByName('video')) return;
        const {processingStartTimestamp, processingEndTimestamp } =  useVideoStore.getState();

        resetStitchState()
        const duration = videoEl.duration

        fullCanvas.width = videoEl.videoWidth
        fullCanvas.height = videoEl.videoHeight

        downscaledCanvas.width = Math.floor(videoEl.videoWidth / 10)
        downscaledCanvas.height = Math.floor(videoEl.videoHeight / 10)

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
                frameCache.set(currentTime, {blob: maybeBlob, url: URL.createObjectURL(maybeBlob)});
                addFrame(currentTime)
            } else {
                console.log('Skipped storing frame @ ', currentTime, ' because it\'s too similar to the previous frame');
            }

            incrementProcessCount(1)
            currentTime += 0.5
        }

        stitchCanvas.toBlob(blob => {
            if (!blob) {
                setStitchDataUrl({
                    fileSize: `?? KB`,
                    height: stitchCanvas.height,
                    width: stitchCanvas.width,
                    canvasEl: stitchCanvas
                })
                return;
            }
            const kb = (blob.size / 1024).toFixed(1)
            setStitchDataUrl({
                fileSize: `${kb} KB`,
                height: stitchCanvas.height,
                width: stitchCanvas.width,
                canvasEl: stitchCanvas
            })
        })
    }


    console.log('pr', processingStartTimestamp, processingEndTimestamp)
    return <div className="">
        <div className={'file has-name is-boxed'}>
            <label className="file-label">
                <input className="file-input" type="file" onChange={handler}/>
                <span className="file-cta">
              <span className="file-icon">
                <i className="fas fa-upload"></i>
              </span>
                <span className="file-label"> Upload video file… </span>
            </span>
                <span className="file-name"> Selected file: <strong>{fileState ? fileState.name : ""}</strong> </span>
            </label>
            {videoSrc && <video ref={videoRef} src={videoSrc} style={{display: 'none'}} onLoadedMetadata={onVideoLoaded}/>}
        </div>

        <div>
            {userAttemptedUploadAgain && <div className={'notification is-warning'}>Please click ‘Start over’ before uploading a new video</div>}
        </div>
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

