import { ExitCode, HandlerContext } from './interfaces';

/**
 * @hidden
 */
export class CodedError extends Error {
  public code_prefix = "";

  public code: string;
  public processExitCode?: string;

  constructor(code: string | null, message: string) {
    super(message);
    this.code = (this.code_prefix || "") + (code || "UNKNOWN");
    Error.captureStackTrace(this, CodedError);
  }

  static fromError(e: any): CodedError {
    if (e instanceof CodedError) return e;
    const codedError = new CodedError(null, e instanceof Error ? e.message : e);
    codedError.stack = e.stack;
    return codedError;
  }
}

/**
 * @hidden
 */
export class CLIError extends CodedError {
  code_prefix = "CLI_";
}

/**
 * You can use AppError (or a subclass thereof) to throw coded errors from your handlers.
 * 
 */
export class AppError extends CodedError {
  code_prefix = "APP_";
}

export class ExecutionError extends Error {
  public ctx?: HandlerContext;
  public reason: CodedError;
  public code: string;
  public processExitCode?: ExitCode;

  constructor(reason: any, ctx: HandlerContext | undefined) {
    super();
    Error.captureStackTrace(this, ExecutionError);
    if (!(reason instanceof Error)) reason = new Error(reason);
    if (!(reason instanceof CodedError)) reason = CodedError.fromError(reason);
    this.reason = reason;
    this.ctx = ctx;
    this.processExitCode = reason.processExitCode || 1;
    this.message = reason.message;
    this.stack = reason.stack;
    this.code = reason.code;
  }
}
