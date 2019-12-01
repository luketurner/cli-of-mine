import * as commandLineArgs from "command-line-args";
import {
  ExecConfig,
  CommandDefinition,
  OptionDefinition,
  Argv,
  CLIArguments
} from "./interfaces";

export interface ParsedCommand {
  command: CommandDefinition;
  args: CLIArguments;
}

export function parseArgv(config: ExecConfig): ParsedCommand[] {
  return parseCommand(config, config.argv);
}

export function parseCommand(
  command: CommandDefinition,
  argv: Argv
): ParsedCommand[] {
  const [args, remainingArgv] = parseOptions(command.options, argv);

  if (!remainingArgv.length) return [{ command, args }];

  const [next, ...rest] = remainingArgv;

  const subcommand = findCommand(command.subcommands, next);

  if (!subcommand) throw new Error(`Unexpected argument: ${next}`);

  return [{ command, args }, ...parseCommand(subcommand, rest)];
}

function parseOptions(
  options: OptionDefinition[] | undefined,
  argv: Argv
): [CLIArguments, Argv] {
  const args = commandLineArgs(options || [], {
    argv,
    stopAtFirstUnknown: true
  });

  const remainingArgv = args._unknown || [];

  return [args, remainingArgv];
}

function findCommand(
  subcommands: CommandDefinition[] | undefined,
  name: string
): CommandDefinition | undefined {
  for (const cmd of subcommands || []) {
    if (cmd.name === name) {
      return cmd;
    }
  }
  return;
}

// export function readOptions(options: OptionDefinition[], argv: Argv) {
//   const args = commandLineArgs(options || [], {
//     argv,
//     stopAtFirstUnknown: true
//   });

//   return { args, argv: args._unknown || [] };
// }

// /**
//  * @hidden
//  */
// export function parseCommands(config: any, argv: any) {
//   const args = commandLineArgs(config.options, {
//     argv,
//     stopAtFirstUnknown: true
//   });

//   const cmds = [{ config, args }];

//   const [next, ...rest] = args._unknown || [];

//   if (!next) return cmds;

//   if (!config.subcommands) {
//     throw new Error(`Unknown argument: ${next}`);
//   }

//   if (!config.subcommands[next]) {
//     const allowedCmds = Object.keys(config.subcommands);
//     throw new Error(
//       `Unknown subcommand: ${next}. Expected one of: ${allowedCmds.join(", ")}.`
//     );
//   }

//   cmds.push(...parseCommands(config.subcommands[next], rest));

//   return cmds;
// }
