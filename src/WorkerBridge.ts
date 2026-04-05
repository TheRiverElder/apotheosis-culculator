import type { ItemInfo, ItemStack, ConditionRequest } from "./types";
import type { CommandPack, Resolution, ResponsePack, SearchProgress } from "./WorkerTypes";


type Callbacks = {
    readonly resolve: (result: any) => void,
    readonly reject: (error: Error) => void
    readonly onProgress?: (progress: any) => void
};

export class WorkerBridge {

    private _callbacks = new Map<number, Callbacks>();
    private _nextUid = 0;

    constructor(public readonly worker: Worker) {
        worker.addEventListener('message', this._handleMessage);
    }

    dispose() {
        [...this._callbacks.values()].forEach(callbacks => callbacks.reject(new Error("WorkerBridge disposed")));
        this.worker.removeEventListener('message', this._handleMessage);
    }

    private _handleMessage = (event: MessageEvent<ResponsePack>) => {

        const { uid, type, data } = event.data;

        const callbacks = this._callbacks.get(uid);
        if (!callbacks) return;

        switch (type) {
            case "result":
                callbacks.resolve(data);
                this._callbacks.delete(uid);
                break;
            case "error":
                callbacks.reject(new Error(data));
                this._callbacks.delete(uid);
                break;
            case "progress":
                callbacks.onProgress?.(data);
        }

    };

    private _getNextUid(): number {
        return ++this._nextUid;
    }

    async findResolution(inventory: ItemStack[], requests: ConditionRequest[], onProgress?: (progress: SearchProgress) => void): Promise<Resolution | null> {
        const uid = this._getNextUid();
        this.worker.postMessage({
            uid,
            method: 'findResolution',
            args: [inventory, requests],
        } satisfies CommandPack);
        return new Promise((resolve, reject) => {
            this._callbacks.set(uid, { resolve, reject, onProgress });
        });
    }

    async setItemInfoList(itemInfoList: ItemInfo[]): Promise<void> {
        const uid = this._getNextUid();
        this.worker.postMessage({
            uid,
            method: 'setItemInfoList',
            args: [itemInfoList],
        } satisfies CommandPack);
        return new Promise((resolve, reject) => {
            this._callbacks.set(uid, { resolve, reject });
        });
    }

    async stopAlgorithm(): Promise<void> {
        const uid = this._getNextUid();
        this.worker.postMessage({
            uid,
            method: 'stopAlgorithm',
            args: [],
        } satisfies CommandPack);
        return new Promise((resolve, reject) => {
            this._callbacks.set(uid, { resolve, reject });
        });
    }
}