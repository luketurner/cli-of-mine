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

export interface ExecConfig {
  name: string;
  argv?: Argv;

  stdin?: InputStream | string;
  stdout?: OutputStream | "capture";
  stderr?: OutputStream | "capture";

  errorStrategy?: "throw" | "log" | "exit";
  generateHelp?: boolean;
  generateVersion?: boolean;

  version?: string;
  description?: string;
  details?: string;
  examples?: Example[];

  handler?: Handler;

  options?: OptionDefinition[];
  subcommands?: CommandDefinition[];
}

export interface CommandDefinition {
  name: string;

  handler?: Handler;

  description?: string;
  details?: string;
  examples?: Example[];

  options?: OptionDefinition[];
  subcommands?: CommandDefinition[];
}

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
 * @hidden
 */
export interface ValidExecConfig extends Required<ExecConfig> {
  options: ValidOptionDefinition[];
  subcommands: ValidCommandDefinition[];
}

/**
 * @hidden
 */
export interface ValidOptionDefinition extends OptionDefinition {}

/**
 * @hidden
 */
export interface ValidCommandDefinition extends Required<CommandDefinition> {
  options: ValidOptionDefinition[];
  subcommands: ValidCommandDefinition[];
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

  processExitCode: number;
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
  processExitCode?: number;
}
