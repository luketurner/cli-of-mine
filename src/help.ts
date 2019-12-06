import * as commandLineUsage from 'command-line-usage';

import { ValidCommandDefinition, ValidExecConfig, ValidResourceDefinition } from './interfaces';

/**
 * @hidden
 */
export function getHelp(config: ValidExecConfig) {
  const helpSections = [];

  helpSections.push(
    descriptionSection(config.name, config.description, config.details)
  );

  if (config.examples) helpSections.push(exampleSection(config.examples));

  if (config.options) helpSections.push(optionSection(config.options));

  if (config.subcommands)
    helpSections.push(subcommandSection(config.subcommands));

  if (config.resources) helpSections.push(resourceSection(config.resources));

  return commandLineUsage(helpSections);
}

/** @hidden */
export function getCommandHelp(command: ValidCommandDefinition) {
  const helpSections = [];

  helpSections.push(
    descriptionSection(command.name, command.description, command.details)
  );

  if (command.examples) helpSections.push(exampleSection(command.examples));

  if (command.options) helpSections.push(optionSection(command.options));

  if (command.subcommands)
    helpSections.push(subcommandSection(command.subcommands));

  return commandLineUsage(helpSections);
}

function descriptionSection(header: any, content: any, details: any) {
  return { header, content: details ? [content, details] : content };
}

function exampleSection(examples: any) {
  return {
    header: "Examples",
    content: examples
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

function resourceSection(resourceList: ValidResourceDefinition[]) {
  const content = resourceList.map(resource => ({
    Name: resource.name,
    Description: resource.description,
    Verbs: resource.commands.map(c => c.name).join(", ")
  }));

  return { header: "Resources", content };
}
