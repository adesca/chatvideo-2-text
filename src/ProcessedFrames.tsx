import {frameCache, useVideoStore} from "./store.ts";
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
                <img
                    key={frame.timestamp}
                    src={URL.createObjectURL(frameCache.get(frame.timestamp)!)}
                    alt={`a frame at ${frame.timestamp} s`}
                    style={{
                        maxWidth: '200px',
                        flex: '0 0 auto' // 👈 critical: prevents shrinking
                    }}
                />
            ))}
        </div>}
    </>
}