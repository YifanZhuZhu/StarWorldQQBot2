import BotCore from "~/plugins/core";
import Bot from "swbot";
import json5 from "json5";
import _ from "lodash";

export const storeGoods: IStoreItem[] = [];

export function parseIdentifier (token: Bot.Token<"String" | "Identifier">) {
    if (token.type == "String") return json5.parse(token.value) as string;
    else if (token.type == "Identifier") return token.value as string;
    else return "";
}

Bot.Bot.client.on(
    "system.online",
    async () => {
        for (let i of Object.values(BotCore.Item.getAll())) {
            if (typeof i.data.storeGoods != "object" || !_.isArray(i.data.storeGoods)) continue;
            for (let j of i.data.storeGoods) {
                let item: any = {id: (i.constructor as any)["id"], count: j.item.count, nbt: j.item.nbt};
                if (Number.isSafeInteger(j.price) && Number.isSafeInteger(item.count) && typeof item.nbt == "object" && typeof item.id == "string") {
                    let storeItem = {price: Number(j.price), item};
                    Bot.logger.mark(`商店物品已注册: ${JSON.stringify(storeItem)}`);
                    storeGoods.push(storeItem);
                }
            }
        }
    }
);

@Bot.Utils.onCommand(
    `${Bot.Command.commandPrefix.Normal}商店`,
    [
        `{{command}}`,
        `{{command}} 买 [商品号]`,
    ].join("\n"),
    `系统商店`
)
export class StoreCommand extends Bot.Utils.Command {

    async handle (event: Bot.GroupCommandEvent, ...args: Bot.ParseResult): Promise<boolean> {
        if (args.length == 0) return await this.onView(event, args);
        else if (args.length == 2 && parseIdentifier(args[0].value as Bot.Token<any>) == "买") return await this.onBuy(event, args);
        return false;
    }

    async onBuy (event: Bot.GroupCommandEvent, args: Bot.ParseResult) {
        let itemID = json5.parse((args[1].value as Bot.Token<"Numeric">).value);
        let storeItem = storeGoods[itemID];
        let player = BotCore.Player.of(event.sender.userId);
        if (itemID < 0 || itemID >= storeGoods.length || storeItem.price > player.count(BotCore.CoinItem.id)) {
            await event.replyAt(" 无法购买此商品");
            return false;
        }
        player.takeItem(BotCore.CoinItem.id, storeItem.price);
        player.giveItem(storeItem.item);
        await event.replyAt(` 已购买: ${BotCore.Item.match(storeItem.item.id).toString(new BotCore.ItemStack(storeItem.item), player)}，消耗了${storeItem.price}货币`);
        return true;
    }
    async onView (event: Bot.GroupCommandEvent, args: Bot.ParseResult) {
        let store = storeGoods;
        let fake: Bot.BotMessage.FakeGroupForwardMessage[] = [
            {user_id: Bot.config.uin, message: `系统商店 (${store.length}个商品)`}
        ];
        for (let index of Object.keys(store)) {
            let storeItem = store[Number(index)];
            let item = BotCore.Item.match(storeItem.item.id);
            let stack = new BotCore.ItemStack(storeItem.item);
            let player = BotCore.Player.of(event.sender.userId);
            let tooltip = item.getTooltip(stack, player).trim() ? "\n\n" + item.getTooltip(stack, player) : "";
            fake.push(
                {
                    user_id: Bot.config.uin,
                    message: `[${index}] 价格: ${storeItem.price}\n\n物品: ${item.toString(stack, player)}${tooltip}\n\n数据标签: ${JSON.stringify(storeItem.item.nbt)}`
                }
            );
        }
        await event.reply(await Bot.BotMessage.makeFakeGroupForward(event.groupId, fake));
        return true;
    }

}

export interface IStoreItem {
    item: BotCore.ItemStackInterface,
    price: number,
}
