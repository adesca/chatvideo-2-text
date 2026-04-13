import './App.css'
import {FileInput} from "./FileInput.tsx";
import {DebugStats} from "./DebugStats.tsx";
import {ProcessedFrames} from "./ProcessedFrames.tsx";
import {Transcript} from "./Transcript.tsx";
import {UserButtons} from "./UserButtons.tsx";

function App() {

    return <div className="app-container columns">
        <div className="main-content column is-three-quarters">
            <section className="section">
                <div className={'columns'}>
                    <div className={'column'}>
                        <strong>1. Upload Video</strong>
                        <FileInput/>
                    </div>
                    <div className={'column'}>
                        <strong>2. Generate Screenshot</strong>
                        <UserButtons />
                    </div>
                    <div className={'column'}>
                     <DebugStats/>
                    </div>
                </div>
                <ProcessedFrames />
            </section>
        </div>

        <aside className="side-panel column is-one-quarter has-background-grey-dark" style={{borderLeft: "1px solid rgba(255,255,255, 0.08)"}}>
            <div className="content ">
                {/*<h4 className="title is-6">Transcript</h4>*/}
                <Transcript />
            </div>
        </aside>
    </div>
}

export default App
