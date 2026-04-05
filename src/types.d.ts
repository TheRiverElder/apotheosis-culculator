export type EnchantingAttribute = "level" | "maxLevel" | "quanta" | "rectification" | "arcana" | "clues";

export type ItemInfo = {
    id: string;
    level: number; // 贡献位阶
    maxLevel: number; // 支持的最高位阶
    quanta: number; // 量子化
    rectification: number; // 校准
    arcana: number; // 阿卡那
    clues: number; // 魔咒线索
};

export type ItemStack = {
    id: string;
    amount: number;
};

export type Range = {
    readonly min: number;
    readonly max: number;
}

export type ConditionRequest = {
    id: EnchantingAttribute;
    initial: number;
    range: Range;
};