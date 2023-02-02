import * as Bot from "../src";
import * as BotItem from "../plugins/core";

import _ from "lodash";


Bot.Command.register(
    `${Bot.Command.commandPrefix.Normal}幸运转盘`,
    onTurntable,
    `${Bot.Command.commandPrefix.Normal}幸运转盘`,
    "幸运转盘，20货币一次"
);

export const turntableItems: {id: string; count: number; nbt: BotItem.NBT; description?: string;}[] = [
    {id: BotItem.CopperCoinItem.id, count: -10, nbt: {}, description: "，大失败！"},
    {id: BotItem.CopperCoinItem.id, count: 0, nbt: {}, description: "，一无所获"},
    {id: BotItem.CopperCoinItem.id, count: 10, nbt: {}},
    {id: BotItem.CopperCoinItem.id, count: 20, nbt: {}, description: "，拿回了20货币"},
    {id: BotItem.CopperCoinItem.id, count: 25, nbt: {}},
    {id: BotItem.CopperCoinItem.id, count: 30, nbt: {}},
    {id: BotItem.CopperCoinItem.id, count: 45, nbt: {}, description: "，大成功！"},
    {id: BotItem.ExperienceItem.id, count: 10, nbt: {}},
    {id: BotItem.ExperienceItem.id, count: 30, nbt: {}},
    {id: BotItem.ExperienceItem.id, count: 45, nbt: {}},
    {id: BotItem.UnknownItem.id, count: Number.MAX_VALUE, nbt: {}, description: "，一无所获..."},
];

Bot.Bot.client.on(
    "system.online",
    async () => {
        for (let i of Object.values(BotItem.Item.getAll())) {
            if (typeof i.data.turntableItems != "object" || !_.isArray(i.data.turntableItems)) continue;
            for (let j of i.data.turntableItems) {
                let result: any = {id: (i.constructor as any)["id"], count: j.count, nbt: j.nbt};
                if (j.description) result.description = j.description;
                turntableItems.push(result);
            }
        }
    }
);

export async function onTurntable (event: Bot.GroupCommandEvent, ...args: Bot.ParseResult): Promise<boolean> {
    let player = BotItem.Player.of(event.sender.userId);
    let coin = BotItem.CopperCoinItem.id;
    let coinItem = BotItem.Item.match(coin);
    if (player.count(coin, {}) >= 20) {
        let resultIndex = _.sample(_.range(0, turntableItems.length)) as number;
        let result: BotItem.ItemStackInterface = turntableItems[resultIndex] as BotItem.ItemStackInterface;
        player.take(event, args, coin, 20, {}, true);
        player.give(result, event, args);
        await event.reply([Bot.MessageSegment.At(event.sender.userId), ` 指针停在了数字${resultIndex + 1}上，获得了 「 ${BotItem.Item.match(result.id).toString(new BotItem.ItemStack(result), player)} 」 ${(typeof ((result as any).description) != "undefined") ? (result as any).description : ""}`]);
    } else {
        await event.reply([Bot.MessageSegment.At(event.sender.userId), ` 货币不足，需要 「 ${coinItem.toString(new BotItem.ItemStack({count: 20, nbt: {}, id: coin}), player)} 」`]);
    }
    return true;
}
