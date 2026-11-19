// Path SVG untuk sparkline kecil. Nilai tidak valid dibuang; kurang dari dua
// titik berarti tidak ada garis untuk digambar.
export function sparklinePath(values, { width = 48, height = 18, padding = 2 } = {}) {
    const points = (Array.isArray(values) ? values : []).map(Number).filter(Number.isFinite);
    if (points.length < 2) return "";

    const min = Math.min(...points);
    const max = Math.max(...points);
    const span = max - min || 1;
    const innerHeight = height - padding * 2;
    const step = width / (points.length - 1);

    return points
        .map((value, index) => {
            const x = index * step;
            const y = padding + innerHeight - ((value - min) / span) * innerHeight;
            return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" ");
}
