import {useVideoStore} from "./store.ts";

export function UserButtons() {
    const handler = useVideoStore(s => s.videoProcessHandler)

    return <div className={'is-flex is-flex-direction-column'}>
        <button className={'button mb-4'} onClick={() => window.location.reload()}>Start over</button>
        <button className={'button mb-4'} onClick={handler} disabled={!handler}>Create full chat screenshot</button>
    </div>
}