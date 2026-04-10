import './App.css'
import {FileInput} from "./FileInput.tsx";
import {DebugStats} from "./DebugStats.tsx";
import {ProcessedFrames} from "./ProcessedFrames.tsx";

function App() {

    return <div className="app-container">
        <div className="main-content">
            <section className="section">
                <div className={'is-flex is-flex-direction-row is-justify-content-space-between'}>
                    <FileInput/>
                    <span className={'is-align-self-center'}>
                     <DebugStats/>
                    </span>
                </div>
                <ProcessedFrames />
            </section>
        </div>

        <aside className="side-panel">
            <div className="content">
                <h4 className="title is-6">Transcript</h4>
            </div>
        </aside>
    </div>
}

export default App
