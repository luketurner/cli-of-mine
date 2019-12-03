import * as commandLineArgs from 'command-line-args';

import { Argv, CLIArguments, ValidCommandDefinition, ValidExecConfig, ValidOptionDefinition } from './interfaces';

export interface ParsedCommand {
  command: ValidCommandDefinition;
  args: CLIArguments;
}

/** @hidden */
export function parseArgv(config: ValidExecConfig): ParsedCommand[] {
  return parseCommand(config, config.argv);
}

/** @hidden */
export function parseCommand(
  command: ValidCommandDefinition,
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
  options: ValidOptionDefinition[] | undefined,
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
  subcommands: ValidCommandDefinition[] | undefined,
  name: string
): ValidCommandDefinition | undefined {
  for (const cmd of subcommands || []) {
    if (cmd.name === name) {
      return cmd;
    }
  }
  return;
}
