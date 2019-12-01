/**
 * Config module!
 */
import { ExecConfig } from './interfaces';

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
export function validateConfig(config: Partial<ExecConfig>): ExecConfig {
  // TODO

  if (!config.name) throw new Error("Must specify ExecConfig.name");

  const validConfig: ExecConfig = {
    generateHelp: true,
    argv: process.argv,
    name: config.name, // Typescript, infer this!
    ...config
  };

  if (validConfig.generateHelp) {
    if (!validConfig.options) validConfig.options = [];
    ensureHelpOption(validConfig.options);
  }

  return validConfig;
}
