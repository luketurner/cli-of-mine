import { CLIError } from './error';
import {
  CommandDefinition,
  ExecConfig,
  Handler,
  OptionDefinition,
  ResourceDefinition,
  ValidCommandDefinition,
  ValidExecConfig,
  ValidOptionDefinition,
  ValidResourceDefinition,
} from './interfaces';

function ensureHelpOption(config: any) {
  const { options } = config;
  for (const { name } of options) {
    if (name === "help") return;
  }

  options.push({
    name: "help",
    description: "Prints this usage guide.",
    type: Boolean
  });
}

function ensureVersionOption(config: any) {
  const { options } = config;
  for (const { name } of options) {
    if (name === "version") return;
  }

  options.push({
    name: "version",
    description: "Prints version information.",
    type: Boolean
  });
}

const identityHandler: Handler = async (_ctx, next) => next();

/**
 * Validates the config object
 * @hidden
 */
export function validateConfig(config: Partial<ExecConfig>): ValidExecConfig {
  // TODO
  const generateHelp = booleanDefault(
    config.generateHelp,
    true,
    "generateHelp"
  );

  const validateOption = (option: OptionDefinition): ValidOptionDefinition => {
    const validOption: ValidOptionDefinition = option;
    return validOption;
  };

  const validateCommand = (
    command: CommandDefinition
  ): ValidCommandDefinition => {
    const validCommand: ValidCommandDefinition = {
      name: command.name,
      handler: command.handler || identityHandler,
      description: command.description || "",
      details: command.details || "",
      examples: command.examples || [],

      options: (command.options || []).map(validateOption),
      subcommands: (command.subcommands || []).map(validateCommand)
    };

    if (generateHelp) {
      // TODO -- better way to handle this
      ensureHelpOption(validCommand);
    }
    return validCommand;
  };

  const validateResource = (
    resource: ResourceDefinition
  ): ValidResourceDefinition => {
    const validResource: ValidResourceDefinition = {
      name: resource.name,
      aliases: resource.aliases || [],
      description: resource.description || "",

      commands: (resource.commands || []).map(validateCommand)
    };

    return validResource;
  };

  if (!config) throw new Error("Must pass an object to exec()");
  if (!config.name) throw new Error("Must specify ExecConfig.name");

  const validConfig: ValidExecConfig = {
    name: config.name,
    handler: config.handler || identityHandler,

    argv: config.argv || process.argv,
    stdin: config.stdin || process.stdin,
    stdout: config.stdout || process.stdout,
    stderr: config.stderr || process.stderr,

    generateHelp,
    generateVersion: booleanDefault(
      config.generateVersion,
      true,
      "generateVersion"
    ),

    errorStrategy: config.errorStrategy || "log",

    description: config.description || "",
    examples: config.examples || [],
    version: config.version || "0.0.0",
    details: config.details || "",

    options: (config.options || []).map(validateOption),
    subcommands: (config.subcommands || []).map(validateCommand),
    resources: (config.resources || []).map(validateResource)
  };

  if (generateHelp) {
    // TODO -- perhaps there's a better way to handle this
    ensureHelpOption(validConfig);
  }

  if (validConfig.generateVersion) {
    ensureVersionOption(validConfig);
  }

  return validConfig;
}

function booleanDefault(
  bool: any,
  defaultValue: boolean,
  propertyName: string
): boolean {
  if (typeof bool === "boolean") return bool;
  if (!bool) return defaultValue;
  throw new CLIError(
    "BAD_CONFIG",
    `Invalid value for config ${propertyName}: expected boolean, not ${bool}`
  );
}
