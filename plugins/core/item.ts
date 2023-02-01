import * as Bot from "../../src/index";

import path from "path";
import fs from "fs";
import _ from "lodash";


export const playerPath = path.join(Bot.botPath, "data/players");

export interface ItemStackInterface {
    count: number;
    id: string;
    nbt: NBT;
}

export interface NBT {
    [index: string]: JSONType
}

export interface PlayerConfig {
    inventory?: ItemStackInterface[];
}

export type JSONType =
    | JSONType[]
    | {[index: string | number]: JSONType}
    | string
    | number
    | boolean
    | null
    | undefined;


export class Player {

    public readonly id: number;

    public static * loadAllConfigs () {
        fs.mkdirSync(playerPath, {recursive: true});
        for (let i of fs.readdirSync(playerPath)) {
            try {
                yield new Player(Number(i.split(".")[0]));
            } catch {}
        }
    }

    public static of (id: number) {
        let player = players.find(i => i.id == Number(id));
        if (!player) player = new Player(id);
        return player;
    }

    public configFilePath: string;

    constructor (id: number) {
        this.id = Number(id);
        this.configFilePath = path.join(playerPath, String(Number(id)) + ".json");
        this.removeEmptyItems();
        if (!players.find(i => i.id == Number(id))) {
            players.push(this);
        }
    }

    public get config () {
        if (!fs.existsSync(this.configFilePath)) {
            fs.mkdirSync(path.dirname(this.configFilePath), {recursive: true});
            fs.writeFileSync(this.configFilePath, "{}");
        }
        return JSON.parse(fs.readFileSync(this.configFilePath).toString());
    }

    public getConfig <T> (configPath: _.PropertyPath, defaultValue: T): T {
        let result = _.get(this.config, configPath, defaultValue);
        if (result == defaultValue) {
            let config = this.config;
            _.set(config, configPath, defaultValue);
            fs.mkdirSync(playerPath, {recursive: true});
            fs.writeFileSync(this.configFilePath, JSON.stringify(config));
        }
        return result;
    }

    public setConfig <K extends keyof PlayerConfig> (newConfig: ((prevState: Readonly<PlayerConfig>, props: Readonly<PlayerConfig>) => (Pick<PlayerConfig, K> | PlayerConfig | null)) | (Pick<PlayerConfig, K> | PlayerConfig | null), replace = false) {
        fs.writeFileSync(this.configFilePath, JSON.stringify(replace ? newConfig : _.merge(this.config, newConfig)));
    }

    public giveItem (item: ItemStackInterface) {
        let given = false;
        for (let i of Object.keys(this.getConfig("inventory", []))) {
            let itemStack: ItemStackInterface = _.get(this.config, ["inventory", i]);
            if (itemStack.id == item.id && _.isEqual(itemStack.nbt, item.nbt)) {
                itemStack.count += item.count;
                itemStack.count = Math.trunc(itemStack.count);
                given = true;
                let config = this.config;
                _.set(config, ["inventory", i], itemStack);
                this.setConfig(config, true);
                break;
            }
        }
        if (!given) {
            let config = this.config;
            config.inventory.push(item);
            this.setConfig(config, true);
        }
        return this;
    }

    public give (item: ItemStack | ItemStackInterface, event: Bot.GroupCommandEvent, commandArgs: Bot.ParseResult) {
        let newItem = item instanceof ItemStack ? item.stack : item;
        let give = false;
        if (Item.match(newItem.id).onGive(new ItemStack(newItem), this, event, commandArgs)) {
            this.giveItem(newItem);
            give = true;
        }
        this.removeEmptyItems();
        return give;
    }

    public take (event: Bot.GroupCommandEvent, commandArgs: Bot.ParseResult, id: string, count: number, nbt?: NBT) {
        let give = { value: true };
        this.takeItem(
            id, count, nbt,
            (itemStack, player) => {
                give.value = Item.match(id).onTake(new ItemStack(itemStack), player, event, commandArgs);
                return give.value;
            }
        );
        return give.value;
    }

    public takeItem (id: string, countNumber: number, nbt?: NBT, callback?: (itemStack: ItemStackInterface, player: Player) => boolean) {
        let count = Math.trunc(countNumber);
        let currentCount = count;
        for (let i of Object.keys(this.getConfig("inventory", []))) {
            let itemStack: ItemStackInterface = _.get(this.config, ["inventory", i]);
            if (itemStack.id == id && nbt ? (_.isEqual(itemStack.nbt, nbt)) : true) {
                if (count > itemStack.count) {
                    let oldCount = itemStack.count;
                    itemStack.count = 0;
                    currentCount -= oldCount;
                } else {
                    let oldCount = itemStack.count;
                    itemStack.count = itemStack.count - currentCount;
                    currentCount -= itemStack.count;
                }
                let config = this.config;
                let result = true;
                if (callback) result = callback(itemStack, this);
                _.set(config, ["inventory", i], itemStack);
                if (result) this.setConfig(config, true);
                break;
            }
        }
        this.removeEmptyItems();
        return this;
    }

    public removeEmptyItems(): void {
        let config = this.config;
        if (!config.inventory) config.inventory = [];
        config.inventory = config.inventory.filter(
            (i: ItemStackInterface) => {
                if (!((i.count >= 1) && !(Item.match(i.id) instanceof UnknownItem))) {
                    if (Item.match(i.id).hasInterval(new ItemStack(i), this)) Item.match(i.id).clearInterval(new ItemStack(i), this);
                    return false;
                }
                if (!(Item.match(i.id).hasInterval(new ItemStack(i), this))) Item.match(i.id).setInterval(new ItemStack(i), this);
                return true;
            }
        );
        this.setConfig(config, true);
    }

}

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

    public getName (stack: ItemStack, player: Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult) { return "物品"; }
    public getTooltip (stack: ItemStack, player: Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult) { return ""; }

    public onUse (stack: ItemStack, player: Player, event: Bot.GroupCommandEvent, commandArgs: Bot.ParseResult) {}
    public onTake (stack: ItemStack, player: Player, event: Bot.GroupCommandEvent, commandArgs: Bot.ParseResult): boolean { return true; }
    public onGive (stack: ItemStack, player: Player, event: Bot.GroupCommandEvent, commandArgs: Bot.ParseResult): boolean { return true; }
    public onInventoryTick (stack: ItemStack, player: Player) {}

    public clearInterval (stack: ItemStack, player: Player) { if (this.inventoryInterval) clearInterval(this.inventoryInterval as NodeJS.Timer); }
    public hasInterval (stack: ItemStack, player: Player) { return !!this.inventoryInterval; }
    public setInterval (stack: ItemStack, player: Player) {
        let that = this;
        if (!this.inventoryInterval) this.inventoryInterval = setInterval(() => that.onInventoryTick(stack, player));
    }
}

export class UnknownItem extends Item {
    public static id = "swbot:unknown";

    public getName(stack: ItemStack, player: Player): string { return "未知"; }
}

export class CopperCoinItem extends Item {
    public static id = "swbot:copper_coin";
    public getName (stack: ItemStack, player: Player): string { return "铜币"; }
    public getTooltip (stack: ItemStack, player: Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): string { return "基础货币"; }
    public onTake (stack: ItemStack, player: Player, event: Bot.GroupCommandEvent, commandArgs: Bot.ParseResult): boolean { return false; }
}

Item.register(UnknownItem).register(CopperCoinItem);

export const players: Player[] = [];

for (let i of Player.loadAllConfigs()) {
    Bot.Bot.client.logger.info(`加载玩家配置文件 ${i.configFilePath}`);
}
