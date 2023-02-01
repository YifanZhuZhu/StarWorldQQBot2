import * as BotItem from "./item";
import * as Bot from '../../src';

import json5 from "json5";

export function parseAt (token: Bot.ArgumentSpecial<Bot.Elements.AtElement> | Bot.ArgumentToken<"Numeric">) {
    if (token.type == "Token") {
        return Number(token.value.value);
    } else if (token.type == "Special") {
        return Number(token.value.qq);
    } else {
        return NaN;
    }
}

Bot.Command.register(
    `${Bot.Command.commandPrefix.Normal}物品栏`,
    onInventory,
    [
        `${Bot.Command.commandPrefix.Normal}物品栏`
    ].join("\n"),
    "查看物品栏"
);

export async function onInventory (event: Bot.GroupCommandEvent, ...args: Bot.ParseResult): Promise<boolean> {
    return getInventory(event, event.sender.userId, args);
}

Bot.Command.register(
    `${Bot.Command.commandPrefix.Super}给`,
    onGive,
    [
        `${Bot.Command.commandPrefix.Super}给 [@目标] [物品]`
    ].join("\n"),
    "给玩家物品"
);

export async function onGive (event: Bot.GroupCommandEvent, ...args: Bot.ParseResult): Promise<boolean> {
    if (Bot.config.superUsers.indexOf(event.sender.userId) == -1) return false;
    let id = json5.parse((args[1].value as Bot.Token<"String">).value);
    let count = json5.parse((args[2].value as Bot.Token<"Numeric">).value);
    let nbt = json5.parse(json5.parse((args[3].value as Bot.Token<"String">).value));
    let item = JSON.stringify({count, nbt, id});
    let qq = parseAt(args[0] as any);
    if (isNaN(Number(qq))) {
        return false;
    }
    try { Bot.Bot.client.pickUser(qq); }
    catch {
        await event.reply([Bot.MessageSegment.At(event.sender.userId), " 执行失败：不是一个用户"]);
        return true;
    }
    let rawItemStack = json5.parse(item);
    if (typeof rawItemStack.count !== "number" || typeof rawItemStack.id !== "string" || typeof rawItemStack.nbt !== "object") {
        await event.reply([Bot.MessageSegment.At(event.sender.userId), " 执行失败：无效物品"]);
        return true;
    }
    let itemStack: BotItem.ItemStackInterface = rawItemStack;
    let user = await Bot.Bot.client.pickUser(qq).getSimpleInfo();
    let player = BotItem.Player.of(user.user_id);
    try {
        player.give(itemStack, event, args);
        await event.reply([Bot.MessageSegment.At(event.sender.userId), ` 给予 ${user.nickname} ${user.user_id} ${BotItem.Item.match(itemStack.id).getName(new BotItem.ItemStack(itemStack), player)} (${itemStack.id}) * ${itemStack.count}`]);
    } catch {
        await event.reply([Bot.MessageSegment.At(event.sender.userId), " 执行失败"]);
    }
    return true;
}

Bot.Command.register(
    `${Bot.Command.commandPrefix.Super}物品栏`,
    onSuperInventory,
    [
        `${Bot.Command.commandPrefix.Super}物品栏 [@目标]`
    ].join("\n"),
    "查看玩家物品栏"
);

export async function onSuperInventory (event: Bot.GroupCommandEvent, ...args: Bot.ParseResult): Promise<boolean> {
    if (Bot.config.superUsers.indexOf(event.sender.userId) == -1) return false;
    return getInventory(event, parseAt(args[0] as any), args);
}

export async function getInventory (event: Bot.GroupCommandEvent, target: number, args: Bot.ParseResult) {
    let qq = Number(target);
    if (isNaN(qq)) return false;
    let player = BotItem.Player.of(qq);
    let inventory = player.getConfig<BotItem.ItemStackInterface[]>("inventory", []);
    let fakeForward: Bot.BotMessage.FakeGroupForwardMessage[] = [
        {
            message: `${(await Bot.Bot.client.pickUser(qq).getSimpleInfo()).nickname} ${qq} 的物品栏 (${inventory.length}个物品)`,
            user_id: Bot.config.uin,
        },
    ];
    for (let num of Object.keys(inventory)) {
        let i = inventory[Number(num)];
        let name = BotItem.Item.match(i.id).getName(new BotItem.ItemStack(i), player);
        let tooltip = BotItem.Item.match(i.id).getTooltip(new BotItem.ItemStack(i), player);
        if (tooltip.trim().length > 0) tooltip += "\n\n";
        fakeForward.push(
            {
                message: `[${num}] ${name} ${i.id} * ${i.count} \n\n${tooltip} ${JSON.stringify(i.nbt)}`,
                user_id: Bot.config.uin,
            }
        );
    }
    await event.reply(await Bot.BotMessage.makeFakeGroupForward(event.groupId, fakeForward));
    return true;
}

Bot.Command.register(
    `${Bot.Command.commandPrefix.Normal}丢弃`,
    onTake,
    [
        `${Bot.Command.commandPrefix.Normal}丢弃 [物品]`
    ].join("\n"),
    "丢弃物品"
);

export async function onTake (event: Bot.GroupCommandEvent, ...args: Bot.ParseResult) {
    let id = json5.parse((args[0].value as Bot.Token<"String">).value);
    let count = json5.parse((args[1].value as Bot.Token<"Numeric">).value);
    let nbt;
    try {
        nbt = json5.parse(json5.parse((args[2].value as Bot.Token<"String">).value));
    } catch {}
    let result = {count, nbt, id};
    return getTake(event, event.sender.userId, JSON.stringify(result), args);
}

export async function getTake (event: Bot.GroupCommandEvent, id: number, item: string, args: Bot.ParseResult): Promise<boolean> {
    let rawItemStack = json5.parse(item);
    let stack: {count: number, id: string, nbt: undefined | {[index: string]: BotItem.JSONType}};
    if (typeof rawItemStack.count !== "number" || typeof rawItemStack.id !== "string" || ["object", "undefined"].indexOf(typeof rawItemStack.nbt) == -1) {
        await event.reply([Bot.MessageSegment.At(event.sender.userId), " 执行失败：无效物品"]);
        return true;
    }
    stack = rawItemStack;
    let player = BotItem.Player.of(id);
    if (player.take(event, args, stack.id, stack.count, stack.nbt)) {
        let itemStack: BotItem.ItemStackInterface = typeof stack.nbt === "undefined" ? {...stack, nbt: {}} : stack as any;
        await event.reply([Bot.MessageSegment.At(event.sender.userId), ` 丢弃成功 ${BotItem.Item.match(stack.id).getName(new BotItem.ItemStack(itemStack), player)} (${stack.id}) * ${stack.count}`]);
    } else {
        await event.reply([Bot.MessageSegment.At(event.sender.userId), " 此物品无法丢弃"]);
    }
    return true;
}

Bot.Command.register(
    `${Bot.Command.commandPrefix.Super}丢弃`,
    onSuperTake,
    [
        `${Bot.Command.commandPrefix.Super}丢弃 [@目标] [物品]`
    ].join("\n"),
    "丢弃玩家物品"
);

export async function onSuperTake (event: Bot.GroupCommandEvent, ...args: Bot.ParseResult): Promise<boolean> {
    if (Bot.config.superUsers.indexOf(event.sender.userId) == -1) return false;
    let id = json5.parse((args[1].value as Bot.Token<"String">).value);
    let count = json5.parse((args[2].value as Bot.Token<"Numeric">).value);
    let nbt;
    try {
        nbt = json5.parse(json5.parse((args[3].value as Bot.Token<"String">).value));
    } catch {}
    let result = {count, nbt, id};
    return getTake(event, parseAt(args[0] as any), JSON.stringify(result), args);
}