import {type ChangeEventHandler, type ReactEventHandler, useEffect, useRef, useState} from "react";
import {useVideoStore} from "./store.ts";


export function FileInput() {
    const [fileState, setFileState] = useState<File | null>(null);
    const {setVideoUrl, videoSrc} = useVideoStore();
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

    const handler: ChangeEventHandler<HTMLInputElement> = (ev) => {
        const file = ev.currentTarget.files?.[0];
        if (!file) return;

        setFileState(file);
        setVideoUrl(URL.createObjectURL(file))
    }

    const onVideoLoaded: ReactEventHandler<HTMLVideoElement> =async  (ev) => {
        console.log('video duration', ev.currentTarget.duration);
        const videoDuration = ev.currentTarget.duration
        let currentTime = 0;
        const videoEl = ev.currentTarget;
        const canvas = document.getElementById('canvas') as HTMLCanvasElement
        const ctx = canvas.getContext('2d');


        do {
            console.log('entered')
            let onSeeked: () => void;
            const seekedPromise: Promise<void> = new Promise(resolve => onSeeked = resolve)
            videoEl.addEventListener('seeked', () => {
                onSeeked();
            }, {once: true})

            videoEl.currentTime = currentTime;
            currentTime += .5;

            await seekedPromise;
            ctx!.drawImage(videoEl, 0, 0)
            // await new Promise(resolve => setTimeout(resolve, 1000))
        } while (currentTime < videoDuration)
        // ev.currentTarget.seek

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
        <canvas id={'canvas'} />
        {videoSrc && <video src={videoSrc} controls={true} onLoadedData={onVideoLoaded}/>}
    </div>
}