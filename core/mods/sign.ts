import * as Bot from "swbot";
import * as BotItem from "~/plugins/core";

@Bot.Utils.onCommand(
    `${Bot.Command.commandPrefix.Normal}签到`,
    [
        `${Bot.Command.commandPrefix.Normal}签到`
    ].join("\n"),
    "每日签到，可获得随机数量奖品"
)
export class SignCommand extends Bot.Utils.Command {

    public static commands: SignCommand[] = [];

    async handle (event: Bot.GroupCommandEvent, ... args: Bot.ParseResult) {
        let player = BotItem.Player.of(event.sender.userId);
        let result = player.sign(event, args);
        if (result) {
            let items = "";
            for (let i of result) {
                items += `  ${BotItem.Item.match(i.id).getName(new BotItem.ItemStack(i), player)} (${i.id}) * ${i.count}\n`;
            }
            await event.reply([Bot.MessageSegment.At(event.sender.userId), ` 签到成功, 获得了:\n${items}`]);
        } else {
            await event.reply([Bot.MessageSegment.At(event.sender.userId), " 签到失败, 请明天再试"]);
        }
        return true;
    }

}
