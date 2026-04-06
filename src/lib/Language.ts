

export type Language = Record<string, string>;

type FallbackFunction = (key: string, lang: Language | null | undefined) => string;
const DEFAULT_FALLBACK: FallbackFunction = (key) => {
    let lastSepratorIndex = key.length - 1;
    while (lastSepratorIndex >= 0) {
        const c = key[lastSepratorIndex];
        if (c === ':' || c === '.') break;
        lastSepratorIndex--;
    }
    const nameKey = key.slice(lastSepratorIndex + 1);
    return nameKey.split('_').map(it => it[0].toUpperCase() + it.slice(1)).join(' ');
};

export function translate(lang: Language | null | undefined, key: string, fallback: string | FallbackFunction = DEFAULT_FALLBACK): string {
    return lang?.[key] ?? (typeof fallback === 'function' ? fallback(key, lang) : fallback);
}