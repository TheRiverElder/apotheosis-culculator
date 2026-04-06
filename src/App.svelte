<script lang="ts">
    import { onMount } from "svelte";
    import ItemLabel from "./lib/ItemLabel.svelte";
    import { translate, type Language } from "./lib/Language";
    import RangeInput from "./lib/RangeInput.svelte";
    import type { ItemInfo, ItemStack, ConditionRequest, Range } from "./types";
    import AlgorithmWorker from "./worker.js?worker";
    import { WorkerBridge } from "./WorkerBridge";
    import type { Resolution, SearchProgress } from "./WorkerTypes";
    import { keyBy, mapValues } from "lodash";
    import JSON5 from "json5";
    import { toSignedString } from "./lib/util";

    const worker: Worker = new AlgorithmWorker({ name: "algorithm" });
    const bridge = new WorkerBridge(worker);

    const SAVE_KEY = `ApotheosisCulculator_state`;

    onMount(() => {
        const savedData = localStorage.getItem(SAVE_KEY);
        if (savedData) {
            setTimeout(() => {
                try {
                    const data = JSON5.parse(savedData);
                    inventory = data.inventory;
                    requests = data.requests;
                    result = data.result;
                    itemInfoList = data.itemInfoList ?? itemInfoList;
                    displayMessage(`缓存数据已加载`);
                } catch {
                    displayMessage(`缓存数据加载失败`);
                }
            }, 0);
        }

        loadBuiltinItemInfoList()
            .then((list) => {
                bridge.setItemInfoList(list);
                itemInfoList = list;
                inventory =
                    inventory.length > 0
                        ? inventory
                        : list.map((it) => ({
                              id: it.id,
                              amount: 0,
                          }));
                displayMessage(`物品信息已加载（${itemInfoList.length}条）`);
            })
            .catch((err) => {
                displayMessage(`加载内置物品信息失败：${err}`);
            });

        loadBuiltinLanguageFile().then((lang) => {
            language = lang;
            displayMessage(`语言文件已加载（${Object.keys(language).length}条）`);
        });
    });

    async function loadBuiltinLanguageFile(): Promise<Language> {
        const response = await fetch("./lang_zh_CN.json");
        return response.json();
    }

    async function loadBuiltinItemInfoList(): Promise<ItemInfo[]> {
        const response = await fetch("./item_info_list.json5");
        const json5Str = await response.text();
        const res = JSON5.parse(json5Str);
        return Promise.resolve(res);
    }

    let language: Language = {};

    const RANGE_ANY: Range = {
        min: Number.NEGATIVE_INFINITY,
        max: Number.POSITIVE_INFINITY,
    };

    let itemInfoList: ItemInfo[] = [];
    $: itemInfoMap = mapValues(keyBy(itemInfoList, "id")) satisfies Record<string, ItemInfo>;

    let inventory: ItemStack[] = [];
    let requests: ConditionRequest[] = [
        { id: "level", initial: 0, range: RANGE_ANY },
        { id: "quanta", initial: 15, range: RANGE_ANY },
        { id: "rectification", initial: 0, range: RANGE_ANY },
        { id: "arcana", initial: 0, range: RANGE_ANY },
        { id: "clues", initial: 1, range: RANGE_ANY },
    ];
    let result: ItemStack[] = [];

    let messageBox: string[] = [];

    function replaceLastMessage(message: string) {
        messageBox[0] = message;
        messageBox = messageBox;
    }

    /**
     * 展示消息
     * @param message 要展示的消息，可以是多行消息
     */
    function displayMessage(message: string) {
        const lines = message.split("\n");
        messageBox.unshift(...lines);
        while (messageBox.length > 100) {
            messageBox.pop();
        }
        messageBox = messageBox;
    }

    /*
     * 将毫秒转为人类可读的中文时间字符串，高位为0则不显示
     * @param ms 毫秒数
     * @returns 格式化后的时间字符串，如：3时6分25秒782毫秒
     */
    function toHunmanReadableTime(ms: number): string {
        // 处理负数
        const num = Math.max(0, ms);

        // 单位换算
        const milliseconds = num % 1000;
        const seconds = Math.floor((num / 1000) % 60);
        const minutes = Math.floor((num / (1000 * 60)) % 60);
        const hours = Math.floor(num / (1000 * 60 * 60));

        // 按高位到低位组装，只保留非0值
        const parts: string[] = [];

        if (hours > 0) parts.push(`${hours}时`);
        if (minutes > 0) parts.push(`${minutes}分`);
        if (seconds > 0) parts.push(`${seconds}秒`);
        if (milliseconds > 0 || parts.length === 0) {
            parts.push(`${milliseconds}毫秒`);
        }

        return parts.join("");
    }

    function onClickButtonCulculate() {
        displayMessage("开始计算。");
        const inv = inventory.filter((it) => it.amount > 0);

        bridge
            .findResolution(inv, requests, ({ resolutionCounter, currentBlockCount, elapsedTimeMs }: SearchProgress) => {
                replaceLastMessage(`搜索中：#${resolutionCounter}/${currentBlockCount}块/${toHunmanReadableTime(elapsedTimeMs)}`);
            })
            .then((res: Resolution | null) => {
                if (res === null) {
                    displayMessage("没找到可用的组合。");
                } else {
                    const attributes = res.attributes;
                    displayMessage(`
                        计算完成：
                        位阶：${toSignedString(attributes.level, 2)}（最大${toSignedString(attributes.maxLevel, 2)}）
                        量子化：${toSignedString(attributes.quanta, 2)}
                        校准：${toSignedString(attributes.rectification, 2)}
                        阿卡那：${toSignedString(attributes.arcana, 2)}
                        魔咒线索：${toSignedString(attributes.clues, 0)}
                    `);
                    result = res.materials;
                }
            });
    }

    function onClickButtonStop() {
        displayMessage("停止搜索。");
        bridge.stopAlgorithm();
    }

    function onClickButtonSave() {
        const data = JSON5.stringify({
            inventory,
            requests,
            result,
            itemInfoList,
        });
        localStorage.setItem(SAVE_KEY, data);
        displayMessage(`缓存数据已保存`);
    }

    function onClickButtonAddNewItemInfo() {
        const newItemInfo: ItemInfo = {
            id: "custom:new_item_" + Date.now(),
            level: 0,
            maxLevel: 0,
            quanta: 0,
            rectification: 0,
            arcana: 0,
            clues: 0,
        };
        itemInfoList = [...itemInfoList, newItemInfo];
        inventory = [...inventory, { id: newItemInfo.id, amount: 0 }];
    }

    function deleteItemInfo(index: number) {
        itemInfoList.splice(index, 1);
        inventory.splice(index, 1);
        itemInfoList = itemInfoList;
        inventory = inventory;
    }

    let editingItemInfo: ItemInfo | null = null;
    function editItemInfo(index: number) {
        editingItemInfo = itemInfoList[index];
    }
</script>

<main>
    {#if editingItemInfo}
        <dialog open aria-modal="true">
            <div class="item-info-editor">
                <label>
                    <span>id</span>
                    <span class="spacer"></span>
                    <input bind:value={editingItemInfo.id} />
                </label>
                <label>
                    <span>{translate(language, "level")}</span>
                    <span class="spacer"></span>
                    <input type="number" bind:value={editingItemInfo.level} />
                </label>
                <label>
                    <span>{translate(language, "maxLevel")}</span>
                    <span class="spacer"></span>
                    <input type="number" bind:value={editingItemInfo.maxLevel} />
                </label>
                <label>
                    <span>{translate(language, "quanta")}</span>
                    <span class="spacer"></span>
                    <input type="number" bind:value={editingItemInfo.quanta} />
                </label>
                <label>
                    <span>{translate(language, "rectification")}</span>
                    <span class="spacer"></span>
                    <input type="number" bind:value={editingItemInfo.rectification} />
                </label>
                <label>
                    <span>{translate(language, "arcana")}</span>
                    <span class="spacer"></span>
                    <input type="number" bind:value={editingItemInfo.arcana} />
                </label>
                <label>
                    <span>{translate(language, "clues")}</span>
                    <span class="spacer"></span>
                    <input type="number" bind:value={editingItemInfo.clues} />
                </label>
            </div>
            <div>
                <button
                    on:click={() => {
                        editingItemInfo = null;
                        itemInfoList = itemInfoList;
                    }}>关闭</button
                >
            </div>
        </dialog>
    {/if}

    <!-- 现有材料清单，现在有的材料 -->
    <div class="inventory">
        <h2 class="title">{translate(language, "ui.title.inventory")}</h2>
        <div class="content list">
            {#each inventory as itemStack, index}
                <div class="flex-row">
                    <ItemLabel {language} {itemInfoMap} {itemStack} />
                    <span class="spacer"></span>
                    <div class="tools flex-column">
                        <label>
                            <span>{translate(language, "ui.text.stock")}</span>
                            <input type="number" bind:value={inventory[index].amount} />
                        </label>
                        <button class="small" on:click={() => editItemInfo(index)}>编辑</button>
                        <button class="small" on:click={() => deleteItemInfo(index)}>删除</button>
                    </div>
                </div>
            {/each}
            <div>
                <button on:click={onClickButtonAddNewItemInfo}>添加新材料</button>
            </div>
        </div>
    </div>

    <!-- 需求清单，每种条件的需求 -->
    <div class="requests">
        <h2 class="title">{translate(language, "ui.title.requests")}</h2>
        <div class="content">
            <div class="list">
                {#each requests as request, index}
                    <div class="flex-row">
                        <span>{translate(language, request.id)} </span>
                        <span class="spacer"></span>
                        <label>
                            <span>{translate(language, "ui.text.initial")}</span>
                            <input type="number" bind:value={request.initial} />
                        </label>
                        <RangeInput {language} value={request.range} onChange={(v) => (request.range = v)} />
                    </div>
                {/each}
            </div>
            <div class="button-bar">
                <button on:click={onClickButtonCulculate}>计算</button>
                <button on:click={onClickButtonStop}>停止</button>
                <button on:click={onClickButtonSave}>保存配置</button>
            </div>
            <div class="message-box">
                {#each messageBox as message}
                    <div>{message}</div>
                {/each}
            </div>
        </div>
    </div>

    <!-- 结果材料清单，需要使用到的方块 -->
    <div class="result">
        <h2 class="title">{translate(language, "ui.title.result")}</h2>
        <div class="content list">
            {#each result as itemStack}
                <div class="flex-row">
                    <ItemLabel {language} {itemInfoMap} {itemStack} />
                    <span class="spacer"></span>
                    <span class="amount">× {itemStack.amount}</span>
                </div>
            {/each}
        </div>
    </div>
</main>

<style>
    main {
        width: 100%;
        height: 100vh;
        overflow: hidden;
        display: flex;
        flex-direction: row;

        --sperator: 1px #c0c0c0 solid;

        & .item-info-editor {
            display: flex;
            flex-direction: column;
            text-align: start;
            gap: 0.5em;

            & label {
                display: flex;
                flex-direction: row;
            }
        }

        & > div {
            flex: 1;
            height: 100%;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            padding: 1em 0.5em;

            & > .title {
                text-align: start;
            }

            & > .content {
                flex: 1;
                overflow: hidden;
            }

            & .list {
                padding: 0.5em;
                border-radius: 0.5em;
                background-color: white;
                overflow-x: hidden;
                overflow-y: auto;
            }
        }

        & > .inventory {
            & .tools {
                display: flex;
                flex-direction: column;
                gap: 0.3em;

                & input {
                    font-size: 1em;
                    width: 3em;
                }
            }
        }

        & > .requests > .content {
            display: flex;
            flex-direction: column;
            gap: 1em;

            & > .message-box {
                flex: 1;
                border-radius: 0.5em;
                background-color: white;
                padding: 0.3em 0.5em;
                text-align: start;
                overflow-x: hidden;
                overflow-y: auto;

                &:not(:first-child) {
                    margin-top: 0.5em;
                }
            }
        }

        & > .result > .content {
            display: flex;
            flex-direction: column;
            gap: 1em;

            & .amount {
                font-size: 1.5em;
            }
        }

        & .flex-row {
            display: flex;
            flex-direction: row;
            padding: 0.3em 0.5em;
            border-bottom: var(--sperator);
        }

        & .spacer {
            flex: 1;
        }
    }
</style>
