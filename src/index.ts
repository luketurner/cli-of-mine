import { Console } from 'console';

import { validateConfig } from './config';
import { ExecutionError } from './error';
import { getHelp } from './help';
import {
  CommandDefinition,
  ExecConfig,
  ExecResult,
  HandlerCallback,
  HandlerContext,
  HandlerResult,
  ValidExecConfig,
} from './interfaces';
import { ComposedMiddleware, composeMiddlewares, Middleware, MiddlewareCallback } from './middleware';
import { parseArgv, ParsedCommand } from './parse';
import { withStdIO } from './stdio';

export { AppError } from "./error";

async function logErrorHandler(
  ctx: HandlerContext,
  next: HandlerCallback
): Promise<HandlerResult> {
  try {
    return await next();
  } catch (e) {
    ctx.console.error(e.message || e);
    ctx.processExitCode = e.processExitCode || 1;
    return;
  }
}

async function throwErrorHandler(
  ctx: HandlerContext,
  next: HandlerCallback
): Promise<HandlerResult> {
  try {
    return await next();
  } catch (e) {
    const execError = new ExecutionError(e, ctx);
    ctx.processExitCode = execError.processExitCode;
    throw execError;
  }
}

async function exitErrorHandler(
  ctx: HandlerContext,
  next: HandlerCallback
): Promise<HandlerResult> {
  try {
    await next();
    if (ctx.processExitCode) process.exit(ctx.processExitCode);
  } catch (e) {
    ctx.console.error(e.message || e);
    process.exit(e.processExitCode || 1);
    return;
  }
}

async function emptyHandler(_ctx: HandlerContext, next: MiddlewareCallback) {
  return next();
}

function getCommandHandler(command: CommandDefinition) {
  return command.handler || emptyHandler;
}

function composeParsedCommandHandlers(
  cmds: ParsedCommand[],
  ctx: HandlerContext
): ComposedMiddleware {
  const handlerMiddlewares: Middleware[] = cmds.map(({ command, args }, ix) => {
    const handler = getCommandHandler(command);
    if (ix + 1 < cmds.length) {
      ctx.subcommand = cmds[ix + 1].command;
    }

    return async next => {
      ctx.args = args;
      return handler(ctx, next);
    };
  });

  return composeMiddlewares(handlerMiddlewares);
}

export async function exec(userConfig: ExecConfig): Promise<ExecResult> {
  const config = validateConfig(userConfig);

  const errorHandler = {
    throw: throwErrorHandler,
    log: logErrorHandler,
    exit: exitErrorHandler
  }[config.errorStrategy];

  const ctx: Partial<HandlerContext> = {
    data: {},
    args: {},
    argv: config.argv,
    processExitCode: 0
  };
  // TODO -- better way to handle this withStdIO abstraction
  const execResult: ExecResult = await withStdIO(
    config,
    async ({ stdin, stdout, stderr }) => {
      ctx.stdin = stdin;
      ctx.stdout = stdout;
      ctx.stderr = stderr;
      ctx.console = new Console(stdout, stderr);

      // TODO -- handle this better too
      const validContext = ctx as HandlerContext;

      return await errorHandler(validContext, async () => {
        const cmds = parseArgv(config);

        if (config.generateHelp) {
          for (const { command, args } of cmds) {
            if (args.help) {
              return validContext.console.log(getHelp(command));
            }
          }
        }

        if (config.generateVersion && cmds[0].args.version) {
          return validContext.console.log(getVersion(config));
        }

        const composedMiddlewares = composeParsedCommandHandlers(
          cmds,
          validContext
        );

        const result = await composedMiddlewares();

        return result;
      });
    }
  );

  execResult.processExitCode = ctx.processExitCode || 0;
  return execResult;
}

function getVersion(config: ValidExecConfig): string {
  return `${config.name}: ${config.version}`;
}
