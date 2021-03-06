# cli-of-mine

[docs](https://luketurner.org/cli-of-mine) - [github](https://github.com/luketurner/cli-of-mine) - [npm](https://www.npmjs.com/package/cli-of-mine)

> _"This CLI of mine, I'm gonna let it shine!"_

This is a no-fuss CLI framework. It solves the CLI stuff, so you can focus on the other stuff.

What's it solve for you?

- Parsing and validating command-line arguments with [command-line-args].
- Calling the correct function based on the command a user asked for.
- Arbitrary nesting of subcommands using an Express-like middleware pattern.
- Encapsulating all I/O streams for 100% testability -- assuming you use its logging primitives.
- Converting the metadata you provide into nice-looking help text with [command-line-usage].
- Handling execution errors.
- Determining an appropriate exit code for the process.
- Resource-style commands (e.g. `myapp [verb] [noun]`)

See the [online docs] for API reference information.

1. [Getting Started](#getting-started)
   1. [Terminology](#terminology)
1. [Handlers](#handlers)
   1. [Handler Results](#handler-results)
   1. [Handler Errors](#handler-errors)
1. [Subcommands](#subcommands)
   1. [Subcommand Options](#subcommand-options)
   1. [Subcommands Sharing Data](#subcommands-sharing-data)
   1. [Required Subcommands](#required-subcommands)
1. [Resources](#resources)
1. [Help Text](#help-text)
1. [Version Text](#version-text)
1. [Error Strategies](#error-strategies)
1. [Testing](#testing)
1. [FAQ](#faq)
1. [Development](#Development)

# Getting Started

Install `cli-of-mine` from npm:

> **Important Note:** `cli-of-mine` is tested with the latest versions of node v8, v10, and v12, on Ubuntu, Windows, and OS X. Any other Node versions (or OSes) are not officially supported.


```bash
npm i cli-of-mine
```

`cli-of-mine` follows strict semantic versioning according to [semver v2.0.0](https://semver.org/).


**Basic Usage**

The `cli-of-mine` module exports a single function, [exec]. The function expects an [ExecConfig] object that describes how the CLI should work.

A "hello world" example just needs to define a `name` and a `handler`:

```js
const { exec } = require("cli-of-mine");

exec({
  name: "my-app",

  handler(ctx) {
    ctx.console.log("Hello, world!");
  }
}).then(result => process.exit(result.processExitCode));
```

For a full list of the possible options, see the [ExecConfig] object in the API documentation.

## Terminology

The following terms have a specific meaning when used in this documentation.

- _config_ - A configuration option for `cli-of-mine`. Provided by the developer, not the user.
- _argument_ - A single command-line argument, provided by the user.
- _command_ - An argument that matches the name of a command definition.
- _option_ - An argument that starts with a `-` and might have one or more values, e.g. `--force` or `--file foo.txt`.

# Handlers

When [exec] is called, it calls one or more [Handlers](Handler) based on the commands/subcommands that the user is invoking. The handlers implement the "business logic" or "application logic" for the commands.

For example, this handler prints `"Hello, World!"` using the `cli-of-mine` logging primitives.

```js
const { exec } = require("cli-of-mine");

exec({
  name: "my-app",
  handler(ctx) {
    ctx.console.log("Hello, world!");
  }
});
```

[Handlers](Handler) are functions that get called with two arguments: a `context` object (see [HandlerContext]) and a `next` function (see [HandlerCallback]).

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

## Handler Errors

Any errors thrown within a handler will be caught and dealt with automatically.

Handlers can buy into improved error handling by throwing or rejecting with instances of [AppError]. It extends `Error` with support for error codes, and it automatically "namespaces" your codes by prefixing them with `APP_`, so they won't conflict with `cli-of-mine` codes (or Node codes).

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

  constructor(code: string | null, message: string) {
    super(code, message);
    Error.captureStackTrace(this, FooError);
  }
}

try {
  throw new FooError("MY_CODE", "my message");
} catch (e) {
  console.log(e.code); // logs FOO_MY_CODE
}
```

# Subcommands

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

### Required Subcommands

Handlers have access to the `subcommand` property of [HandlerContext], which indicates which subcommand (if any) the user has requested. This can be used, for instance, to throw an error if no subcommands are specified:

```js
function handler(ctx, next) {
  if (!ctx.subcommand) {
    throw new AppError("BAD_COMMAND", "Must specify command");
  }
  return next();
}
```

# Resources

`cli-of-mine` includes support for declaring _resources_ and _verbs_ using the `resources` property of [ExecConfig]. This provides support for the `myapp [verb] [noun]` invocation pattern, as used by `kubectl` for instance.

As a trivial example, say we want to make a CLI that lets you run:

```bash
myapp add widget
myapp get widget
myapp rm widget
```

We can do this by defining a `widget` resource:

```js
exec({
  name: "myapp",

  resources: [
    {
      name: "widget",
      commands: [
        {
          name: "add",
          handler: ctx => ctx.console.log("add widget")
        },
        {
          name: "get",
          handler: ctx => ctx.console.log("get widget")
        }
        {
          name: "rm",
          handler: ctx => ctx.console.log("rm widget")
        }
      ]
    }
  ],
});
```

Resources and subcommands can be used together. If a resource and subcommand overlaps, the subcommand is chosen and executed instead. This can be used to define "default" behavior for a given verb, for example:

```js
exec({
  name: "myapp",

  resources: [
    {
      name: "widget",
      commands: [
        {
          name: "run",
          handler: ctx => ctx.console.log("Running widget")
        }
      ]
    }
  ],

  subcommands: [
    {
      name: "run",
      handler: ctx => ctx.console.log("Default run behavior")
    }
  ]
});
```

In this case, both these invocations are valid:

```bash
myapp run widget    # prints "Running widget"
myapp run           # prints "Default run behavior"
```

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

# Version Text

`cli-of-mine` will intercept `--version` options (_unless_ they are passed to a subcommand) and print version information based on the `version` property of the [ExecConfig]. This behavior can be disabled by setting `generateVersion: false`.

# Error Strategies

[exec] provides three strategies for automated error handling, which you can pick using the `errorStrategy` property of the [ExecConfig].

The `"log"` strategy is the default.

## Log

When `errorStrategy: "log"`, the [exec] function will automatically catch and log any errors that occur during execution, including errors that your handlers throw. This means it never rejects.

The [ExecResult] will contain a `processExitCode` property that indicates what exit code is recommended to be used. [exec] _will not_ exit the process automatically.

This is the default mode. It's useful if you want `cli-of-mine` to handle as much as possible, but you don't want it to exit the process for you.

## Throw

when `errorStrategy: "throw"`, errors during execution will cause the returned `Promise` to be rejected with an [ExecutionError] that you can inspect and handle manually.

This mode is useful for testing, or for cases where you want the code calling [exec] to be able to catch errors from within your handlers.

## Exit

When `errorStrategy: "exit"`, errors during execution will be logged to the user. If the execution would result in a nonzero exit code, the process will be automatically exited with that code.

This mode is useful if you want `cli-of-mine` to completely manage error handling, and you don't need to run any code after [exec] is finished.

# Testing

One core design goal of `cli-of-mine` is to be testable _from the user's perspective_. In other words, it should be possible to easily write tests like:

> "If I pass the --foo option, the output should include 'bar'."

This can be done by using the stdio-related parameters on [ExecConfig], assuming your application uses the `cli-of-mine` logging primitives. For example:

```js
exec({
  name: "testapp",
  options: [{ name: "foo" }],

  argv: ["--foo"],
  stdout: "capture",

  async handler(ctx, next) {
    const { foo } = ctx.args;
    ctx.console.log(foo ? "bar" : "bad request!");
  }
}).then(result => {
  expect(result.stdout).toEqual("bar");
});
```

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

When I was working on a Node CLI application, [repost](https://github.com/luketurner/repost), one of my goals was to create an application that controls all its inputs and outputs, and has no global state or singletons.

As part of that, I wanted to make a CLI framework that allowed you to completely control your application's I/O, for instance to make assertions about output data. This is that framework.

**Q: But what about all the existing CLI frameworks?**

Surprisingly few CLI frameworks are designed for effective testing from the user's perspective. If I call the program with X arguments, do I see Y results? That can be a tough question to answer, even if you're using a CLI framework. The "special" thing about `cli-of-mine` is that it tries to make this kind of assertion easier using the `stdout: "capture"` option.

Having said that, the "established" Node CLI frameworks are still great, they just don't fit the grooves in my brain as well as this one does.

**Q: When should I _not_ use cli-of-mine?**

- You just want to parse arguments and you don't like inversion of control. In that case, try [command-line-args] or [minimist] instead.
- You want _all_ the batteries included. In that case, there are some larger frameworks like [oclif] and [yargs] that might be able to help you.
- You want a well-supported library with low bus-factor. This is a personal project and I do not commit to long-term support. (This may change in the future.) For a similarly-featured, very popular library, try [commander].
- You use non-utf8 encodings. For now, `cli-of-mine` works best with utf8 encoded streams.

# Development

This section is for folks wanting to make changes to `cli-of-mine` itself.

It all starts with cloning the repository:

```
git clone https://github.com/luketurner/cli-of-mine.git

cd cli-of-mine
```

Then you can go ahead and run the tests:

```bash
# run tests once
npm run test

# automatically re-run tests when files change
npm run test:watch
```

`cli-of-mine` roughly hews to a test-driven development style. All features have at least one "acceptance test."

When new features or bugfixes are added, the changes _must_ come with acceptance tests.

**API Documentation**

The library [API documentation](https://luketurner.org/cli-of-mine) is generated by TypeDoc. The following documentation-related commands are available:

```bash
# rebuild /docs
npm run docs

# rebuild docs and run http server on localhost:8080
npm run docs:serve

# like docs:serve, but rebuilds when files change
npm run docs:watch
```


---

Copyright 2019 Luke Turner - Published under the MIT License.

[command-line-args]: https://github.com/75lb/command-line-args
[command-line-usage]: https://github.com/75lb/command-line-usage
[commander]: https://github.com/tj/commander.js
[minimist]: https://github.com/substack/minimist
[oclif]: https://github.com/oclif/oclif
[yargs]: https://github.com/yargs/yargs
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
