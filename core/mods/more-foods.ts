import * as BotItem from "../../plugins/core/index";
import * as Bot from "../../src";

export function Identifier (path: string) {
    return `more_foods:${path}`;
}

export class BreadSliceItem extends BotItem.Item {

    public static readonly id = Identifier("bread_slice");

    getName (stack?: BotItem.ItemStack, player?: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): string { return "面包片"; }
    getTooltip (stack?: BotItem.ItemStack, player?: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): string { return "食用后增加5生命值上限"; }

    onUse (stack: BotItem.ItemStack, player: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): boolean {
        if (event && commandArgs) {
            player.takeItem(this.getId(), 1, stack.stack.nbt);
            player.setMaxHealth(player.getMaxHealth() + 5);
            event.reply(`吃下了 ${this.getName()}，你的生命值上限增加了 5 (当前 ${player.getMaxHealth()})`).then();
        }
        return true;
    }

    data = {turntableItems: [{count: 1, nbt: {}}]};

}

export class BreadItem extends BotItem.Item {

    public static readonly id = Identifier("bread");

    getName (stack?: BotItem.ItemStack, player?: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): string { return "面包"; }
    getTooltip (stack?: BotItem.ItemStack, player?: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): string { return "食用后增加25生命值上限（其实就是5个面包片）"; }

    onUse (stack: BotItem.ItemStack, player: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): boolean {
        if (event && commandArgs) {
            player.takeItem(this.getId(), 1, stack.stack.nbt);
            player.setMaxHealth(player.getMaxHealth() + 25);
            event.reply(`吃下了 ${this.getName()}，你的生命值上限增加了 25 (当前 ${player.getMaxHealth()})`).then();
        }
        return true;
    }

    data = {turntableItems: [{count: 1, nbt: {}}]};

}

BotItem.addRecipe( // 面包
    { result: { count: 1, nbt: {}, id: BreadItem.id }, recipe: [ { count: 5, id: BreadSliceItem.id } ] }
).addRecipe( // 面包片
    { result: { count: 5, nbt: {}, id: BreadSliceItem.id }, recipe: [ { count: 1, id: BreadItem.id } ] }
);

BotItem.Item.register(BreadSliceItem).register(BreadItem);


