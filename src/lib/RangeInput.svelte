<script lang="ts">
    import type { Range } from "../types";

    // 只读 value，绝不修改
    export let value: Range;
    export let onChange: (range: Range) => void;

    // 向外派发新的区间对象（父级整体替换）
    function dispatchUpdate(newRange: Range) {
        onChange(newRange);
    }

    // 处理 min 变更
    function handleMinChange(newMin: number) {
        dispatchUpdate({ ...value, min: newMin });
    }

    // 处理 max 变更
    function handleMaxChange(newMax: number) {
        dispatchUpdate({ ...value, max: newMax });
    }

    // 工具：判断是否无限
    function isInfinite(n: number) {
        return !isFinite(n);
    }
</script>

<div class="RangeInput">
    <!-- 最小值 -->
    <div class="item">
        <label>最小</label>
        {#if isInfinite(value.min)}
            <input type="text" value="-∞" disabled class="disabled" />
        {:else}
            <input type="number" value={value.min} on:input={(e) => handleMinChange(+e.currentTarget.value)} />
        {/if}

        <label class="chk">
            <input type="checkbox" checked={isInfinite(value.min)} on:change={(e) => handleMinChange(e.currentTarget.checked ? Number.NEGATIVE_INFINITY : 0)} />
            <span>-∞</span>
        </label>
    </div>

    <!-- 最大值 -->
    <div class="item">
        <label>最大</label>
        {#if isInfinite(value.max)}
            <input type="text" value="+∞" disabled class="disabled" />
        {:else}
            <input type="number" value={value.max} on:input={(e) => handleMaxChange(+e.currentTarget.value)} />
        {/if}

        <label class="chk">
            <input
                type="checkbox"
                checked={isInfinite(value.max)}
                on:change={(e) => handleMaxChange(e.currentTarget.checked ? Number.POSITIVE_INFINITY : 100)}
            />
            <span>+∞</span>
        </label>
    </div>
</div>

<style>
    .RangeInput {
        font-size: 0.8em;

        & .range {
            display: flex;
            gap: 16px;
            margin: 6px 0;
        }
        & .item {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        & input {
            font-size: 1em;
        }
        & .disabled {
            background: #f1f1f1;
            border: 1px solid #ddd;
        }
        & .chk {
            white-space: nowrap;
        }
    }
</style>
