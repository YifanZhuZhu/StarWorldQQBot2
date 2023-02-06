import * as BotItem from "../../plugins/core";
import * as Bot from '../../src';

import _ from "lodash";

import json5 from "json5";

export function parseAt (token: Bot.ArgumentSpecial<Bot.AtElement> | Bot.ArgumentToken<"Numeric">) {
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
    `${Bot.Command.commandPrefix.Super}给予`,
    onGive,
    [
        `${Bot.Command.commandPrefix.Super}给予 [@目标] [物品]`
    ].join("\n"),
    "给予玩家物品"
);

export async function onGive (event: Bot.GroupCommandEvent, ...args: Bot.ParseResult): Promise<boolean> {
    if (Bot.config.superUsers.indexOf(event.sender.userId) == -1) return false;
    let id = json5.parse((args[1].value as Bot.Token<"String">).value);
    let count = Number((args[2].value as Bot.Token<"Numeric">).value);
    let nbt = json5.parse(json5.parse((args[3].value as Bot.Token<"String">).value));
    let rawItemStack = {count, nbt, id};
    let qq = parseAt(args[0] as any);
    if (isNaN(Number(qq))) {
        return false;
    }
    try { Bot.Bot.client.pickUser(qq); }
    catch {
        await event.reply([Bot.MessageSegment.At(event.sender.userId), " 执行失败：不是一个用户"]);
        return true;
    }
    if (Number.isNaN(rawItemStack.count) || typeof rawItemStack.id !== "string" || typeof rawItemStack.nbt !== "object") {
        await event.reply([Bot.MessageSegment.At(event.sender.userId), " 执行失败：无效物品"]);
        return true;
    }
    let itemStack: BotItem.ItemStackInterface = rawItemStack;
    let user = await Bot.Bot.client.pickUser(qq).getSimpleInfo();
    let player = BotItem.Player.of(user.user_id);
    try {
        player.give(event, args, itemStack);
        await event.reply([Bot.MessageSegment.At(event.sender.userId), ` 给予 ${user.nickname} ${user.user_id} ${BotItem.Item.match(itemStack.id).toString(new BotItem.ItemStack(itemStack), player)}`]);
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
        let tooltip = BotItem.Item.match(i.id).getTooltip(new BotItem.ItemStack(i), player);
        if (tooltip.trim().length > 0) tooltip += "\n\n";
        fakeForward.push(
            {
                message: [`[${num}] ${BotItem.Item.match(i.id).toString(new BotItem.ItemStack(i), player)} \n\n${tooltip}数据标签: ${JSON.stringify(i.nbt, null, 2)}`],
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
        `${Bot.Command.commandPrefix.Normal}丢弃 [物品ID] [数量] [?物品NBT]`
    ].join("\n"),
    "丢弃物品"
);

export async function onTake (event: Bot.GroupCommandEvent, ...args: Bot.ParseResult) {
    let id = json5.parse((args[0].value as Bot.Token<"String">).value);
    let count = Number((args[1].value as Bot.Token<"Numeric">).value);
    let nbt;
    try {
        nbt = json5.parse(json5.parse((args[2].value as Bot.Token<"String">).value));
    } catch {}
    let result = {count, nbt, id};
    return getTake(event, event.sender.userId, result, args);
}

export async function getTake (event: Bot.GroupCommandEvent, id: number, rawItemStack: any, args: Bot.ParseResult): Promise<boolean> {
    let stack: {count: number, id: string, nbt: undefined | {[index: string]: BotItem.JSONType}};
    if (typeof rawItemStack.count !== "number" || typeof rawItemStack.id !== "string" || ["object", "undefined"].indexOf(typeof rawItemStack.nbt) == -1) {
        await event.reply([Bot.MessageSegment.At(event.sender.userId), " 执行失败：无效物品"]);
        return true;
    }
    stack = rawItemStack;
    let player = BotItem.Player.of(id);
    if (player.take(event, args, stack.id, stack.count, stack.nbt)) {
        let itemStack: BotItem.ItemStackInterface = typeof stack.nbt === "undefined" ? {...stack, nbt: {}} : stack as any;
        await event.reply([Bot.MessageSegment.At(event.sender.userId), ` 丢弃成功 ${BotItem.Item.match(stack.id).toString(new BotItem.ItemStack(itemStack), player)}`]);
    } else {
        await event.reply([Bot.MessageSegment.At(event.sender.userId), " 此物品无法丢弃"]);
    }
    return true;
}

Bot.Command.register(
    `${Bot.Command.commandPrefix.Super}丢弃`,
    onSuperTake,
    [
        `${Bot.Command.commandPrefix.Super}丢弃 [@目标] [ID] [物品数量] [?物品NBT]`
    ].join("\n"),
    "丢弃玩家物品"
);

export async function onSuperTake (event: Bot.GroupCommandEvent, ...args: Bot.ParseResult): Promise<boolean> {
    if (Bot.config.superUsers.indexOf(event.sender.userId) == -1) return false;
    let id = json5.parse((args[1].value as Bot.Token<"String">).value);
    let count = Number((args[2].value as Bot.Token<"Numeric">).value);
    let nbt;
    try {
        nbt = json5.parse(json5.parse((args[3].value as Bot.Token<"String">).value));
    } catch {}
    let result = {count, nbt, id};
    return getTake(event, parseAt(args[0] as any), result, args);
}

Bot.Command.register(
    `${Bot.Command.commandPrefix.Normal}使用`,
    onUse,
    [
        `${Bot.Command.commandPrefix.Normal}使用 [物品ID] [?物品NBT] [?...参数]`
    ].join("\n"),
    "使用物品"
);

export async function onUse (event: Bot.GroupCommandEvent, ...args: Bot.ParseResult): Promise<boolean> {
    let id = json5.parse((args[0].value as Bot.Token<"String">).value);
    let nbt;
    try {
        nbt = json5.parse(json5.parse((args[1].value as Bot.Token<"String">).value));
    } catch {}
    let player = BotItem.Player.of(event.sender.userId);
    let result = player.use(event, args, id, nbt);
    if (!result) {
        await event.replyAt(" 物品无法使用");
    }
    return true;
}

Bot.Command.register(
    `${Bot.Command.commandPrefix.Normal}信息`,
    onUserInfo,
    [
        `${Bot.Command.commandPrefix.Normal}信息`
    ].join("\n"),
    "查看玩家信息"
);

export async function onUserInfo (event: Bot.GroupCommandEvent, ...args: Bot.ParseResult): Promise<boolean> {
    return await getUserInfo(event, args, event.sender.userId);
}

Bot.Command.register(
    `${Bot.Command.commandPrefix.Super}信息`,
    onSuperUserInfo,
    [
        `${Bot.Command.commandPrefix.Super}信息`
    ].join("\n"),
    "查看玩家个人信息"
);

export async function onSuperUserInfo (event: Bot.GroupCommandEvent, ...args: Bot.ParseResult): Promise<boolean> {
    if (Bot.config.superUsers.indexOf(event.sender.userId) == -1) return false;
    return await getUserInfo(event, args, parseAt(args[0] as any));
}

export async function getUserInfo (event: Bot.GroupCommandEvent, args: Bot.ParseResult, userId: number): Promise<boolean> {
    let player = BotItem.Player.of(userId);
    let user = await Bot.Bot.client.pickUser(userId).getSimpleInfo();
    await event.replyAt(
        [
            `\n名称: ${user.nickname}`,
            `生命值 (${player.getHealth()} / ${player.getMaxHealth()})：[${("=".repeat(Math.trunc(player.getHealthPercentage() * 10)) + "->" + "-".repeat(10 - Math.trunc((player.getHealthPercentage() * 10)))).trim()}]`
        ].join("\n")
    );
    return true;
}

Bot.Command.register(
    `${Bot.Command.commandPrefix.Normal}合成`,
    onCraft,
    [
        `${Bot.Command.commandPrefix.Normal}合成 [物品ID]`,
        `${Bot.Command.commandPrefix.Normal}合成 [物品ID] [合成方案]`
    ].join("\n"),
    "合成物品"
);

export async function onCraft (event: Bot.GroupCommandEvent, ...args: Bot.ParseResult): Promise<boolean> {
    if (args.length < 1 || args.length > 2) return false;
    let id = json5.parse((args[0].value as Bot.Token<"String">).value);
    if (args.length == 2) {
        let plan = json5.parse((args[1].value as Bot.Token<"Numeric">).value) as number;
        return await getCraft(event, args, id, plan);
    } else if (args.length == 1) return await getCraftPlans(event, args, id);
    else return false;
}

export async function getCraftPlans (event: Bot.GroupCommandEvent, args: Bot.ParseResult, id: string) {
    let recipes = BotItem.recipes.filter(i => i.result.id == id);
    let forwards: Bot.BotMessage.FakeGroupForwardMessage[] = [
        {
            user_id: Bot.config.uin,
            message: `物品 ${BotItem.Item.match(id).getName()} (${BotItem.Item.match(id).getId()}) 的配方: ${recipes.length}个方案`
        }
    ];
    for (let index of Object.keys(recipes)) {
        let item = recipes[Number(index)];
        let itemName = BotItem.Item.match(item.result.id).toString(new BotItem.ItemStack(item.result));
        let recipeNames: string[] = [];
        for (let i of _.get(item, "recipe", [] as {count: number; id: string; nbt?: BotItem.NBT}[])) {
            recipeNames.push(
                BotItem.Item.match(i.id).toString(
                    new BotItem.ItemStack({nbt: {}, ...i})
                )
            );
        }
        forwards.push(
            {
                user_id: Bot.config.uin,
                message: `[${index}] ${itemName}\n\n${JSON.stringify(item.result.nbt)}\n\n配方: \n${recipeNames.map(i => "    " + i + "\n")}`
            }
        );
    }
    await event.reply(await Bot.BotMessage.makeFakeGroupForward(event.groupId, forwards));
    return true;
}

export async function getCraft (event: Bot.GroupCommandEvent, args: Bot.ParseResult, id: string, plan: number): Promise<boolean> {
    if (!(plan in BotItem.recipes.filter(i => i.result.id == id))) {
        await event.replyAt(" 未找到合成方案");
        return true;
    }
    let player = BotItem.Player.of(event.sender.userId);
    let results = player.craft(id, plan);
    let isCraft = results[0];
    if (isCraft) {
        let result = (results as [true, false, BotItem.Recipe])[2];
        let recipes: string[] = [];
        for (let i of _.get(result, "recipe", [] as {count: number; id: string; nbt?: BotItem.NBT}[])) {
            recipes.push(BotItem.Item.match(i.id).toString(new BotItem.ItemStack({nbt: {}, ...i})) + ` ${JSON.stringify(i.nbt ?? {})}`);
        }
        let resultItem = _.get(result, "result", {count: 0, nbt: {}} as any);
        let resultItemString = BotItem.Item.match(id).toString(new BotItem.ItemStack({id, nbt: {}, ...resultItem}));
        await event.replyAt(` 物品 ${resultItemString} 合成成功，消耗了\n${recipes.map(i => "    " + i + "\n")}`);
    }
    else {
        if (results[1]) {
            await event.replyAt(" 合成材料不足");
            return true;
        }
        await event.replyAt(" 物品无法合成");
    }
    return true;
}
