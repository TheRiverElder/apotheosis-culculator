

export function toSignedString(value: number, precision: number = 0): string {
    const prefix = value >= 0 ? "+" : "";
    return prefix + value.toFixed(precision);
}