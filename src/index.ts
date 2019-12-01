import { Console } from 'console';

import { validateConfig } from './config';
import { ExecutionError } from './error';
import { getHelp } from './help';
import { CommandDefinition, ExecConfig, ExecResult, HandlerCallback, HandlerContext, HandlerResult } from './interfaces';
import { ComposedMiddleware, composeMiddlewares, Middleware, MiddlewareCallback } from './middleware';
import { parseArgv, ParsedCommand } from './parse';
import { withStdIO } from './stdio';

async function catchErrorHandler(
  ctx: HandlerContext,
  next: HandlerCallback
): Promise<HandlerResult> {
  try {
    return await next();
  } catch (e) {
    ctx.console.error(e.message || e);
  }
}

async function throwErrorHandler(
  ctx: HandlerContext,
  next: HandlerCallback
): Promise<HandlerResult> {
  try {
    return await next();
  } catch (e) {
    throw new ExecutionError(e, ctx);
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
  baseContext: HandlerContext
): ComposedMiddleware {
  const handlerMiddlewares: Middleware[] = cmds.map(({ command, args }) => {
    const handler = getCommandHandler(command);
    const ctx = { ...baseContext, args };
    return async next => handler(ctx, next);
  });

  return composeMiddlewares(handlerMiddlewares);
}

export async function exec(userConfig: ExecConfig): Promise<ExecResult> {
  const config = validateConfig(userConfig);

  const errorHandler = config.catchErrors
    ? catchErrorHandler
    : throwErrorHandler;

  return await withStdIO(config, async ({ stdin, stdout, stderr }) => {
    const ctx: HandlerContext = {
      stdin,
      stdout,
      stderr,
      console: new Console(stdout, stderr),
      data: {},
      args: {},
      argv: config.argv
    };

    return await errorHandler(ctx, async () => {
      const cmds = parseArgv(config);

      if (config.generateHelp) {
        for (const { command, args } of cmds) {
          if (args.help) {
            return ctx.console.log(getHelp(command));
          }
        }
      }

      const composedMiddlewares = composeParsedCommandHandlers(cmds, ctx);

      return await composedMiddlewares();
    });
  });
}
