import BotItem from "~/plugins/core";
import Bot from "swbot";

export function Identifier (path: string) {
    return `more_foods:${path}`;
}

@BotItem.Item.register()
export class BreadSliceItem extends BotItem.Item {

    public static readonly id = Identifier("bread_slice");

    getName (stack?: BotItem.ItemStack, player?: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): string { return "面包片"; }
    getTooltip (stack?: BotItem.ItemStack, player?: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): string { return "食用后增加5生命值上限"; }

    onUse (stack: BotItem.ItemStack, player: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): boolean {
        if (event && commandArgs) {
            player.takeItem(this.getId(), 1, stack.stack.nbt);
            player.setMaxHealth(player.getMaxHealth() + 5);
            event.reply(`食用了 ${this.getName()}，你的生命值上限增加了 5 (当前 ${player.getMaxHealth()})`).then();
        }
        return true;
    }

    data = {turntableItems: [{count: 1, nbt: {}}]};

}

@BotItem.Item.register()
export class BreadItem extends BotItem.Item {

    public static readonly id = Identifier("bread");

    getName (stack?: BotItem.ItemStack, player?: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): string { return "面包"; }
    getTooltip (stack?: BotItem.ItemStack, player?: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): string { return "食用后增加25生命值上限（其实就是5个面包片）"; }

    onUse (stack: BotItem.ItemStack, player: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): boolean {
        player.takeItem(this.getId(), 1, stack.stack.nbt);
        player.setMaxHealth(player.getMaxHealth() + 25);
        if (event && commandArgs) {
            event.reply(`食用了 ${this.getName()}，你的生命值上限增加了 25 (当前 ${player.getMaxHealth()})`).then();
        }
        return true;
    }

    data = {
        turntableItems: [
            {
                count: 1,
                nbt: {}
            }
        ]
    };

}

@BotItem.Item.register()
export class CapsicumItem extends BotItem.Item {

    public static readonly id = Identifier("capsicum");

    getName (stack?: BotItem.ItemStack, player?: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): string { return "辣椒"; }
    getTooltip (stack?: BotItem.ItemStack, player?: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): string { return "食用后减少5生命值上限"; }

    onUse (stack: BotItem.ItemStack, player: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): boolean {
        player.takeItem(this.getId(), 1, stack.stack.nbt);
        player.setMaxHealth(player.getMaxHealth() - 5);
        if (event && commandArgs) {
            event.reply(`食用了 ${this.getName()}，你的生命值上限减少了了 5 (当前 ${player.getMaxHealth()})`).then();
        }
        return true;
    }

    data = {
        turntableItems: [
            {
                count: 1,
                nbt: {}
            }
        ],
        storeGoods: [
            {
                item: {
                    count: 1,
                    nbt: {}
                },
                price: 20
            }
        ]
    };

}

BotItem.addRecipe(
    // 面包
    { result: { count: 1, nbt: {}, id: BreadItem.id }, recipe: [ { count: 5, id: BreadSliceItem.id } ] },
    // 面包片
    { result: { count: 5, nbt: {}, id: BreadSliceItem.id }, recipe: [ { count: 1, id: BreadItem.id } ] }
).addRecipe(
    // 辣椒
    { result: { count: 1, nbt: {}, id: CapsicumItem.id }, recipe: [ { count: 10, id: BotItem.CoinItem.id } ] }
);


