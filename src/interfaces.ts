import { Readable, Writable } from 'stream';

// Domain type-renames
// (might want to make these types "better" / more precise)
export type Example = string;
export type HandlerResult = any;
export type Argv = string[];
export type ExitCode = number;

export type InputStream = Readable;
export type OutputStream = Writable;

export interface Handler {
  (ctx: HandlerContext, next: HandlerCallback):
    | HandlerResult
    | Promise<HandlerResult>;
}

export interface HandlerCallback {
  (): Promise<HandlerResult>;
}

export interface ExecConfig
  extends Omit<Omit<Partial<ValidExecConfig>, "options">, "subcommands"> {
  // required fields
  name: string;

  options?: OptionDefinition[];
  subcommands?: CommandDefinition[];
}

export interface CommandDefinition
  extends Omit<
    Omit<Partial<ValidCommandDefinition>, "options">,
    "subcommands"
  > {
  // required fields
  name: string;

  options?: OptionDefinition[];
  subcommands?: CommandDefinition[];
}

export interface OptionDefinition extends Partial<ValidOptionDefinition> {
  // required fields
  name: string;
}

/** @hidden */
export interface ValidExecConfig {
  name: string;
  argv: Argv;

  stdin: InputStream | string;
  stdout: OutputStream | "capture";
  stderr: OutputStream | "capture";

  catchErrors: boolean;
  generateHelp: boolean;

  description: string;
  details: string;
  examples: Example[];

  handler: Handler;
  options: ValidOptionDefinition[];
  subcommands: ValidCommandDefinition[];
}

/** @hidden */
export interface ValidCommandDefinition {
  name: string;
  // alias: string[];
  handler: Handler;

  description: string;
  details: string;
  examples: Example[];

  options: ValidOptionDefinition[];
  subcommands: ValidCommandDefinition[];
}

/** @hidden */
export interface ValidOptionDefinition {
  name: string;
  alias?: string;
  description?: string;
  type?: (input: string) => any;
  multiple?: boolean;
  lazyMultiple?: boolean;
  defaultOption?: boolean;
  defaultValue?: any;
  group?: string;
}

/**
 * HandlerContext objects are provided as the first parameter to handler functions.
 */
export interface HandlerContext {
  data: UserData;

  args: CLIArguments;
  subcommand?: ValidCommandDefinition;

  console: Console;

  argv: Argv;
  stdin: InputStream;
  stdout: OutputStream;
  stderr: OutputStream;
}

export interface UserData {
  [key: string]: any;
}

export interface CLIArguments {
  [key: string]: any;
}

export interface ExecResult {
  result: HandlerResult;
  stdout?: string;
  stderr?: string;
}
