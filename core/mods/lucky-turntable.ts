import * as Bot from "../../src";
import * as BotItem from "../../plugins/core";

import _ from "lodash";


Bot.Command.register(
    `${Bot.Command.commandPrefix.Normal}幸运转盘`,
    onTurntable,
    [
        `${Bot.Command.commandPrefix.Normal}幸运转盘`,
        `${Bot.Command.commandPrefix.Normal}幸运转盘 奖品列表`
    ].join("\n"),
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
    if (args.length == 0) return doTurntable(event, ...args);
    else if (args.length == 1 && args[0].type == "Token") return await getTurntableItems(event, ...args);
    else return false;
}

export async function doTurntable (event: Bot.GroupCommandEvent, ...args: Bot.ParseResult): Promise<boolean> {
    let player = BotItem.Player.of(event.sender.userId);
    let coin = BotItem.CopperCoinItem.id;
    let coinItem = BotItem.Item.match(coin);
    if (player.count(coin, {}) >= 20) {
        let resultIndex = _.sample(_.range(0, turntableItems.length)) as number;
        let result: BotItem.ItemStackInterface = turntableItems[resultIndex] as BotItem.ItemStackInterface;
        player.take(event, args, coin, 20, {}, true);
        player.give(event, args, result);
        await event.reply(
            [
                Bot.MessageSegment.At(event.sender.userId), ` 指针停在了数字${resultIndex + 1}上，获得了 「 ${BotItem.Item.match(result.id).toString(new BotItem.ItemStack(result), player)} 」 ${(typeof ((result as any).description) != "undefined") ? (result as any).description : ""}`
            ]
        );
    } else {
        await event.replyAt(
            ` 货币不足，需要 「 ${coinItem.toString(new BotItem.ItemStack({count: 20, nbt: {}, id: coin}), player)} 」`
        );
    }
    return true;
}

export async function getTurntableItems (event: Bot.GroupCommandEvent, ...args: Bot.ParseResult): Promise<boolean> {
    let result: Bot.BotMessage.FakeGroupForwardMessage[] = [];
    let player = BotItem.Player.of(event.sender.userId);
    if (args[0].type != "Token") return false;
    if (args[0].value.type != "Identifier" && args[0].value.type != "String") return false;
    if (args[0].value.type == "Identifier" && args[0].value.value != "奖品列表") return false;
    if (args[0].value.type == "String" && JSON.parse(args[0].value.value) != "奖品列表") return false;
    for (let index of Object.keys(turntableItems)) {
        let item = _.cloneDeep(turntableItems[Number(index)]);
        let itemObject = BotItem.Item.match(item.id);
        let itemStack = new BotItem.ItemStack({id: item.id, count: item.count, nbt: item.nbt});
        result.push(
            {
                user_id: Bot.config.uin,
                message: [`[${Number(index) + 1}] ${itemObject.getName(itemStack, player)} (${item.id}) * ${item.count} \n\n${JSON.stringify(item.nbt, null, 2)}`.trim()]
            }
        );
    }
    await event.reply(await Bot.BotMessage.makeFakeGroupForward(event.groupId, result));
    return true;
}

Bot.Command.onMessage(
    onRandomGive,
);

export async function onRandomGive (event: Bot.GroupCommandEvent, ...args: Bot.ParseResult) {
    if (_.random(0, 200) == 50) {
        let id = BotItem.CopperCoinItem.id;
        let item = BotItem.Item.match(id);
        let player = BotItem.Player.of(event.sender.userId);
        player.giveItem({count: 20, id, nbt: {}});
        await event.replyAt(`\n[随机掉落] 你获得了 ${item.getName()} (${id}) * 20`);
        return true;
    }
    return false;
}
