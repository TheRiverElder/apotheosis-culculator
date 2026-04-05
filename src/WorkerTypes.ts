import type { EnchantingAttribute, ItemStack } from "./types";

export type CommandPack = {
    readonly uid: number;
    readonly method: string;
    readonly args: any[];
};

export type ResponsePack = {
    readonly uid: number;
    readonly type: "result" | "error" | "progress";
    readonly data?: any;
};

export type SearchProgress = {
    readonly currentBlockCount: number;
    readonly resolutionCounter: number;
    readonly elapsedTimeMs: number;
};

export type Resolution =  {
    readonly materials: ItemStack[];
    readonly attributes: Record<EnchantingAttribute, number>;
};