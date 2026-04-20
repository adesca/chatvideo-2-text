import {frameCache, useVideoStore} from "./store.ts";
import {useEffect, useRef, useState} from "react";
import {createWorker} from "tesseract.js";
import { useDenoiserReplay} from "./ChatDenoiser.ts";

export function Transcript() {
    const [generateTranscript, setGEnerateTranscript] = useState(false);
    const [worker, setWorker] = useState<Awaited<ReturnType<typeof createWorker>> | null>(null)

    useEffect(() => {
        if (generateTranscript) {
            createWorker('eng')
                .then(createdWorker => {
                    setWorker(createdWorker);
                });

            return () => {
                worker?.terminate().then(() => {
                })
            };
        }

    }, [generateTranscript])

    if (generateTranscript && !worker) {
        return <progress className="progress is-info is-large" max="100">30%</progress>
    }


    return <>
        {/*<button className={'button'} onClick={() => setGEnerateTranscript(true)}>Generate transcript</button>*/}
        <strong>3. Final Stitched Screenshot</strong>
        <StitchedImage />
        {worker ? <OCRReadText worker={worker}/> : <></>}
    </>
}

function StitchedImage() {
    const stitchInfo = useVideoStore(s => s.stitchInfo);

    if(!stitchInfo) return <></>

    function downloadCanvas(canvas: HTMLCanvasElement, filename = "chat.png") {
        canvas.toBlob((blob) => {
            if (!blob) return

            const url = URL.createObjectURL(blob)

            const a = document.createElement("a")
            a.href = url
            a.download = filename

            document.body.appendChild(a)
            a.click()
            a.remove()

            URL.revokeObjectURL(url)
        })
    }

    return <>
        <div>
            <button className={'button'} onClick={() => downloadCanvas(stitchInfo.canvasEl)}>Download stitched image</button>
        </div>
        <div>Image Size: {stitchInfo.width} x {stitchInfo.height}, {stitchInfo.fileSize} </div>
        <div style={{maxHeight: "500px", overflow: "auto"}}><img src={stitchInfo.canvasEl.toDataURL()} alt={'stitched chat stream'} /></div>
    </>
}
interface Props {
    worker: Awaited<ReturnType<typeof createWorker>>
}

function OCRReadText({worker}: Props) {
    const transcriptInfo = useVideoStore(s => s.transcriptInfo);
    const processed = useRef(new Set());
    const {frames} = useDenoiserReplay(transcriptInfo)


    useEffect(() => {
        const unsub = useVideoStore.subscribe(({frames, nextOcrFrame, setNextOcrFrameToProcess, incrementProcessCount, setTranscriptInfo}) => {
            if (frames.length <= nextOcrFrame) return;
            if (processed.current.has(nextOcrFrame)) return;
            processed.current.add(nextOcrFrame);
            incrementProcessCount(processed.current.size)

            worker.recognize(frameCache.get(frames[nextOcrFrame].timestamp), {}, {
                blocks: true,
            }).then(res => {
                setNextOcrFrameToProcess(nextOcrFrame + 1)
                setTranscriptInfo(nextOcrFrame, res.data)
            })

        });

        return () => unsub()
    });

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