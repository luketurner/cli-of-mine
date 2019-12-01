# cli-of-mine

> _This CLI of mine, I'm gonna let it shine_

This is a no-fuss CLI framework. It solves the CLI stuff, so you can focus on the other stuff.

What's it solve for you?

- Parsing and validating command-line arguments with [command-line-args].
- Calling the correct function based on the command a user asked for.
- Arbitrary nesting of subcommands using an Express-like middleware pattern.
- Encapsulating all I/O streams for 100% testability -- assuming you use its logging primitives.
- Converting the metadata you provide into nice-looking help text with [command-line-usage].
- Handling execution errors.

See the [online docs] for API reference information.

# Getting Started

Install `cli-of-mine` from Github:

```
npm i luketurner/cli-of-mine
```

This is the simplest possible CLI app:

```js
const { exec } = require("cli-of-mine");

exec({
  name: "my-app",

  handler(ctx) {
    ctx.console.log("Hello, world!");
  }
});
```

All configuration is done by passing options into the [exec] function. It returns a `Promise` that resolves when the execution is finished.

For more information on the config `exec` supports, check out the [exec] and [ExecConfig] docs.

## Terminology Note

The following terms have a specific meaning when used in this documentation.

- _config_ - A configuration option for `cli-of-mine`. Provided by the developer, not the user.
- _argument_ - A single command-line argument, provided by the user.
- _command_ - An argument that matches the name of a command definition.
- _option_ - An argument that starts with a `-` and might have one or more values, e.g. `--force` or `--file foo.txt`.

# Help Text

`cli-of-mine` will intercept `--help` flags and handle them automatically. When this happens, _none_ of your handlers will be called and the `result` of the execution will be `undefined`.

Different text is shown based on which command receives the `--help` flag. For example:

```bash
# displays root help for myapp
myapp --help

# displays help for "widgets" command
myapp widgets --help

# displays help for "list" subcommand
myapp widgets list --help
```

You can disable this functionality by setting `generateHelp: false` in your [ExecConfig].

# Handlers

`cli-of-mine` requires you to specify **handlers**, which provide the implementation of your CLI commands. The framework will call the appropriate handlers for the commands the user asked for.

Handlers are functions that get called with two arguments: a `context` object (see [HandlerContext]) and a `next` function (see [HandlerCallback]). See the [Handler] interface for more details about supported types.

You can ignore the `next` function unless you want to support subcommands. See [Subcommands].

Handlers are mostly used to:

1. Execute your application logic for each command.
2. Provide shared context for subcommand handlers.

The first use-case, executing business logic, is carried out by the final command in the chain. (The "controller", so to speak.)

This is a very simple example that just logs the CLI arguments it received:

```js
function handler(ctx, next) {
  const { args, console } = ctx;
  console.log("Got args:", args);
}
```

## Handler Results

Handlers can return a value of any type. This provides a way for handlers to communicate with the code that called [exec].

Whatever they return will be returned to the next tier of middleware and eventually put into the `result` property of the [ExecResult].

Also, if a handler returns a `Promise`, the next subcommand handler won't execute until the promise is resolved.

For example, this will cause the `ExecResult.result` property to be equal to `ctx.args`:

```js
function handler(ctx, next) {
  return Promise.resolve(ctx.args);
}
```

## Subcommands

`cli-of-mine` is designed to support arbitrarily nested levels of subcommands using a **middleware pattern** inspired by frameworks like Express. This allows you to handle options at every subcommand level.

The special thing about middlewares is that your handler **must choose when to relinquish control to the next handler** by calling `next()` (which returns a Promise). For example:

```js
function handler(ctx, next) {
  // things to do before subcommand starts

  // next() runs the subcommand's handler
  return next().then(result => {
    // things to do after subcommand is finished
  });
}
```

To "abort" the middleware chain, you can throw an error, or simply not call `next()`.

Your final handler (the "controller" in Express parlance) can call `next` if it wants, but it doesn't have to. If it does, the `next` is a no-op.

### Subcommand Options

Each "level" of command/subcommand specifies its own set of options. The handler is only provided the options relevant to that specific subcommand, not the ones before or after it.

For example, assume `widgets` is a subcommand of your application and `list` is a subcommand of `widgets` -- so users can run `myapp widgets list`.

If someone runs: `myapp -v widgets list --filter green`, then the options will be doled out like so:

1. The root handler is given the `-v` argument.
2. The `widgets` handler is given no arguments.
3. The `list` handler is given the `--filter green` argument.

If the `list` handler actually cares about the `-v` argument, the root handler has to give it that information explicitly using `ctx.data` (see below).

### Subcommands Sharing Data

You cannot provide arguments to `next()`.

If you want to share data between subcommands, you should assign it to the `ctx.data` object, which is reserved for arbitrary handler data.

For example, the following handler will initialize a database connection for the subcommand to use, then clean it up once the subcommand is finished.

> Note: The `async`/`await` syntax is used in this and remaining examples to improve readability. But good ol' Promise chains work just fine.

```js
async function handler(ctx, next) {
  const { args, data } = ctx;

  // initialize dbConn before running subcommand
  data.dbConn = await getFooDatabaseConn(args.db);

  const result = await next();

  // Clean up dbConn after subcommand is done
  await data.dbConn.close();

  // make sure to return the subcommand's result if you care about it.
  return result;
}
```

## Error Handling

Handlers can "buy into" improved error handling by throwing instances of [AppError]. It extends `Error` with support for error codes, and it automatically "namespaces" your codes by prefixing them with `APP_`, so they won't conflict with `cli-of-mine` codes (or Node codes).

For example:

```js
const { AppError } = require("cli-of-mine");

throw new AppError(
  "SERVER_UNAVAILABLE", // error code
  "The downstream server is unavailable." // message
);
```

Additionally, you can set the optional `processExitCode` property to recommend an exit code to use, should this error become fatal.

You can construct an AppError from an existing error using `fromError`:

```js
try {
  // do stuff
} catch (e) {
  throw AppError.fromError(e);
}
```

### Custom Error Classes

It's recommended that you extend [AppError] to implement your own error class, so you can document error codes more cleanly in your app. For example:

```js
class FooError extends AppError {
  code_prefix = "FOO_";
}

try {
  throw new FooError("MY_CODE", "my message");
} catch (e) {
  console.log(e.code); // logs FOO_MY_CODE
}
```

## Catching Errors

By default, the [exec] function will automatically catch and log any errors that occur during execution, including errors that your handlers throw. This means it never rejects.

If you wish to disable this behavior, set `catchErrors: false` in your [ExecConfig].

When `catchErrors` is false, the Promise returned by [exec] will possibly reject with an [ExecutionError], that you can inspect and handle in your application.

# FAQ

**Q: Is there an @types/cli-of-mine package?**

No -- `cli-of-mine` is written in Typescript and includes the type definitions bundled in the package. No additional `@types` are needed.

**Q: Why does my application have to use your special console?**

`cli-of-mine` has a goal of "Capturing All I/O." But, it also has a strict "No Global Changes" rule and that applies to changing the `global.console` object.

The only way we can capture all IO without global changes, is to allow our applications to be configured with a custom logger. Therefore, `cli-of-mine` gives us the tools to do that.

If you don't care about global changes, your handler can assign the console for global use with:

```js
global.console = ctx.console;
```

**Q: What prompted you to create cli-of-mine?**

When I was working on a Node CLI application, [repost](https://github.com/luketurner/repost), one of my goals was to create an application that controls all its inputs and outputs, has no global state or singletons, and doesn't use classes or Typescript.

Most existing CLI libraries violate at least one of those criteria.

The best library I found was `command-line-args`, which is great. I ended up writing more and more "frameworky boilerplate" around that library, simplifying usage for the most common use-cases, and this is what I ended up with.

**Q: When should I _not_ use cli-of-mine?**

- You just want to parse arguments and you don't like inversion of control. In that case, try `command-line-args` or `minimist` instead.
- You want _all_ the batteries included. In that case, there are some much larger frameworks like `oclif` and `yargs` that might be able to help you.
- You want a well-supported library with low bus-factor. This is a personal project and I do not commit to long-term support. (But, it's freakin' simple. You can fork it and understand the code in an hour.)
- You use non-utf8 encodings. (For now, `cli-of-mine` works best with utf8 encoded streams.)

---

Copyright 2019 Luke Turner - Published under the MIT License.

[command-line-args]: https://github.com/75lb/command-line-args
[command-line-usage]: https://github.com/75lb/command-line-usage
[online docs]: https://luketurner.org/cli-of-mine
[handlercontext]: interfaces/handlercontext.html
[commanddefinition]: interfaces/commanddefinition.html
[exec]: globals.html#exec
[execconfig]: interfaces/execconfig.html
[execresult]: interfaces/execresult.html
[apperror]: classes/apperror.html
[executionerror]: classes/executionerror.html
[handler]: interfaces/handler.html
[handlercallback]: interfaces/handlercallback.html
[subcommands]: #subcommands
