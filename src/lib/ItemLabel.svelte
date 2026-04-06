<script lang="ts">
    import type { ItemInfo, ItemStack } from "../types";
    import { translate, type Language } from "./Language";
    import { toSignedString } from "./util";

    export let language: Language;
    export let itemInfoMap: Record<string, ItemInfo>;
    export let itemStack: ItemStack;

    function toImageSrc(id: string): string {
        const validString = id.replace("#", "_").replace(":", "__").replace(".", "_");
        return `./assets/texture/${validString}.png`;
    }

    $: info = itemInfoMap[itemStack.id];
</script>

<div class="ItemLabel">
    <div class="image-wrapper">
        <img alt={itemStack.id} src={toImageSrc(itemStack.id)} />
    </div>

    <div class="tooltips">
        <span class="name">{translate(language, itemStack.id)}</span>
        {#if info}
            {#if info.level !== 0}<span class="attribute-level">位阶：{toSignedString(info.level, 2)}（最高{info.maxLevel.toFixed(2)}）</span>{/if}
            {#if info.quanta !== 0}<span class="attribute-quanta">量子化：{toSignedString(info.quanta, 2)}%</span>{/if}
            {#if info.rectification !== 0}<span class="attribute-rectification">校准：{toSignedString(info.rectification, 2)}%</span>{/if}
            {#if info.arcana !== 0}<span class="attribute-arcana">阿卡那：{toSignedString(info.arcana, 2)}%</span>{/if}
            {#if info.clues !== 0}<span class="attribute-clues">魔咒线索：{toSignedString(info.clues)}</span>{/if}
        {/if}
    </div>
</div>

<style>
    .ItemLabel {
        display: flex;
        flex-direction: row;
        gap: 0.5em;
        background-color: rgb(20, 21, 22);
        padding: 0.5em;
        border-radius: 0.5em;
        border: 0.2em #afafaf solid;


        & .image-wrapper {
            width: 2em;
            height: 2em;
            margin-top: 0.2em;
            padding: 0.2em;
            border-radius: 0.2em;
            background-color: gray;

            & img {
                max-width: 100%;
                max-height: 100%;
            }
        }

        & > .tooltips {
            display: flex;
            flex-direction: column;
            align-items: start;

            & span.name {
                color: white;
            }
        }
    }
</style>
