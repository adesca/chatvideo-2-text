import {useState} from "react";

export function DebugStats() {
    const [showStats, setShowStats] = useState<boolean>(false);

    return <>
        <button className={'button mb-3'}>Show stats for nerds</button>
        {showStats && <div>Stats for nerds</div>}

        <progress className="progress" value="15" max="100">15%</progress>
        <div>Processing: 15 / 100 frames</div>
        {/*OCR count*/}
    </>
}