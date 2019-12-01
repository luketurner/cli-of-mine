import { CLIError } from './error';
import { ExecConfig, ValidExecConfig } from './interfaces';

/**
 * Config module!
 */
/**
 *
 * @param options
 */
function ensureHelpOption(options: any) {
  for (const { name } of options) {
    if (name === "help") return;
  }

  options.push({
    name: "help",
    description: "Prints this usage guide.",
    type: Boolean
  });
}

/**
 * Validates the config object
 * @hidden
 */
export function validateConfig(config: Partial<ExecConfig>): ValidExecConfig {
  // TODO

  if (!config) throw new Error("Must pass an object to exec()");

  const { name, handler } = config;

  if (!name) throw new Error("Must specify ExecConfig.name");
  if (!handler) throw new Error("Must specify ExecConfig.handler");

  const validConfig: ValidExecConfig = {
    name,
    handler,

    argv: config.argv || process.argv,
    stdin: config.stdin || process.stdin,
    stdout: config.stdout || process.stdout,
    stderr: config.stderr || process.stderr,

    generateHelp: booleanDefault(config.generateHelp, true, "generateHelp"),
    catchErrors: booleanDefault(config.catchErrors, true, "catchErrors"),

    description: config.description || "",
    examples: config.examples || [],

    options: config.options || [],
    subcommands: config.subcommands || []
  };

  if (validConfig.generateHelp) {
    ensureHelpOption(validConfig.options);
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
