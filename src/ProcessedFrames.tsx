import imgUrl from './assets/sample-image.png'

export function ProcessedFrames() {
    return <>
        <div>Last 20 frames:</div>
        {/*Display ocr'd information beneath the frame*/}
        <div className={'is-flex is-flex-direction-row'}>
            <img src={imgUrl} alt={"sample-image"} />
            <img src={imgUrl} alt={"sample-image"} />
            <img src={imgUrl} alt={"sample-image"} />
        </div>
    </>
}