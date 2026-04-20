import {frameCache, frameSliceCache, useVideoStore} from "./store.ts";
import {useState} from "react";

export function ProcessedFrames() {
    const frames = useVideoStore(s => s.frames)
    const [showFrames, setShowFrames] = useState<boolean>(false);

    return <>
        <label className={'checkbox'}>
            <input type={'checkbox'} onChange={() => setShowFrames(s => !s)}/> Show sampled frames
        </label>
        {showFrames && <div
            className="is-flex is-flex-direction-row"
            style={{
                overflowX: 'auto',
                maxWidth: '100%',
                gap: '0.5rem',
                paddingBottom: '0.5rem'
            }}
        >
            {frames.map(frame => (
                <div key={frame.timestamp}>
                    <div style={{maxWidth: '250px', flex: '0 0 250px'}}>
                        {frame.timestamp} s
                        <img
                            src={frameCache.get(frame.timestamp)!.url}
                            alt={`a frame at ${frame.timestamp} s`}
                            className={'pb-2'}
                            style={{width: '100%'}}
                        />
                        {frameSliceCache.get(frame.timestamp) && <img
                            src={frameSliceCache.get(frame.timestamp)!.url}
                            alt={`A frame slice from ${frame.timestamp} s`}
                            style={{width: '100%'}}
                            />}
                    </div>
                </div>
            ))}
        </div>}
    </>
}