/** A photo's dimensions with its longer side scaled to `size`, its shape unchanged. */
export function longSideDimensions({ width, height, size }: { width: number; height: number; size: number }) {
    if (width >= height) {
        return { width: size, height: Math.max(1, Math.round((size * height) / width)) };
    }
    return { width: Math.max(1, Math.round((size * width) / height)), height: size };
}
