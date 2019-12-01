import * as commandLineUsage from "command-line-usage";
import { CommandDefinition } from "./interfaces";

/**
 * @hidden
 */
export function getHelp(config: CommandDefinition) {
  const helpSections = [];

  helpSections.push(descriptionSection(config.name, config.description));

  if (config.examples) helpSections.push(exampleSection(config.examples));

  if (config.options) helpSections.push(optionSection(config.options));

  if (config.subcommands)
    helpSections.push(subcommandSection(config.subcommands));

  return commandLineUsage(helpSections);
}

function descriptionSection(header: any, content: any) {
  return { header, content };
}

function exampleSection(config: any) {
  return {
    header: "Examples",
    content: config.examples
  };
}

function subcommandSection(subcommands: any) {
  const content = subcommands.map(({ name, description }: any) => ({
    name,
    content: description
  }));

  return {
    header: "Commands",
    content
  };
}

function optionSection(optionList: any) {
  return {
    header: "Options",
    optionList
  };
}
