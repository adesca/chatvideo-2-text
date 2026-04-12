import {frameCache, useVideoStore} from "./store.ts";
import {useEffect, useRef, useState} from "react";
import {createWorker} from "tesseract.js";
import {ChatDenoiser, useDenoiserReplay} from "./ChatDenoiser.ts";

export function Transcript() {
    const [worker, setWorker] = useState<Awaited<ReturnType<typeof createWorker>> | null>(null)


    useEffect(() => {
        createWorker('eng')
            .then(createdWorker => {
                setWorker(createdWorker);
            });

        return () => {
            worker?.terminate().then(() => {
            })
        };
    }, [])

    if (!worker) {
        return <progress className="progress is-info is-large" max="100">30%</progress>
    }


    return <>
        {worker ? <OCRReadText worker={worker}/> : <></>}
    </>
}

interface Props {
    worker: Awaited<ReturnType<typeof createWorker>>
}

function OCRReadText({worker}: Props) {
    const transcriptInfo = useVideoStore(s => s.transcriptInfo);
    const processed = useRef(new Set());
    const {frames} = useDenoiserReplay(transcriptInfo)
    console.log('frames', frames.length)


    useEffect(() => {
        const unsub = useVideoStore.subscribe(({frames, nextOcrFrame, setNextOcrFrameToProcess, setProcessedCount, setTranscriptInfo}) => {
            if (frames.length <= nextOcrFrame) return;
            if (processed.current.has(nextOcrFrame)) return;
            processed.current.add(nextOcrFrame);
            setProcessedCount(processed.current.size)

            worker.recognize(frameCache.get(frames[nextOcrFrame].timestamp), {}, {
                blocks: true,
            }).then(res => {
                console.log('executed')
                setNextOcrFrameToProcess(nextOcrFrame + 1)
                setTranscriptInfo(nextOcrFrame, res.data)
            })

        });

        return () => unsub()
    });

    console.log('frames for render', frames)
    return <>
        <div style={{overflow: 'auto', height: "100vh"}}>
            {frames.map(f => {
                return <div key={f.frameId}>
                    <ul>
                        {f.added.map(a => <li key={a}>{a}</li>)}
                    </ul>
                </div>
            })}
        </div>

    </>
}