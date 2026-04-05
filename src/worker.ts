import { findResolution, setItemInfoList } from "./algorthm";
import type { ConditionRequest, ItemInfo, ItemStack } from "./types";
import type { CommandPack, ResponsePack } from "./WorkerTypes";


type BufferedEvent = {
    readonly nativeEvent: MessageEvent<CommandPack>;
    readonly onProgress?: (progress: any) => void;
};

type PackHandler = (bufferedEvent: BufferedEvent, ...args: any[]) => Promise<any>;

const handlers: Record<string, PackHandler> = {};

function registerHandler(name: string, fn: PackHandler) {
    handlers[name] = fn;
}

function handleMessage(event: MessageEvent<CommandPack>) {
    const { uid, method, args } = event.data;
    const handler = handlers[method];
    const bufferedEvent: BufferedEvent = {
        nativeEvent: event,
        onProgress: (progress) => postMessage({ uid, type: "progress", data: progress } satisfies ResponsePack),
    };
    handler?.(bufferedEvent, ...args)
        .then((res) => postMessage({ uid, type: "result", data: res } satisfies ResponsePack))
        .catch((err) => {
            postMessage({ uid, type: "error", data: err.message } satisfies ResponsePack);
        });
}

addEventListener("message", handleMessage);

let shouldAlgorithmStop = false;
// 注册findResolution的处理器
registerHandler(findResolution.name, (e: BufferedEvent, inventory: ItemStack[], requests: ConditionRequest[]) => {
    return new Promise((resolve, reject) => {
        try {
            shouldAlgorithmStop = false;
            const result = findResolution(inventory, requests, e.onProgress, () => shouldAlgorithmStop);
            resolve(result);
        } catch (err) {
            reject(err);
        }
    });
});

registerHandler(setItemInfoList.name, (e: BufferedEvent, infoList: ItemInfo[]) => {
    setItemInfoList(infoList);
    return Promise.resolve();
});

registerHandler("stopAlgorithm", (e: BufferedEvent) => {
    shouldAlgorithmStop = true;
    return Promise.resolve();
});