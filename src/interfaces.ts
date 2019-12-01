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

/** @hidden */
export interface ValidExecConfig {
  name: string;
  argv: Argv;

  stdin: InputStream | "capture";
  stdout: OutputStream | "capture";
  stderr: OutputStream | "capture";

  catchErrors: boolean;
  generateHelp: boolean;

  description: string;
  examples: Example[];

  handler: Handler;
  options: OptionDefinition[];
  subcommands: CommandDefinition[];
}

export interface ExecConfig extends Partial<ValidExecConfig> {
  // These fields are the only required ones
  name: string;
  handler: Handler;
}

/**
 * A CommandDefintiion contains a complete description of a single command
 * that's supported by your application -- including supported arguments
 * and subcommands, if any.
 *
 * The `name` and `handler` fields are required.
 */
export interface CommandDefinition {
  name: string;
  // alias: string[];
  handler?: Handler;

  description?: string;
  details?: string;
  examples?: Example[];

  options?: OptionDefinition[];
  subcommands?: CommandDefinition[];
}

/**
 * An OptionDefinition describes a supported option for your application/command.
 *
 * Parsing these is handled by [command-line-args](https://github.com/75lb/command-line-args).
 */
export interface OptionDefinition {
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
