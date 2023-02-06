import * as Bot from "../../src/index";

import { Item, ItemStack, ItemStackInterface, NBT, players, signItems, UnknownItem, recipes, Recipe } from "./item";

import fs from "fs";
import path from "path";
import _ from "lodash";

export const playerPath = path.join(Bot.botPath, "data/players");

export interface PlayerConfig {
    lastSign: number;
    inventory: ItemStackInterface[];
    health: number;
    maxHealth: number;
}

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

    /**
     * 获取玩家对象
     *
     * @constructor
     * @param id - 玩家ID
     * @returns [Player] 玩家
     *
     */
    public static of (id: number) {
        let player = players.find(i => i.id == Number(id));
        if (!player) player = new Player(id);
        return player;
    }

    public configFilePath: string;

    /**
     * 生成玩家对象
     *
     * @constructor
     * @param id - 玩家ID
     * @returns [Player] 玩家
     *
     */
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

    /**
     * 每日签到
     *
     * @param event - 群指令事件
     * @param args - 群指令参数
     *
     */
    public sign (event: Bot.GroupCommandEvent, args: Bot.ParseResult) {
        let now = new Date;
        let config = new Date(this.getConfig("lastSign", now.getTime()));
        if (config.getTime() != now.getTime() && config.getDay() == now.getDay() && config.getMonth() == now.getMonth() && config.getFullYear() == now.getFullYear()) return false;
        else {
            let result = [];
            this.setConfig({lastSign: now.getTime()});
            for (let i of signItems) {
                let item = {id: i.id, nbt: i.nbt, count: _.random(i.min, i.max)};
                this.giveItem(item);
                result.push(item);
            }
            return result;
        }
    }

    /**
     * 给予物品
     *
     * @param item - 物品堆叠
     * @returns [Boolean] 是否给予成功
     *
     */
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
        return given;
    }

    /**
     * 给予物品
     *
     * @param event - 群消息事件
     * @param commandArgs - 指令参数
     * @param item - 物品堆叠
     * @returns [Boolean] 是否给予成功
     *
     */
    public give (event: Bot.GroupCommandEvent, commandArgs: Bot.ParseResult, item: ItemStack | ItemStackInterface) {
        let newItem = item instanceof ItemStack ? item.stack : item;
        let give = false;
        if (Item.match(newItem.id).onGive(new ItemStack(newItem), this, event, commandArgs)) {
            this.giveItem(newItem);
            give = true;
        }
        this.removeEmptyItems();
        return give;
    }

    /**
     * 获取物品栏中[物品]的数量
     *
     * @param id - 物品ID
     * @param nbt - 物品NBT
     * @returns - 物品栏中的[物品]数量
     *
     */
    public count (id: string, nbt: NBT | undefined = undefined) {
        let inv = this.getConfig<ItemStackInterface[]>("inventory", []);
        let result = 0;
        for (let i of inv) {
            if (i.id == id) {
                if (typeof nbt == "undefined") result += i.count;
                else if (_.isEqual(i.nbt, nbt)) result += i.count;
            }
        }
        return result;
    }

    /**
     * 丢弃物品
     *
     * @param event - 群指令事件
     * @param commandArgs - 指令参数
     * @param id - 物品ID
     * @param count - 丢弃数量
     * @param nbt - 物品NBT
     * @param force - 是否强制丢弃
     * @returns - 是否丢弃成功
     *
     */
    public take (event: Bot.GroupCommandEvent, commandArgs: Bot.ParseResult, id: string, count: number, nbt?: NBT, force = false) {
        let give = { value: true };
        this.takeItem(
            id, count, nbt,
            (itemStack, player) => {
                give.value = Item.match(id).onTake(new ItemStack(itemStack), player, event, commandArgs);
                if (!force) return give.value;
                else return true;
            }
        );
        return give.value;
    }

    /**
     * 丢弃物品
     *
     * @param id - 物品ID
     * @param countNumber - 丢弃数量
     * @param nbt - 物品NBT
     * @param callback - 回调函数，在丢弃前触发
     * @returns - 是否丢弃成功
     *
     */
    public takeItem (id: string, countNumber: number, nbt?: NBT, callback?: (itemStack: ItemStackInterface, player: Player) => boolean) {
        let count = Math.trunc(countNumber);
        let currentCount = count;
        for (let i of Object.keys(this.getConfig("inventory", []))) {
            let itemStack: ItemStackInterface = _.get(this.config, ["inventory", i]);
            if ((itemStack.id == id) && (nbt ? (_.isEqual(itemStack.nbt, nbt)) : true)) {
                if (count > itemStack.count) {
                    let oldCount = itemStack.count;
                    itemStack.count = 0;
                    currentCount -= oldCount;
                } else {
                    let oldCount = itemStack.count;
                    itemStack.count = itemStack.count - currentCount;
                    currentCount -= itemStack.count;
                }
                let result = true;
                if (callback) result = callback(itemStack, this);
                let config = this.config;
                _.set(config, ["inventory", i], itemStack);
                if (result) this.setConfig(config, true);
                break;
            }
        }
        this.removeEmptyItems();
        return this;
    }

    // 删除物品栏中的空物品
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
    // 获取生命值
    public getHealth () { return Number(this.getConfig("health", this.getMaxHealth()).toFixed(4)); }
    // 获取最大生命值
    public getMaxHealth () { return this.getConfig("maxHealth", 40); }
    // 获取生命值百分比
    public getHealthPercentage () { return Number(this.getConfig("health", 40) / this.getConfig("maxHealth", 40));}
    // 设置生命值
    public setHealth (health: number) { this.setConfig({health: Number(health)}); this.refreshHealth(); }
    // 设置最大生命值
    public setMaxHealth (maxHealth: number) { this.setConfig({maxHealth: Number(maxHealth)}); this.refreshHealth(); }

    /**
     * 使用物品
     *
     * @param id - 物品ID
     * @param nbt - 物品NBT
     * @returns - 是否使用成功
     *
     */
    public useItem (id: string, nbt?: NBT | undefined) {
        let config = this.config;
        for (let i of config.inventory) {
            if (i.id == id && (nbt ? _.isEqualWith(i.nbt, nbt) : true)) {
                let result = Item.match(id).onUse(new ItemStack(i), this);
                config = this.config;
                this.setConfig(config);
                return result;
            }
        }
        return false;
    }

    /**
     * 使用物品
     *
     * @param event - 群指令事件
     * @param args - 指令参数
     * @param id - 物品ID
     * @param nbt - 物品NBT
     * @returns - 是否使用成功
     *
     */
    public use (event: Bot.GroupCommandEvent, args: Bot.ParseResult, id: string, nbt?: NBT | undefined) {
        let config = this.config;
        for (let i of config.inventory) {
            config = this.config;
            if (i.id == id && (nbt ? _.isEqualWith(i.nbt, nbt) : true)) {
                let result = Item.match(id).onUse(new ItemStack(i), this, event, args);
                config = this.config;
                this.setConfig(config);
                return result;
            }
        }
        return false;
    }

    // 刷新生命值
    refreshHealth () {
        if (this.getMaxHealth() < this.getHealth()) this.setHealth(this.getMaxHealth());
        if (this.getMaxHealth() < 40) this.setMaxHealth(40);
        if (this.getHealth() < 0) this.setHealth(this.getMaxHealth());
    }

    /**
     * 合成一个物品
     *
     * @param id - 合成物品ID
     * @param plan - 合成方案
     * @returns - [是否合成, 材料不足, 配方]: 如果物品无法合成，返回[false]，如果物品材料不足，返回[false, true]，否则返回[false, true, Recipe]
     *
     */
    craft (id: string, plan: number): [false, true] | [true, false, Recipe] | [false] {
        let inv: PlayerConfig["inventory"] = this.getConfig("inventory", []);
        let results = recipes.filter(i => i.result.id == id);
        if (results) {
            let result = results[plan];
            for (let i of result.recipe) {
                if (!(this.count(i.id, i.nbt) >= i.count)) return [false, true];
                else this.takeItem(i.id, i.count, i.nbt);
            }
            let stack = {id: result.result.id, nbt: result.result.nbt, count: result.result.count};
            if (Item.match(result.result.id).onCraft(new ItemStack(stack), this)) {
                this.giveItem(stack);
                return [true, false, result];
            } else return [false];
        } else return [false];
    }
}
