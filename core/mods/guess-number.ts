import Bot from "swbot";
import BotCore from "~/plugins/core";

import json5 from "json5";
import _ from "lodash";

@BotCore.Item.register()
export class GuessNumberItem extends BotCore.Item {

    public static id = "gnumber:guess_number";

    getName () { return "猜数字"; }
    getTooltip (stack?: BotCore.ItemStack, player?: BotCore.Player) { return `你拥有 ${stack?.stack.count} 个 ${this.getName()}`; }

}

BotCore.addRecipe(
    {recipe: [{id: GuessNumberItem.id, count: 1}], result: {id: BotCore.CoinItem.id, count: 10, nbt: {}}},
    {recipe: [{id: GuessNumberItem.id, count: 1}], result: {id: BotCore.ExperienceItem.id, count: 40, nbt: {}}},
);

@Bot.Utils.onCommand(
    `${Bot.Command.commandPrefix.Normal}猜数字`,
    [
        `{{command}} [数字 (范围1-100)]`
    ].join("\n"),
    "猜数字小游戏"
)
export class GuessNumberCommand extends Bot.Utils.Command {

    public random: number = _.random(1, 100);

    async handle (event: Bot.GroupCommandEvent, ...args: Bot.ParseResult) {
        if (args.length == 0 || args[0].type != "Token" || args[0].value.type != "Numeric") return false;
        let number = json5.parse(args[0].value.value) as number;
        if (number < 1 || number > 100 || !Number.isSafeInteger(number)) return false;
        let player = BotCore.Player.of(event.sender.userId);
        if (number == this.random) {
            let stack = {id: GuessNumberItem.id, count: 1, nbt: {}};
            player.giveItem(stack);
            await event.replyAt(` 猜对了，你获得了 ${BotCore.Item.match(stack.id).toString(new BotCore.ItemStack(stack), player)}`);
            this.random = _.random(1, 100);
        } else {
            await event.replyAt(` 猜错了，数字太${number < this.random ? "小" : "大"}了！`);
        }
        return true;
    }
}

