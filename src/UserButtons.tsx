import {useVideoStore} from "./store.ts";
import {useShallow} from "zustand/react/shallow";

export function UserButtons() {
    const {handler, processedCount, stitchInfo, framesCount} = useVideoStore(
        useShallow(s => {
            const framesCount = Math.min(s.videoDuration, s.processingEndTimestamp - s.processingStartTimestamp) / s.samplingRate

            return {
            handler: s.videoProcessHandler,
            processedCount: s.processedCount,
            stitchInfo: s.stitchInfo,
            framesCount
        }})
    )
    const isProcessing =  (processedCount > 0 && !stitchInfo)

    const createChatClass = isProcessing ? "button mb-4 is-loading" : "button mb-4";
    return <div className={'is-flex is-flex-direction-column'}>
        <button className={createChatClass} onClick={handler} disabled={!handler || isProcessing || !!stitchInfo}>Create full chat screenshot</button>
        {isProcessing && `Processing video... ${processedCount} / ${framesCount} frames analysed`}
        <button className={'button mt-5 is-text'} onClick={() => window.location.reload()}>Start over with a new video</button>
    </div>
}