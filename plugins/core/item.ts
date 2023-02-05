import * as Bot from "../../src/index";

import path from "path";

import { Player } from "./player";

export const playerPath = path.join(Bot.botPath, "data/players");

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

export class Item {

    private static readonly all: {[index: string]: Item} = {};
    public static readonly id: string | undefined | null;

    // eslint-disable-next-line no-undef
    private inventoryInterval: NodeJS.Timer | undefined;

    public data: any = {};

    public static register (item: typeof Item, id: string | null = null) {
        // eslint-disable-next-line new-cap
        if (!id && typeof item.id === "string") this.all[item.id] = new item;
        // eslint-disable-next-line new-cap
        else if (id) this.all[id] = new item;
        return Item;
    }

    public static getAll () {
        let result: typeof Item.all = {};
        for (let i of Object.keys(Item.all)) {
            result[i] = Item.all[i];
        }
        return result;
    }

    public static match (id: string) {
        return id in Item.all ? Item.all[id] : new UnknownItem;
    }

    public getName (stack?: ItemStack, player?: Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult) { return "物品"; }
    public getTooltip (stack?: ItemStack, player?: Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult) { return ""; }

    public onUse (stack: ItemStack, player: Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult) { return false; }
    public onTake (stack: ItemStack, player: Player, event: Bot.GroupCommandEvent, commandArgs: Bot.ParseResult): boolean { return true; }
    public onGive (stack: ItemStack, player: Player, event: Bot.GroupCommandEvent, commandArgs: Bot.ParseResult): boolean { return true; }
    public onInventoryTick (stack: ItemStack, player: Player) {}

    public clearInterval (stack: ItemStack, player: Player) { if (this.inventoryInterval) clearInterval(this.inventoryInterval as NodeJS.Timer); }
    public hasInterval (stack: ItemStack, player: Player) { return !!this.inventoryInterval; }
    public setInterval (stack: ItemStack, player: Player) {
        let that = this;
        if (!this.inventoryInterval) this.inventoryInterval = setInterval(() => that.onInventoryTick(stack, player));
    }

    public toString (stack?: ItemStack, player?: Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): string {
        let constructor: typeof Item = this.constructor as any;
        let newStack: ItemStack = stack ?? new ItemStack({count: 0, id: constructor.id ?? UnknownItem.id, nbt: {}});
        return `${Item.match(newStack.stack.id).getName(newStack, player, event, commandArgs)} (${newStack.stack.id}) * ${newStack.stack.count}`;
    }

    public getIcon (stack: ItemStack, player: Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): Buffer { return Bot.cacheLocalFile(path.join(resourcePath, "unknown.png")); }
}

export class UnknownItem extends Item {
    public static id = Identifier("air");

    public getName(stack: ItemStack, player: Player): string { return "空气"; }
}

export class CopperCoinItem extends Item {
    public static id = Identifier("copper_coin");
    public getName (stack: ItemStack, player: Player): string { return "铜币"; }
    public getTooltip (stack: ItemStack, player: Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): string { return "基础货币"; }
    public getIcon (stack: ItemStack, player: Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): Buffer { return Bot.cacheLocalFile(path.join(resourcePath, "copper_coin.png")); }
    public onTake (stack: ItemStack, player: Player, event: Bot.GroupCommandEvent, commandArgs: Bot.ParseResult): boolean { return false; }
}

export class ExperienceItem extends Item {
    public static id = Identifier("experience");
    public getName (stack: ItemStack, player: Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): string { return "经验"; }
    public onTake (stack: ItemStack, player: Player, event: Bot.GroupCommandEvent, commandArgs: Bot.ParseResult): boolean { return false; }
    public getIcon (stack: ItemStack, player: Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): Buffer { return Bot.cacheLocalFile(path.join(resourcePath, "experience.png")); }
}

Item.register(UnknownItem).register(CopperCoinItem).register(ExperienceItem);

export const players: Player[] = [];
export const signItems: {id: string, min: number, max: number, nbt: NBT}[] = [
    {id: CopperCoinItem.id, min: 20, max: 40, nbt: {}},
    {id: ExperienceItem.id, nbt: {}, min: 30, max: 50}
];
export const resourcePath = path.join(Bot.botPath, "resources/core/textures/");

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

