import * as Bot from "swbot";

export async function sleep (delay: number): Promise<NodeJS.Timeout> {
    return await new Promise<NodeJS.Timeout>(
        (resolve) => {
            let timeout = setTimeout(
                () => {
                    resolve(timeout);
                },
                delay
            );
        }
    );
}

export namespace Utils {

    export const commands: Command[] = [];
    export class Command {

        public name: string;
        public help?: string;
        public description?: string;
        public showInHelp?: boolean;
        public data?: any;

        public static commands: Command[] = [];

        constructor (name: string, help?: string, description?: string, showInHelp?: boolean, data?: any) {
            this.name = name;
            this.help = help;
            this.description = description;
            this.showInHelp = showInHelp;
            this.data = data;
        }

        handle (event: Bot.GroupCommandEvent, ...args: Bot.ParseResult): boolean | Promise<boolean> {
            return false;
        }
    }

    export function onCommand (name: string, help?: string, description?: string, showInHelp?: boolean, data?: any) {
        return <T extends typeof Command> (target: T) => {
            // eslint-disable-next-line new-cap
            let command = new target(name, help, description, showInHelp, data);
            commands.push(command);
            target.commands.push(command);
            Bot.Command.register(command.name, command.handle.bind(command), command.help, command.description, command.showInHelp, command.data);
            return target;
        };
    }
}


