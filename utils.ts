export function toFloat(row: Record<string, string>, key: string): number {
    return parseFloat(row[key] || "0");
}
