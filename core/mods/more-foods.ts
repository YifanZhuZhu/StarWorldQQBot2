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
    getTooltip (stack?: BotItem.ItemStack, player?: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): string { return "食用后增加25生命值"; }

    onUse (stack: BotItem.ItemStack, player: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): boolean {
        player.takeItem(this.getId(), 1, stack.stack.nbt);
        player.setHealth(player.getHealth() + 25);
        if (event && commandArgs) {
            event.reply(`食用了 ${this.getName()}，你的生命值增加了 25 (当前 ${player.getHealth()})`).then();
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

@BotItem.Item.register()
export class EvilCapsicumItem extends BotItem.Item {

    public static readonly id = Identifier("evil_capsicum");

    getName (stack?: BotItem.ItemStack, player?: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): string { return "邪恶辣椒"; }

    onUse (stack: BotItem.ItemStack, player: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): boolean {
        player.takeItem(this.getId(), 1, stack.stack.nbt);
        let health = player.getHealth();
        player.setHealth(
            0, (lostItems) => {
                let item = BotItem.Item.match(lostItems.id).toString(new BotItem.ItemStack(lostItems), player);
                event?.replyAt(` 你失败了，丢失了 ${item}`);
            }
        );
        if (event && commandArgs) {
            event.reply(`食用了 ${this.getName()}，你的生命值减少了 ${health}`).then();
        }
        return true;
    }

    data = {
        storeGoods: [
            {
                item: {
                    count: 1,
                    nbt: {}
                },
                price: 200
            }
        ]
    };

}

@BotItem.Item.register()
export class StrawBerryItem extends BotItem.Item {

    public static readonly id = Identifier("strawberry");

    getName (): string { return "草莓"; }
    getTooltip(): string { return "食用后增加1生命值"; }

    onUse (stack: BotItem.ItemStack, player: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): boolean {
        player.takeItem(this.getId(), 1, stack.stack.nbt);
        let health = player.getHealth();
        player.setHealth(health + 1);
        if (event && commandArgs) {
            event.reply(`食用了 ${this.getName()}，你的生命值增加了 1`).then();
        }
        return true;
    }

    data = {
        storeGoods: [
            {
                item: {
                    count: 1,
                    nbt: {}
                },
                price: 1
            }
        ],
        turntableItems: [
            {
                count: 40,
                nbt: {}
            }
        ],
    };

}

@BotItem.Item.register()
export class SugarItem extends BotItem.Item {

    public static readonly id = Identifier("sugar");

    getName (): string { return "糖"; }
    getTooltip(): string { return "甜"; }

    data = {
        storeGoods: [
            {
                item: {
                    count: 5,
                    nbt: {}
                },
                price: 1
            }
        ],
        turntableItems: [
            {
                count: 25,
                nbt: {}
            }
        ],
    };

}

@BotItem.Item.register()
export class FrenchBreadItem extends BotItem.Item {

    public static readonly id = Identifier("french_bread");

    getName (): string { return "法棍"; }
    getTooltip(): string { return "硬硬的，长长的。。。揍人很疼"; }

    getName (stack?: BotItem.ItemStack, player?: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): string { return "法棍"; }
    getTooltip (stack?: BotItem.ItemStack, player?: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): string { return "食用后增加125生命值"; }

    onUse (stack: BotItem.ItemStack, player: BotItem.Player, event?: Bot.GroupCommandEvent, commandArgs?: Bot.ParseResult): boolean {
        player.takeItem(this.getId(), 1, stack.stack.nbt);
        player.setHealth(player.getHealth() + 125);
        if (event && commandArgs) {
            event.reply(`食用了 ${this.getName()}，你的生命值增加了 125 (当前 ${player.getHealth()})`).then();
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
                    count: 2,
                    nbt: {}
                },
                price: 1000
            }
        ]
    };

}

BotItem.addRecipe(
    //法棍
    { result: { count: 1, nbt: {}, id: FrenchBreadItem.id }, recipe: [ { count: 5, id: BreadItem.id } ] },
    // 面包
    { result: { count: 1, nbt: {}, id: BreadItem.id }, recipe: [ { count: 5, id: BreadSliceItem.id } ] },
    // 面包片
    { result: { count: 5, nbt: {}, id: BreadSliceItem.id }, recipe: [ { count: 1, id: BreadItem.id } ] }
);


