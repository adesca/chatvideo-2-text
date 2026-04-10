import {useVideoStore} from "./store.ts";

export function DebugStats() {
    const videoDuration = useVideoStore(s => s.videoDuration);
    const samplingRate = useVideoStore(s => s.samplingRate);
    const frames = useVideoStore(s => s.frames);


    let sampleDebug = <></>
    if (videoDuration && samplingRate) {
        sampleDebug = <div>Sampling {Math.ceil(videoDuration / samplingRate)} timestamps</div>
    }

    return <>
        {/*<button className={'button mb-3'}>Show stats for nerds</button>*/}
        {<div>Stats for nerds</div>}

        {/*<progress className="progress" value="15" max="100">15%</progress>*/}
        <div>{frames.length} unique frames identified</div>
        {sampleDebug}
        {/*<div>Processing: 15 / 100 frames</div>*/}
        {/*OCR count*/}
    </>
}