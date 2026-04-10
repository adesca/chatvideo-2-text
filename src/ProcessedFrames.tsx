import {frameCache, useVideoStore} from "./store.ts";

export function ProcessedFrames() {
    const frames = useVideoStore(s => s.frames)

    console.log('rendering', frames.length);


    return <>
        <div>Last 20 frames:</div>
        <div className={'is-flex is-flex-direction-row'} >
            {frames.map(frame => <img style={{maxWidth: '200px'}}
                src={URL.createObjectURL(frameCache.get(frame.timestamp)!)} alt={`a frame at ${frame.timestamp} s`} />)}
        </div>

        {/*Display ocr'd information beneath the frame*/}
        {/*<div className={'is-flex is-flex-direction-row'}>*/}
        {/*    <img src={imgUrl} alt={"sample-image"} />*/}
        {/*    <img src={imgUrl} alt={"sample-image"} />*/}
        {/*    <img src={imgUrl} alt={"sample-image"} />*/}
        {/*</div>*/}
    </>
}