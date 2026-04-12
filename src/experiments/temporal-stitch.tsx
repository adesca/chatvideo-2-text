/**
 * EXPERIMENT FILE: Temporal Stitching / Cursor Removal Attempts
 *
 * Goal:
 * - Remove transient artifacts (mouse cursor) from stitched chat output
 *
 * Summary Result:
 * - None of these approaches significantly improved output quality
 * - All introduced additional complexity
 * - Final decision: DO NOT use in main pipeline
 *
 * Reason:
 * - Cursor is present in most sampled frames → not truly transient
 * - Text is not pixel-stable enough for per-pixel merging
 * - Frame-level decisions are more reliable than pixel-level ones
 */

/* ============================================================
 * EXPERIMENT 1: Per-pixel merge (prefer stable / darker pixel)
 * ============================================================
 *
 * Idea:
 * - Compare prev vs current frame pixel-by-pixel
 * - If similar → keep
 * - If different → choose "better" pixel (darker = likely text)
 *
 * Expected:
 * - Cursor removed
 * - Text preserved
 *
 * Result:
 * ❌ Text became corrupted / smudged
 * ❌ Anti-aliasing differences triggered false conflicts
 * ❌ “Darker = better” assumption invalid
 *
 * Conclusion:
 * - Per-pixel merging is NOT suitable for UI text
 */

export function mergeSlicesPreferStable(
    prevFrame: ImageData,
    currFrame: ImageData,
    newContentStart: number,
    diffThreshold = 40
): ImageData {
    const width = currFrame.width
    const height = currFrame.height
    const out = new ImageData(width, height - newContentStart)

    const prevData = prevFrame.data
    const currData = currFrame.data
    const outData = out.data

    let outIdx = 0

    for (let y = newContentStart; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4

            const dr = Math.abs(prevData[idx] - currData[idx])
            const dg = Math.abs(prevData[idx + 1] - currData[idx + 1])
            const db = Math.abs(prevData[idx + 2] - currData[idx + 2])

            const diff = dr + dg + db

            if (diff < diffThreshold) {
                // stable → use current
                outData[outIdx]     = currData[idx]
                outData[outIdx + 1] = currData[idx + 1]
                outData[outIdx + 2] = currData[idx + 2]
            } else {
                // conflict → pick darker (FAILED HEURISTIC)
                const currI = currData[idx] + currData[idx+1] + currData[idx+2]
                const prevI = prevData[idx] + prevData[idx+1] + prevData[idx+2]

                if (currI < prevI) {
                    outData[outIdx]     = currData[idx]
                    outData[outIdx + 1] = currData[idx + 1]
                    outData[outIdx + 2] = currData[idx + 2]
                } else {
                    outData[outIdx]     = prevData[idx]
                    outData[outIdx + 1] = prevData[idx + 1]
                    outData[outIdx + 2] = prevData[idx + 2]
                }
            }

            outData[outIdx + 3] = 255
            outIdx += 4
        }
    }

    return out
}


/* ============================================================
 * EXPERIMENT 2: Frame-level selection (contrast heuristic)
 * ============================================================
 *
 * Idea:
 * - Instead of merging pixels, pick the “better” frame
 * - Use contrast/variation as proxy for text clarity
 *
 * Expected:
 * - Choose frame without cursor
 * - Preserve clean text
 *
 * Result:
 * ❌ Output identical to baseline
 * ❌ Cursor often present in both frames
 *
 * Conclusion:
 * - Heuristic not strong enough
 * - Frame differences too subtle
 */

export function pickBetterSlice(
    prev: ImageData,
    curr: ImageData,
    newContentStart: number
): ImageData {
    const width = curr.width
    const height = curr.height - newContentStart

    let prevScore = 0
    let currScore = 0

    const step = 8

    for (let y = newContentStart; y < curr.height; y += 2) {
        for (let x = 0; x < width; x += step) {
            const idx = (y * width + x) * 4

            const pr = prev.data[idx]
            const pg = prev.data[idx + 1]
            const pb = prev.data[idx + 2]

            const cr = curr.data[idx]
            const cg = curr.data[idx + 1]
            const cb = curr.data[idx + 2]

            prevScore += Math.abs(pr - pg) + Math.abs(pg - pb)
            currScore += Math.abs(cr - cg) + Math.abs(cg - cb)
        }
    }

    const source = currScore >= prevScore ? curr : prev

    return new ImageData(
        source.data.slice(newContentStart * width * 4),
        width,
        height
    )
}


/* ============================================================
 * EXPERIMENT 3: Slice difference metric (used for comparison)
 * ============================================================
 *
 * Idea:
 * - Compute similarity between slices across frames
 * - Use as scoring function for frame selection
 *
 * Expected:
 * - Lower diff = more stable = better frame
 *
 * Result:
 * ⚠️ Works as a metric
 * ❌ Not sufficient to remove cursor
 *
 * Conclusion:
 * - Useful utility, but not a solution by itself
 */

export function sliceDifference(
    a: ImageData,
    b: ImageData,
    startY: number,
    step = 4
) {
    const width = a.width
    let diff = 0
    let count = 0

    for (let y = startY; y < a.height; y += 2) {
        for (let x = 0; x < width; x += step) {
            const idx = (y * width + x) * 4

            const dr = Math.abs(a.data[idx] - b.data[idx])
            const dg = Math.abs(a.data[idx + 1] - b.data[idx + 1])
            const db = Math.abs(a.data[idx + 2] - b.data[idx + 2])

            diff += dr + dg + db
            count++
        }
    }

    return diff / count
}


/* ============================================================
 * EXPERIMENT 4: 3-frame temporal selection
 * ============================================================
 *
 * Idea:
 * - Use prev, curr, next frames
 * - Choose slice most consistent with previous frame
 *
 * Expected:
 * - Cursor appears in only one frame → gets filtered out
 *
 * Result:
 * ❌ Cursor often present in all sampled frames
 * ❌ No meaningful improvement
 * ❌ Added pipeline complexity (buffering, delay)
 *
 * Conclusion:
 * - Temporal redundancy insufficient at current sampling rate
 * - Not worth complexity for this use case
 */

export function pickBestFrame(
    prev: ImageData,
    curr: ImageData,
    next: ImageData,
    startY: number
) {
    const currDiff = sliceDifference(prev, curr, startY)
    const nextDiff = sliceDifference(prev, next, startY)

    return nextDiff < currDiff ? next : curr
}