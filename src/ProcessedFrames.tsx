import {frameCache, useVideoStore} from "./store.ts";

export function ProcessedFrames() {
    const frames = useVideoStore(s => s.frames)


    return <>
        <div><button className={'button is-dark'} onClick={() => generateFrames(frames.map(f => f.timestamp))}>Stitch chat together</button></div>
        <div className={'is-flex is-flex-direction-row'} >
            {frames.map(frame => <img style={{maxWidth: '200px'}}
                src={URL.createObjectURL(frameCache.get(frame.timestamp)!)} alt={`a frame at ${frame.timestamp} s`} />)}
        </div>
    </>
}