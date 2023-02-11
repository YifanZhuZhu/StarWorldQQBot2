import BotCore from "~/plugins/core";
import Bot from "swbot";

import path from "path";
import json5 from "json5";
import fs from "fs";
import _ from "lodash";

export function parseIdentifier (token: Bot.Token<"String" | "Identifier">) {
    if (token.type == "String") return json5.parse(token.value) as string;
    else if (token.type == "Identifier") return token.value as string;
    else return "";
}

export const marketPath = path.join(Bot.botPath, "data/market.json");

@Bot.Utils.onCommand(
    `${Bot.Command.commandPrefix.Normal}市场`,
    [
        `{{command}}`,
        `{{command}} 卖 [价格] [物品栏槽] [数量]`,
        `{{command}} 买 [商品号]`,
        `{{command}} 下架 [商品号]`
    ].join("\n"),
    `全球市场`
)
export class MarketCommand extends Bot.Utils.Command {

    async handle (event: Bot.GroupCommandEvent, ...args: Bot.ParseResult): Promise<boolean> {
        if (args.length == 0) return await this.onView(event, args);
        else if (args.length == 4 && parseIdentifier(args[0].value as Bot.Token<any>) == "卖") return await this.onSell(event, args);
        else if (args.length == 2 && parseIdentifier(args[0].value as Bot.Token<any>) == "买") return await this.onBuy(event, args);
        else if (args.length == 2 && parseIdentifier(args[0].value as Bot.Token<any>) == "下架") return await this.onRemove(event, args);
        return false;
    }

    async onSell (event: Bot.GroupCommandEvent, args: Bot.ParseResult) {
        if (args[1].type !== "Token" || args[2].type !== "Token") return false;
        let seller = event.sender.userId;
        let player = BotCore.Player.of(seller);
        let slot = json5.parse((args[2].value as Bot.Token<"Numeric">).value);
        let count = json5.parse((args[3].value as Bot.Token<"Numeric">).value);
        let price = json5.parse((args[1].value as Bot.Token<"Numeric">).value);
        let stack = (player.config.inventory)[slot] as BotCore.ItemStackInterface;
        let canSell = Bot.config.superUsers.includes(event.sender.userId) || BotCore.Item.match(stack.id)?.data?.canSell;
        if (typeof canSell == "undefined") canSell = true;
        if (!canSell || !Number.isSafeInteger(price) || price < 1 || !Number.isSafeInteger(count) || player.count(stack.id, stack.nbt) < count || count < 1) {
            await event.replyAt(" 物品无法售卖");
            return false;
        }
        player.takeItem(stack.id, count, stack.nbt);
        this.getConfig<MarketConfig["goods"]>("goods", []);
        let newConfig = this.config;
        newConfig.goods.push({price, seller, item: {id: stack.id, count, nbt: stack.nbt}});
        this.setConfig(newConfig, true);
        await event.replyAt(` 商品 ${BotCore.Item.match(stack.id).toString(new BotCore.ItemStack({id: stack.id, nbt: stack.nbt, count}))} 已加入市场！`);
        return true;
    }

    async onBuy (event: Bot.GroupCommandEvent, args: Bot.ParseResult) {
        let cargoID = json5.parse((args[1].value as Bot.Token<"Numeric">).value);
        let market = this.getConfig<MarketConfig["goods"]>("goods", []);
        let cargo = market[cargoID];
        let player = BotCore.Player.of(event.sender.userId);
        if (cargoID < 0 || cargoID >= market.length || cargo.price > player.count(BotCore.CoinItem.id)) {
            await event.replyAt(" 无法购买此商品");
            return false;
        }
        player.takeItem(BotCore.CoinItem.id, cargo.price);
        player.giveItem(cargo.item);
        delete market[cargoID];
        await event.replyAt(` 已购买: ${BotCore.Item.match(cargo.item.id).toString(new BotCore.ItemStack(cargo.item), player)}`);
        this.setConfig({...this.config, goods: market.filter(i => i)}, true);
        return true;
    }

    async onRemove (event: Bot.GroupCommandEvent, args: Bot.ParseResult) {
        let cargoID = json5.parse((args[1].value as Bot.Token<"Numeric">).value);
        let market = this.getConfig<MarketConfig["goods"]>("goods", []);
        if (cargoID < 0 || cargoID >= market.length || (Bot.config.superUsers.includes(event.sender.userId) ? false : market[cargoID].seller != event.sender.userId)) {
            await event.replyAt(" 无法删除此商品");
            return false;
        }
        let cargo = market[cargoID];
        delete market[cargoID];
        this.setConfig({...this.config, goods: market.filter(i => i)}, true);
        BotCore.Player.of(event.sender.userId).giveItem(cargo.item);
        await event.replyAt(` 商品${cargoID}已下架，已返还: ${BotCore.Item.match(cargo.item.id).toString(new BotCore.ItemStack(cargo.item), BotCore.Player.of(cargo.seller))}`);
        return true;
    }
    async onView (event: Bot.GroupCommandEvent, args: Bot.ParseResult) {
        let market = this.getConfig<MarketConfig["goods"]>("goods", []);
        let fake: Bot.BotMessage.FakeGroupForwardMessage[] = [
            {user_id: Bot.config.uin, message: `全球市场 (${market.length}个商品)`}
        ];
        for (let index of Object.keys(market)) {
            let cargo = market[Number(index)];
            let item = BotCore.Item.match(cargo.item.id);
            let stack = new BotCore.ItemStack(cargo.item);
            let seller = BotCore.Player.of(cargo.seller);
            let tooltip = item.getTooltip(stack, seller).trim() ? "\n\n" + item.getTooltip(stack, seller) : "";
            fake.push(
                {
                    user_id: Bot.config.uin,
                    message: `[${index}] 价格: ${cargo.price}\n销售商: ${(await Bot.client.pickUser(cargo.seller).getSimpleInfo()).nickname} (${cargo.seller})\n\n物品: ${item.toString(stack, seller)}${tooltip}\n\n数据标签: ${JSON.stringify(cargo.item.nbt)}`
                }
            );
        }
        await event.reply(await Bot.BotMessage.makeFakeGroupForward(event.groupId, fake));
        return true;
    }

    setConfig <K extends keyof MarketConfig> (newConfig: ((prevState: Readonly<MarketConfig>, props: Readonly<MarketConfig>) => (Pick<MarketConfig, K> | MarketConfig | null)) | (Pick<MarketConfig, K> | MarketConfig | null), replace = false) {
        fs.writeFileSync(marketPath, JSON.stringify(replace ? newConfig : _.merge(this.config, newConfig)));
    }

    get config (): MarketConfig {
        if (!fs.existsSync(marketPath)) {
            fs.mkdirSync(path.dirname(marketPath), {recursive: true});
            fs.writeFileSync(marketPath, "{}");
        }
        return JSON.parse(fs.readFileSync(marketPath).toString());
    }

    public getConfig <T = MarketConfig> (configPath: _.PropertyPath, defaultValue: T): T {
        let result = _.get(this.config, configPath, defaultValue);
        if (result == defaultValue) {
            let config = this.config;
            _.set(config, configPath, defaultValue);
            fs.mkdirSync(path.dirname(marketPath), {recursive: true});
            fs.writeFileSync(marketPath, JSON.stringify(config));
        }
        return result;
    }

}

export interface MarketConfig {
    goods: {
        price: number;
        seller: number;
        item: BotCore.ItemStackInterface;
    }[]
}


export const pluginName = "全球市场";

