import * as Bot from "../../src/index";

import { Player } from "./player";

export interface ItemStackInterface {
    count: number;
    id: string;
    nbt: NBT;
}

export interface NBT {
    [index: string]: JSONType
}


export type JSONType =
    | JSONType[]
    | {[index: string | number]: JSONType}
    | string
    | number
    | boolean
    | null
    | undefined;



export class ItemStack {

    public stack: ItemStackInterface;

    constructor (stack: ItemStackInterface) {
        this.stack = stack;
    }

}

export interface Recipe {
    result: { count: number; nbt: NBT, id: string },
    recipe: { count: number, id: string, nbt?: NBT }[],
}

export class Item {

    private static readonly all: {[index: string]: Item} = {};
    public static readonly id: string | undefined | null;

    // eslint-disable-next-line no-undef
    private inventoryInterval: NodeJS.Timer | undefined;

    public data: any = {};

    /**
     * 注册物品
     *
     * @param item - 物品类
     * @param id - 物品ID
     *
     */
    public static register (item: typeof Item, id: string | null = null) {
        // eslint-disable-next-line new-cap
        if (!id && typeof item.id === "string") this.all[item.id] = new item;
        // eslint-disable-next-line new-cap
        else if (id) this.all[id] = new item;
        return Item;
    }

    /**
     * 获取所以注册的物品
     *
     * @returns - {@link Item.all}
     *
     */
    public static getAll () {
        let result: typeof Item.all = {};
        for (let i of Object.keys(Item.all)) {
            result[i] = Item.all[i];
        }
        return result;
    }

    /**
     * 匹配注册的物品
     *
     * @param id - 物品ID
     * @returns - 物品
     *
     */
    public static match (id: string) {
        return id in Item.all ? Item.all[id] : new UnknownItem;
    }

    // 获取物品名称
    public getName (stack?: ItemStack, player?: Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult) { return "物品"; }
    // 获取物品提示
    public getTooltip (stack?: ItemStack, player?: Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult) { return ""; }

    // 在使用时执行
    public onUse (stack: ItemStack, player: Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult) { return false; }
    // 在丢弃时执行
    public onTake (stack: ItemStack, player: Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): boolean { return true; }
    // 在获得时执行
    public onGive (stack: ItemStack, player: Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): boolean { return true; }
    // 合成时执行
    public onCraft (stack: ItemStack, player: Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): boolean { return true; }
    // 在物品栏时执行
    public onInventoryTick (stack: ItemStack, player: Player) {}

    public clearInterval (stack: ItemStack, player: Player) { if (this.inventoryInterval) clearInterval(this.inventoryInterval as NodeJS.Timer); }
    public hasInterval (stack: ItemStack, player: Player) { return !!this.inventoryInterval; }
    public setInterval (stack: ItemStack, player: Player) {
        let that = this;
        if (!this.inventoryInterval) this.inventoryInterval = setInterval(() => that.onInventoryTick(stack, player));
    }

    // 转为格式化后的文本
    public toString (stack?: ItemStack, player?: Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): string {
        let constructor: typeof Item = this.constructor as any;
        let newStack: ItemStack = stack ?? new ItemStack({count: 0, id: constructor.id ?? UnknownItem.id, nbt: {}});
        return `${Item.match(newStack.stack.id).getName(newStack, player, event, commandArgs)} (${newStack.stack.id}) * ${newStack.stack.count}`;
    }

    // 返回当前ID
    public getId (): string { return (this.constructor as any).id; }

}

export class UnknownItem extends Item {
    public static id = Identifier("air");

    public getName(stack: ItemStack, player: Player): string { return "空气"; }
}

export class CopperCoinItem extends Item {
    public static id = Identifier("copper_coin");
    public getName (stack: ItemStack, player: Player): string { return "铜币"; }
    public getTooltip (stack: ItemStack, player: Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): string { return "基础货币"; }
    public onTake (stack: ItemStack, player: Player, event: Bot.GroupCommandEvent, commandArgs: Bot.ParseResult): boolean { return false; }
}

export class ExperienceItem extends Item {
    public static id = Identifier("experience");
    public getName (stack: ItemStack, player: Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): string { return "经验"; }
    public onTake (stack: ItemStack, player: Player, event: Bot.GroupCommandEvent, commandArgs: Bot.ParseResult): boolean { return false; }
}

Item.register(UnknownItem).register(CopperCoinItem).register(ExperienceItem);

export const players: Player[] = [];
export const recipes: Recipe[] = [];
export const signItems: {id: string, min: number, max: number, nbt: NBT}[] = [
    {id: CopperCoinItem.id, min: 20, max: 40, nbt: {}},
    {id: ExperienceItem.id, nbt: {}, min: 30, max: 50}
];

export function addRecipe (...recipe: Recipe[]) {
    recipes.push(...recipe);
    return { addRecipe };
}

export function Identifier (path: string, namespace?: string) {
    let left = namespace ? namespace : Bot.config.defaultId;
    return `${left}:${path}`;
}


Bot.Bot.client.on(
    "system.online",
    async () => {
        for (let i of Player.loadAllConfigs()) {
            Bot.Bot.client.logger.info(`加载玩家配置文件 ${i.configFilePath}`);
        }
    }
);

