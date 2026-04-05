

export type Language = Record<string, string>;

export function translate(lang: Language, key: string): string {
    return lang[key] ?? key;
}