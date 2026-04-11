import {useVideoStore} from "./store.ts";
import {useShallow} from "zustand/react/shallow";

export function DebugStats() {
    const {videoDuration, samplingRate, frames, processedCount, processingStartTimestamp, processingEndTimestamp, setProcessingStartTimestamp, setProcessingEndTimestamp} = useVideoStore(
        useShallow(s => ({
            videoDuration: s.videoDuration, samplingRate: s.samplingRate, frames: s.frames,
            processedCount: s.processedCount,
            processingStartTimestamp: s.processingStartTimestamp, processingEndTimestamp: s.processingEndTimestamp,
            setProcessingStartTimestamp: s.setProcessingStartTimestamp, setProcessingEndTimestamp: s.setProcessingEndTimestamp
        }))
    )


    let sampleDebug = <></>
    if (videoDuration && samplingRate) {
        console.log(videoDuration, processingEndTimestamp, processingStartTimestamp)
        const sampleDuration = Math.min(videoDuration, processingEndTimestamp - processingStartTimestamp)
        sampleDebug = <div>Sampling {sampleDuration / samplingRate} timestamps</div>
    }

    return <>
        {<h2>Stats for nerds</h2>}
        <div>
            Process timestamps from
            <input type={'number'} onChange={e => setProcessingStartTimestamp(+e.currentTarget.value)} value={processingStartTimestamp}/> s
            to
            <input type={'number'} onChange={e => setProcessingEndTimestamp(+e.currentTarget.value)} value={processingEndTimestamp}/> s,
            sampling every  {samplingRate} s
        </div>
        {sampleDebug}
        <div>{frames.length} unique frames identified</div>

        <progress className="progress is-link" value={processedCount} max={frames.length}>
            {(processedCount / frames.length) * 100}%
        </progress>
        Finished running OCR for {processedCount} frames of {frames.length}


    </>
}