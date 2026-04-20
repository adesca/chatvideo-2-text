import type {Page} from "tesseract.js";
import {useMemo} from "react";

export class ChatDenoiser {
    // private pages: Page[] = [];
    private lines: string[] = []
    processedFrameIds: number[] = []

    add(page: Page, frameId: number) {
        if (!page.blocks) {
            console.error('No blocks for page')
            return {
                added: [],
                ignored: [],
                rejected: []
            };
        }

        this.processedFrameIds.push(frameId)
        const newLines =  page.blocks.flatMap(b => b.paragraphs)
            .flatMap(p => p.lines).map(l => l.text);

        if (this.lines.length === 0) {

            this.lines.push(...newLines)
            // this.pages.push(page)
            return {
                added: newLines,
                ignored: [],
                rejected: [],
                transcript: this.lines.join('\n')
            }
        }

        const added = newLines.filter(nl => !this.lines.includes(nl))
        const ignored = newLines.filter(nl => this.lines.includes(nl))
        console.log(`Added ${added.length}, ignored ${ignored.length}`)
        this.lines.push(...added)

        return {
            added,
            ignored,
            rejected: [],
            transcript: this.lines.join('\n')
        }

    };
    getState() {
        return{lines: this.lines}
    };
    reset() {};
    clone() {};

}

type DenoiserState = {
    lines: string[]
    seen: Set<string>
    // whatever else you track
}

type DenoiserResult = {
    state: DenoiserState
    added: string[]
    transcript: string
}

function stepDenoiser(
    prevState: DenoiserState,
    page: Page
): DenoiserResult {
    if (!page.blocks) {
        return {state: prevState, added: [], transcript: prevState.lines.join('\n')}
    }

    const newLines =  page.blocks.flatMap(b => b.paragraphs)
        .flatMap(p => p.lines).map(l => l.text);
    // const newLinesToAdd = newLines.filter(line => !prevState.seen.has(line))
    // // console.log('to add', newLinesToAdd)
    //
    // const newSeen = new Set(prevState.seen)
    // newLinesToAdd.forEach(line => newSeen.add(line))

    function normalize(line: string) {
        return line
            .replace(/\s+/g, ' ')  // collapse whitespace
            .trim()
    }

    const newLinesToAdd = []

    const newSeen = new Set(prevState.seen)

    for (const line of newLines) {
        const norm = normalize(line)

        if (!newSeen.has(norm)) {
            newSeen.add(norm)
            newLinesToAdd.push(line) // keep original for display
        }
    }

    const returnedLines = [...prevState.lines, ...newLinesToAdd]
    return {
        state: {lines: returnedLines, seen: newSeen},
        added: newLinesToAdd,
        transcript: returnedLines.join('\n')
    }
}

function sortedEntries(object: Record<number, Page>) {
    return Object.entries(object).toSorted((a,b) => +a[0] - +b[0])

}

export function useDenoiserReplay(transcriptInfo: Record<number, Page>) {
    return useMemo(() => {
        const frames = [];
        let state: DenoiserState = {lines: [], seen: new Set()};
        let transcript = "";

        for (const [frameId, page] of sortedEntries(transcriptInfo)) {
            const result = stepDenoiser(state, page);
            state = result.state;
            transcript = result.transcript;

            frames.push({ frameId, ...result });
        }

        return {
            frames,
            finalState: state,
            transcript
        };
    }, [transcriptInfo]);
}