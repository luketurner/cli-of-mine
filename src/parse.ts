import * as commandLineArgs from 'command-line-args';

import {
  Argv,
  CLIArguments,
  ValidCommandDefinition,
  ValidExecConfig,
  ValidOptionDefinition,
  ValidResourceDefinition,
} from './interfaces';

export interface CommandExecution {
  command: ValidCommandDefinition;
  args: CLIArguments;
}

/** @hidden */
export function parseArgv(config: ValidExecConfig): CommandExecution[] {
  const [args, remainingArgv] = parseOptions(config.options, config.argv);

  const commands: CommandExecution[] = [{ command: config, args }];

  if (!remainingArgv.length) return commands;

  const subcommands =
    tryParseCommand(config.subcommands, remainingArgv) ||
    tryParseResourceCommand(config.resources, remainingArgv);

  if (!subcommands) throw new Error(`Unexpected argument: ${remainingArgv[0]}`);

  commands.push(...subcommands);
  return commands;
}

function tryParseCommand(
  subcommands: ValidCommandDefinition[],
  argv: string[]
) {
  const [first, ...rest] = argv;

  const subcommand = findCommand(subcommands, first);
  if (subcommand) return parseCommand(subcommand, rest);
  return;
}

function tryParseResourceCommand(
  resources: ValidResourceDefinition[],
  argv: string[]
) {
  const [first, second, ...rest] = argv;
  const [resource, resourceCommand] = findResourceCommand(
    resources,
    first,
    second
  );
  if (resource && resourceCommand) {
    return parseCommand(resourceCommand, rest);
  }
  return;
}

function findResourceCommand(
  resources: ValidResourceDefinition[],
  verb: string,
  noun: string
): [ValidResourceDefinition, ValidCommandDefinition] | [null, null] {
  if (!verb || !noun) return [null, null];
  noun = noun.toLowerCase();
  for (const res of resources) {
    if (
      res.name.toLowerCase() === noun ||
      res.aliases.map(s => s.toLowerCase()).includes(noun)
    ) {
      for (const cmd of res.commands) {
        if (cmd.name === verb) return [res, cmd];
      }
    }
  }

  return [null, null];
}

function parseCommand(
  command: ValidCommandDefinition,
  argv: Argv
): CommandExecution[] {
  const [args, remainingArgv] = parseOptions(command.options, argv);

  if (remainingArgv.length === 0) return [{ command, args }];

  const [next, ...rest] = remainingArgv;

  const subcommand = findCommand(command.subcommands, next);

  if (!subcommand)
    throw new Error(`Unexpected argument: ${next} from ${remainingArgv}`);

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
