import {type InputEventHandler, useState} from "react";

export function FileInput() {
    const [fileState, setFileState] = useState<File | null>(null);

    const handler: InputEventHandler<HTMLInputElement> = (ev) => {
        const file = ev.currentTarget.files![0];
        setFileState(file);
    }

    return  <div className="file has-name is-boxed">
        <label className="file-label">
            <input className="file-input" type="file" onInput={handler}/>
            <span className="file-cta">
              <span className="file-icon">
                    <i className="fas fa-upload"></i>
                  </span>
                  <span className="file-label"> Choose a file… </span>
                </span>
            <span className="file-name"> {fileState ? fileState.name : ""} </span>
        </label>
    </div>
}