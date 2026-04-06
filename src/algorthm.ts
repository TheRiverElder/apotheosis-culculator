
import { keyBy, mapValues } from "lodash";
import type { ItemInfo, ItemStack, ConditionRequest, EnchantingAttribute, Range } from "./types";
import type { Resolution, SearchProgress } from "./WorkerTypes";

type MappedRequests = {
    [key in EnchantingAttribute]: Range;
};

type SearchState = {
    attributes: Record<EnchantingAttribute, number>,
    used: Record<string, number>;
    count: number; // 缓存used字段中所有值的总和，方便读取，减少重复计算
};

const RANGE_ANY: Range = {
    min: Number.NEGATIVE_INFINITY,
    max: Number.POSITIVE_INFINITY,
};

export function setItemInfoList(list: ItemInfo[]) {
    itemInfoList = list;
    itemInfoMap = mapValues(keyBy(list, 'id'));
}


let itemInfoList: ItemInfo[] = [];

let itemInfoMap: Record<string, ItemInfo> = {};

// 使用广度优先算法+剪枝
// 此时传入的inventory已需要时已经筛选过数量大于0的
export function findResolution(
    inputInventory: ItemStack[],
    inputRequests: ConditionRequest[],
    onProgress?: (progress: SearchProgress) => void,
    shouldStop?: () => boolean,
): Resolution | null {
    

    // 将需求也转为映射，方便查询
    const requests: MappedRequests = {
        level: RANGE_ANY,
        maxLevel: RANGE_ANY, // 这个字段其实没用
        quanta: RANGE_ANY,
        rectification: RANGE_ANY,
        arcana: RANGE_ANY,
        clues: RANGE_ANY,
    };
    for (const r of inputRequests) {
        requests[r.id] = { min: r.range.min, max: r.range.max };
    }

    function isUsefulItem(id: string): boolean {
        const info = itemInfoMap[id];
        if (!info) return false;
        
        function isNoLimit(range: Range) {
            return range === RANGE_ANY || (!Number.isFinite(range.min) && !Number.isFinite(range.max));
        }

        // TODO：检测是否对实现需求有影响
        let useful: boolean = false;
        if (info.level !== 0 && !isNoLimit(requests.level)) useful ||= true;
        if (info.maxLevel >= requests.level.min) useful ||= true;
        if (info.quanta !== 0 && !isNoLimit(requests.quanta)) useful ||= true;
        if (info.rectification !== 0 && !isNoLimit(requests.rectification)) useful ||= true;
        if (info.arcana !== 0 && !isNoLimit(requests.arcana)) useful ||= true;
        if (info.clues !== 0 && !isNoLimit(requests.clues)) useful ||= true;

        return useful;
    }

    // 先将库存转为映射，方便查询，没有小于0的值
    const inventoryMap: Record<string, number> = {};
    const inventory: ItemStack[] = [];
    for (const { id, amount } of inputInventory) {
        if (amount > 0) {
            const useful = isUsefulItem(id);
            console.log(id, 'useful', useful)
            if (useful) {
                inventoryMap[id] = (inventoryMap[id] ?? 0) + amount;
                inventory.push({ id, amount });
            } 
        }
    }


    // 状态（任务）队列，实现广度优先
    const queue: SearchState[] = [
        {
            attributes: {
                level: inputRequests.find(it => it.id === 'level')?.initial ?? 0,
                maxLevel: inputRequests.find(it => it.id === 'maxLevel')?.initial ?? 0,
                quanta: inputRequests.find(it => it.id === 'quanta')?.initial ?? 0,
                rectification: inputRequests.find(it => it.id === 'rectification')?.initial ?? 0,
                arcana: inputRequests.find(it => it.id === 'arcana')?.initial ?? 0,
                clues: inputRequests.find(it => it.id === 'clues')?.initial ?? 0,
            },
            used: {},
            count: 0,
        },
    ];

    const visited = new Set<string>();
    const startTime = Date.now();
    let counter = 0;
    while (queue.length > 0) {
        if (shouldStop?.()) return null;

        const currentState = queue.shift();
        if (!currentState) continue;
        // console.log("currentState", currentState);
        counter++;

        if (counter % 10000 === 0) {
            onProgress?.({
                currentBlockCount: currentState.count,
                resolutionCounter: counter,
                elapsedTimeMs: Date.now() - startTime,
            });
        }

        const currentAttributes = currentState.attributes;


        const usedItemStackList = Object.entries(currentState.used).map(([id, amount]) => ({ id, amount }));
        const satisfyRequests = matchesCondition(requests, currentState.attributes);
        const satisfyInventory = usedItemStackList.every(({ id, amount: usedAmout }) => usedAmout <= (inventoryMap[id] ?? 0));
        // console.log("satisfyRequests", satisfyRequests);
        // console.log("satisfyInventory", satisfyInventory);

        // 库存不满足，则之后再加方块也没有意义，直接跳过这个状态
        if (!satisfyInventory) continue;

        // 若属性满足需求，则可以返回了
        if (satisfyRequests) {
            console.log("find", currentState);
            return {
                materials: usedItemStackList,
                attributes: currentAttributes,
            };
        }

        // 如果已经满了，则不再继续往后添加
        if (currentState.count >= 32) continue;

        for (const { id } of inventory) {
            // console.log("id", id)

            const itemInfo = itemInfoMap[id];
            if (!itemInfo) continue;

            const nextUsed: SearchState["used"] = Object.assign({}, currentState.used);
            nextUsed[id] = (nextUsed[id] ?? 0) + 1;

            const newCount = currentState.count + 1;
            const newAttrs: SearchState["attributes"] = {
                level: currentAttributes.level + itemInfo.level,
                maxLevel: Math.max(currentAttributes.maxLevel, itemInfo.maxLevel),
                quanta: currentAttributes.quanta + itemInfo.quanta,
                rectification: currentAttributes.rectification + itemInfo.rectification,
                arcana: currentAttributes.arcana + itemInfo.arcana,
                clues: currentAttributes.clues + itemInfo.clues,
            };

            // 之前有实现过这种状态，说明达成这种状态有更好的或者已经满足要求了，所以跳过
            const key = `${newAttrs.level}|${newAttrs.maxLevel}|${newAttrs.quanta}|${newAttrs.rectification}|${newAttrs.arcana}|${newCount}`;
            if (visited.has(key)) continue;
            visited.add(key);

            const newState: SearchState = {
                attributes: newAttrs,
                used: nextUsed,
                count: newCount,
            };

            queue.push(newState);
        }
    }

    // 实在找不到，则返回null
    return null;
}

function matchesCondition(requests: MappedRequests, attributes: SearchState["attributes"]): boolean {
    return (
        isInRange(Math.min(attributes.level, attributes.maxLevel), requests.level) &&
        isInRange(attributes.quanta, requests.quanta) &&
        isInRange(attributes.rectification, requests.rectification) &&
        isInRange(attributes.arcana, requests.arcana) &&
        isInRange(attributes.clues, requests.clues)
    );
}

function isInRange(value: number, range: Range) {
    return value >= range.min && value <= range.max;
}