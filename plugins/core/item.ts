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

export interface UserConfig {
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


class Player {

    public readonly id: number;

    public static * loadAllConfigs () {
        fs.mkdirSync(playerPath, {recursive: true});
        for (let i of fs.readdirSync(playerPath)) {
            try {
                yield new Player(Number(i.split(".")[0]));
            } catch {}
        }
    }

    public configFilePath: string;

    constructor (id: number) {
        this.id = Number(id);
        this.configFilePath = path.join(playerPath, String(Number(id)) + ".json");
        this.removeEmptyItems();
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

    public setConfig <K extends keyof UserConfig> (newConfig: ((prevState: Readonly<UserConfig>, props: Readonly<UserConfig>) => (Pick<UserConfig, K> | UserConfig | null)) | (Pick<UserConfig, K> | UserConfig | null), replace = false) {
        fs.writeFileSync(this.configFilePath, JSON.stringify(replace ? newConfig : _.merge(newConfig, this.config)));
    }

    public give (item: ItemStackInterface) {
        let given = false;
        for (let i of Object.keys(this.getConfig("inventory", []))) {
            let itemStack: ItemStackInterface = _.get(this.config, ["inventory", i]);
            if (itemStack.id == item.id && _.isEqual(itemStack.nbt, item.nbt)) {
                itemStack.count += item.count;
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
        Item.match(item.id).onGive(new ItemStack(item), this);
        this.removeEmptyItems();
        return this;
    }

    public take (id: string, count: number, nbt?: NBT) {
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
                Item.match(id).onGive(new ItemStack(itemStack), this);
                _.set(config, ["inventory", i], itemStack);
                this.setConfig(config, true);
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
    public static readonly id: string;

    // eslint-disable-next-line no-undef
    private _inventoryInterval: NodeJS.Timer | undefined;

    public static register (item: typeof Item, id: string | null = null) {
        // eslint-disable-next-line new-cap
        this.all[id ? id : item.id] = new item;
        return Item;
    }

    public static match (id: string) {
        return id in Item.all ? Item.all[id] : new UnknownItem;
    }

    public onUse (stack: ItemStack, player: Player) {}
    public onTake (stack: ItemStack, player: Player) {}
    public onGive (stack: ItemStack, player: Player) {}
    public onInventoryTick (stack: ItemStack, player: Player) {}

    public setInterval (stack: ItemStack, player: Player) {
        let that = this;
        if (!this._inventoryInterval) {
            this._inventoryInterval = setInterval(() => that.onInventoryTick(stack, player));
        }
    }

    public clearInterval (stack: ItemStack, player: Player) {
        // eslint-disable-next-line no-undef
        if (this._inventoryInterval) clearInterval(this._inventoryInterval as NodeJS.Timer);
    }

    public hasInterval (stack: ItemStack, player: Player) {
        return !!this._inventoryInterval;
    }

}

export class UnknownItem extends Item {
    public static id = "swbot:unknown";
}

export class CoinItem extends Item {
    public static id = "swbot:coin";
}

Item.register(UnknownItem).register(CoinItem);

for (let i of Player.loadAllConfigs()) {
    Bot.Bot.client.logger.info(`加载玩家配置文件 ${i.configFilePath}`);
}
