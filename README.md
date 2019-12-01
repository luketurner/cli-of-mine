# cli-of-mine

> _This CLI of mine, I'm gonna let it shine_

This is a no-fuss CLI framework. It solves the CLI stuff, so you can focus on the other stuff.

What's it solve for you?

- Parsing and validating command-line arguments with [command-line-args](https://github.com/75lb/command-line-args).
- Calling the correct function based on the command a user asked for.
- Arbitrary nesting of subcommands using an Express-like middleware pattern.
- Encapsulating all I/O streams for 100% testability -- assuming you use its logging primitives.
- Converting the metadata you provide into nice-looking help text with [command-line-usage](https://github.com/75lb/command-line-usage)
- Handling execution errors.

The goal is to make it easy to add a CLI to your app, without the CLI dictating the way the app should work.

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

All configuration is done by passing options into the `exec()` function. It returns a `Promise` that resolves when the execution is finished. See the [online API documentation](https://luketurner.org/cli-of-mine) for more details.

**Terminology Note**

The following terms have a specific meaning when used in this documentation.

- _argument_ - A single command-line argument.
- _command_ - An argument that matches the name of a command definition.
- _option_ - An argument that starts with a `-` and might have one or more values, e.g. `--force` or `--file foo.txt`.

Also:

- _config_ - A configuration option for `cli-of-mine`. Provided by the developer, not the user.

# Handlers

`cli-of-mine` requires you to specify "handlers" to describe the _implementation_ of your CLI commands. Then, it will construct an execution context and call the appropriate handlers for the commands the user asked for.

Handler functions are _middlewares_ that get called with two arguments: a `context` object (see [HandlerContext](#HandlerContext)) and a `next` function. Handlers are mostly used to:

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

Note that handlers can return a value. `cli-of-mine` doesn't care what you return, but it'll put the value into the `result` property of the object resolved by `exec()`. If a handler returns a `Promise`, the next subcommand handler won't execute until the promise is resolved.

For example, this will cause the `result` property to be equal to `ctx.args`:

```js
function handler(ctx, next) {
  return Promise.resolve(ctx.args);
}
```

In addition, if your command has subcommands, your handler **must choose when to relinquish control to the next handler** by calling `next()` (which returns a Promise). For example:

```js
function handler(ctx, next) {
  // things to do before subcommand starts

  return next().then(result => {
    // things to do after subcommand is finished
  });
}
```

It's important to note, you cannot provide arguments to `next()`. If you want to some data to be available to subcommands, you should assign it to the `ctx.data` object, which `cli-of-mine` reserves for applications to use however they want.

For example, the following handler will initialize a database connection for the subcommand to use, then clean it up once the subcommand is finished. The `async`/`await` syntax is used in this and remaining examples to improve readability.

```js
async function handler(ctx, next) {
  const { args, data } = ctx;

  // initialize dbConn before running subcommand -- assume getDatabaseConnection is part of your application's code
  data.dbConn = await getDatabaseConnection(args.db);

  const result = await next();

  // Clean up dbConn after subcommand is done
  await data.dbConn.close();

  // make sure to return the subcommand's result if you care about it.
  return result;
}
```

### Error Handling

Handlers should try to always throw instances of `AppError`, or subclasses thereof. These error classes accept two constructor arguments -- a code and a message. For example:

```js
throw new AppError(
  "SERVER_UNAVAILABLE",
  "The downstream server is unavailable."
);
```

You can also construct an AppError from an existing error:

```js
try {
  // do stuff
} catch (e) {
  throw AppError.fromError(e);
}
```

Note that all AppError codes are "namespaced" by prefixing them with `APP_` by default. This allows you to use whatever error codes you want without using the same codes as `cli-of-mine` (or Node itself.)

A common use-case is to change that prefix, so you can document error codes more cleanly in your app. You can do so by extending AppError:

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

## Nested Subcommands

`cli-of-mine` is designed to support arbitrarily nested levels of subcommands using a **middleware pattern** inspired by frameworks like Express. This allows you to handle options at every subcommand level.

For example, assume `widgets` is a subcommand of your application and `list` is a subcommand of `widgets` -- so users can run `myapp widgets list`.

If someone runs: `myapp -v widgets list --filter green`, then the "middleware chain" will be constructed like so:

1. The root handler is given the `-v` argument.
2. The `widgets` handler is given no arguments.
3. The `list` handler is given the `--filter green` argument.

All handlers are given a shared `ctx` object as their third argument. This object is a "grab bag" that can be used for handlers to share application-specific data.

## Help Text

`cli-of-mine` generates help-text for you. Different text is shown based on which command receives the `--help` flag. For example:

```
myapp --help
myapp widgets --help
myapp widgets list --help
```

The above would all display help pages with different options -- the first with globalfor `myapp`, the second for `myapp widgets`, the third for `myapp widgets list`.

But there's more to help-text

## FAQ

**Q: What prompted you to create cli-of-mine?**

When I was working on a Node CLI application, [repost](https://github.com/luketurner/repost), one of my goals was to create an application that controls all its inputs and outputs, has no global state or singletons, and doesn't use classes or Typescript.

Most existing CLI libraries violate at least one of those criteria.

The best library I found was `command-line-args`, which is great, but requires boilerplate code. So I took that boilerplate and made a "framework".

**Q: Why does my application have to use your special console?**

`cli-of-mine` has a goal of "Capturing All I/O." But, it also has a strict "No Global Changes" rule and that applies to changing the `global.console` object.

The only way we can capture all IO without global changes, is to allow our applications to be configured with a custom logger. Therefore, `cli-of-mine` gives us the tools to do that.

If you don't care about global changes, your handler can assign the console for global use with:

```js
global.console = ctx.console;
```

**Q: When should I _not_ use cli-of-mine?**

- You just want to parse arguments and you don't like inversion of control. In that case, try `command-line-args` or `minimist` instead.
- You want _all_ the batteries included. In that case, there are some much larger frameworks like `oclif` and `yargs` that might be able to help you.
- You want a well-supported library with low bus-factor. This is a personal project and I do not commit to long-term support. (But, it's freakin' simple. You can fork it and understand the code in an hour.)
- You use non-utf8 encodings. (For now, `cli-of-mine` works best with utf8 encoded streams.)

---

Copyright 2019 Luke Turner - Published under the MIT License.
