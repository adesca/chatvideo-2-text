import {frameCache, useVideoStore} from "./store.ts";
import {useEffect, useRef, useState} from "react";
import {createWorker} from "tesseract.js";

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
    const [text, setText] = useState<string[]>([])
    const [totalFrames, setTotalFrames] = useState<number>(0)
    const processed = useRef(new Set());


    useEffect(() => {
        const unsub = useVideoStore.subscribe(({frames, nextOcrFrame, setNextOcrFrameToProcess, setProcessedCount}) => {
            return;
            if (frames.length <= nextOcrFrame) return;
            setTotalFrames(frames.length)
            if (processed.current.has(nextOcrFrame)) return;
            processed.current.add(nextOcrFrame);
            setProcessedCount(processed.current.size)

            worker.recognize(frameCache.get(frames[nextOcrFrame].timestamp), {}, {
                blocks: true,
            }).then(res => {
                setNextOcrFrameToProcess(nextOcrFrame + 1)

                if (res.data.text.length > 0) {
                    setText(curr => ([...curr, res.data.text]))
                }
            })

        });

        return () => unsub()
    });

    return <>
        <div style={{overflow: 'auto', height: "100vh"}}>
            {text.map(t => <div className={'block'} key={t}>
                {t}
            </div>)}
        </div>

    </>
}