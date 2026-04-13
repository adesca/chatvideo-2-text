import {useVideoStore} from "./store.ts";
import {useShallow} from "zustand/react/shallow";
import {useState} from "react";
import {ChatDenoiser, useDenoiserReplay} from "./ChatDenoiser.ts";

export function DebugStats() {
    const {videoDuration, stitchInfo, samplingRate, frames, processedCount, processingStartTimestamp, processingEndTimestamp, setProcessingStartTimestamp, setProcessingEndTimestamp} = useVideoStore(
        useShallow(s => ({
            videoDuration: s.videoDuration, samplingRate: s.samplingRate, frames: s.frames,
            processedCount: s.processedCount,
            processingStartTimestamp: s.processingStartTimestamp, processingEndTimestamp: s.processingEndTimestamp,
            setProcessingStartTimestamp: s.setProcessingStartTimestamp, setProcessingEndTimestamp: s.setProcessingEndTimestamp,
            stitchInfo: s.stitchInfo
        }))
    )


    let sampleDebug = <></>
    if (videoDuration && samplingRate) {
        const sampleDuration = Math.min(videoDuration, processingEndTimestamp - processingStartTimestamp)
        sampleDebug = <div>Sampling {sampleDuration / samplingRate} timestamps</div>
    }

    return <>
        {<strong>Stats for nerds</strong>}
        <div>
            Process timestamps from
            <input type={'number'} className={'input is-small mx-1'}  value={processingStartTimestamp} style={{width: '50px'}}
                   onChange={e => setProcessingStartTimestamp(+e.currentTarget.value)}/> s
            to
            <input type={'number'} className={'input is-small mx-1'} value={processingEndTimestamp} style={{width: '50px'}}
                   onChange={e => setProcessingEndTimestamp(+e.currentTarget.value)}/> s,
            sampling every {samplingRate} s
        </div>
        {sampleDebug}
        <div>{frames.length} unique frames identified</div>
        {(processedCount > 0 && !stitchInfo) &&  <div>Processed {processedCount} timestamps</div>}
        {stitchInfo && <div>Finished processing video</div>}
        {(processedCount > 0 && !stitchInfo) && <progress className="progress is-link">15%</progress>}
        {/*Finished running OCR for {processedCount} frames of {frames.length}*/}
        {/*<DebugLog/>*/}
    </>
}

function DebugLog() {
    const transcriptInfo = useVideoStore(s => s.transcriptInfo)
    const [runningLog, setRunningLog] = useState<string[]>([])

    const {frames} = useDenoiserReplay(transcriptInfo);
    let text = '';

    frames.forEach(f => {
        text += `Frame #${f.frameId}
 -----------
 
 DECISIONS:
 + (new, accepted)
  - ${f.added.join('- ')} 
 - (duplicate, ignored)

`
    })


    // console.log('text---asdf', text)

    // console.log(denoiser.getState());
    // const text = denoiser.getState().lines.join('\n');

    return  <textarea className={'textarea'} style={{height: '200px', overflowY: 'auto', fontFamily: 'monospace'}} value={text} />
}