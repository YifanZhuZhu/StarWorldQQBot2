import * as BotItem from "../../plugins/core/index";
import * as Bot from "../../src";
import path from "path";

export function Identifier (path: string) {
    return `more_foods:${path}`;
}

export class BreadSliceItem extends BotItem.Item {

    public static readonly id = Identifier("bread_slice");

    getName (stack?: BotItem.ItemStack, player?: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): string { return "面包片"; }

    onUse (stack: BotItem.ItemStack, player: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): boolean {
        if (event && commandArgs) {
            stack.stack.count = stack.stack.count - 1;
            player.setMaxHealth(player.getMaxHealth() + 5);
            event.reply(`吃下了 ${this.getName()}，你的生命值上限增加了 5 (当前 ${player.getMaxHealth()})`).then();
        }
        return true;
    }

    data = {turntableItems: [{count: 1, nbt: {}}]};

    public getIcon (stack: BotItem.ItemStack, player: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): Buffer { return Bot.cacheLocalFile(path.join(Bot.botPath, "resources/more_foods/textures/bread_slice.png")); }


}

BotItem.Item.register(BreadSliceItem);

