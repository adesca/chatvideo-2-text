import {frameCache, useVideoStore} from "./store.ts";

export function ProcessedFrames() {
    const frames = useVideoStore(s => s.frames)

    console.log('rendering', frames.length);
    if (frames.length > 0 ){
    console.log('is a bitmap stored?', frameCache.get(frames[frames.length - 1].timestamp))
    }

    return <>
        <div>Last 20 frames:</div>
        {/*Display ocr'd information beneath the frame*/}
        {/*<div className={'is-flex is-flex-direction-row'}>*/}
        {/*    <img src={imgUrl} alt={"sample-image"} />*/}
        {/*    <img src={imgUrl} alt={"sample-image"} />*/}
        {/*    <img src={imgUrl} alt={"sample-image"} />*/}
        {/*</div>*/}
    </>
}