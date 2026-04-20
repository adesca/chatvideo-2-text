
type RGB = { r: number; g: number; b: number };

type LuminanceMode = "perceived" | "sum" | "avg" | "red";

export class ImageRows {
    private data: Uint8ClampedArray;
    width: number;
    height: number;

    constructor(imageData: ImageData) {
        this.data = imageData.data;
        this.width = imageData.width;
        this.height = imageData.height;
    }

    // ---- Core access ----

    getPixelIndex(x: number, y: number): number {
        return (y * this.width + x) * 4;
    }

    getRGB(x: number, y: number): RGB {
        const i = this.getPixelIndex(x, y);
        return {
            r: this.data[i],
            g: this.data[i + 1],
            b: this.data[i + 2],
        };
    }

    // ---- Row iteration (FAST: no allocations) ----

    forEachPixelInRow(
        y: number,
        fn: (r: number, g: number, b: number, x: number) => void
    ) {
        const start = y * this.width * 4;

        for (let x = 0; x < this.width; x++) {
            const i = start + x * 4;
            fn(this.data[i], this.data[i + 1], this.data[i + 2], x);
        }
    }

    // ---- Optional: materialize row (SLOWER, but convenient) ----

    getRow(y: number): RGB[] {
        const row: RGB[] = [];
        this.forEachPixelInRow(y, (r, g, b) => {
            row.push({ r, g, b });
        });
        return row;
    }

    // ---- Luminance ----

    static luminance(r: number, g: number, b: number, mode: LuminanceMode) {
        switch (mode) {
            case "sum":
                return r + g + b;
            case "avg":
                return (r + g + b) / 3;
            case "red":
                return r;
            default:
                return 0.21 * r + 0.72 * g + 0.07 * b;
        }
    }

    // ---- Row calculations ----

    getRowStats(y: number, mode: LuminanceMode = "perceived") {
        let sum = 0;
        let min = Infinity;
        let max = -Infinity;

        this.forEachPixelInRow(y, (r, g, b) => {
            const lum = ImageRows.luminance(r, g, b, mode);
            sum += lum;
            if (lum < min) min = lum;
            if (lum > max) max = lum;
        });

        const avg = sum / this.width;

        return { sum, avg, min, max };
    }

    // ---- Find lowest row in a range ----

    findLowestRow(
        startY: number,
        endY: number,
        mode: LuminanceMode = "perceived"
    ) {
        let bestY = startY;
        let bestVal = Infinity;

        for (let y = startY; y <= endY; y++) {
            const { avg } = this.getRowStats(y, mode);

            if (avg < bestVal) {
                bestVal = avg;
                bestY = y;
            }
        }

        return { y: bestY, value: bestVal };
    }

    // ---- Find nearest "low" row upward ----

    findNearestLowRowUp(
        fromY: number,
        maxDistance: number,
        mode: LuminanceMode = "perceived"
    ) {
        let lastSum = null;
        let lastY = fromY;
        for (let dy = 1; dy <= maxDistance; dy++) {
            const y = fromY - dy;
            if (y < 0) break;

            const { sum } = this.getRowStats(y, mode);
            // if the luminance of the current row is higher than the luminance we just saw
            // Then luminance is increasing and we're past the local minima, so break
            if (lastSum && lastSum < sum) {
                return lastY;
            }

            lastSum = sum;
            lastY = y;
        }

        // If we don't break early, then we kept finding darker regions, so eevntually just return the darkest we found
        return lastY;
    }
}