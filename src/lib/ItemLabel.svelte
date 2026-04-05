<script lang="ts">
    import type { ItemInfo, ItemStack } from "../types";
    import { translate, type Language } from "./Language";
    import { toSignedString } from "./util";

    export let language: Language;
    export let itemInfoMap: Record<string, ItemInfo>;
    export let itemStack: ItemStack;

    $: info = itemInfoMap[itemStack.id];
</script>

<div class="ItemLabel">
    <div class="image-wrapper"></div>

    <div class="tooltips">
        <span>{translate(language, itemStack.id)}</span>
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

        & > .tooltips {
            display: flex;
            flex-direction: column;
            align-items: start;
        }
    }
</style>
