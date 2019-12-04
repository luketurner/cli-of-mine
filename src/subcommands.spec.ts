import { exec } from '.';
import { ExecConfig } from './interfaces';

describe("subcommands", () => {
  let execConfig: ExecConfig;
  let handler: jest.Mock;
  let subhandler: jest.Mock;
  let subsubhandler: jest.Mock;

  const testCLI = (argv: string[] = []) => exec({ ...execConfig, argv });

  beforeEach(() => {
    handler = jest.fn((_ctx, next) => next());
    subhandler = jest.fn((_ctx, next) => next());
    subsubhandler = jest.fn(() => {});
    execConfig = {
      errorStrategy: "throw",
      name: "testapp",
      handler: handler,
      options: [{ name: "foo" }],
      subcommands: [
        {
          name: "testcommand",
          options: [{ name: "bar" }],
          handler: subhandler,
          subcommands: [
            {
              name: "subcommand",
              options: [{ name: "baz" }],
              handler: subsubhandler
            }
          ]
        }
      ]
    };
  });

  it("should pass args to subcommands", async () => {
    handler.mockImplementation((ctx, next) => {
      expect(ctx.args).toMatchObject({ foo: "bar" });
      return next();
    });
    subhandler.mockImplementation((ctx, next) => {
      expect(ctx.args).toMatchObject({ bar: "foo" });
      return next();
    });
    subsubhandler.mockImplementation((ctx, next) => {
      expect(ctx.args).toMatchObject({ baz: "zab" });
      return next();
    });

    await testCLI([
      "--foo",
      "bar",
      "testcommand",
      "--bar",
      "foo",
      "subcommand",
      "--baz",
      "zab"
    ]);
  });

  it("should allow subcommands to share data using ctx.data", async () => {
    handler.mockImplementation((ctx, next) => {
      ctx.data.testProperty = "test-value";
      return next();
    });
    await testCLI(["testcommand", "subcommand"]);
    expect(subsubhandler.mock.calls[0][0]).toMatchObject({
      data: { testProperty: "test-value" }
    });
  });

  it("should set ctx.subcommand to the CommandDefinition of the user-requested subcommand", async () => {
    await testCLI(["testcommand"]);
    expect(handler.mock.calls[0][0]).toMatchObject({
      subcommand: { name: "testcommand" }
    });
  });

  it("should set ctx.subcommand to null if no subcommand was requested", async () => {
    await testCLI([]);
    expect(handler.mock.calls[0][0].subcommand).toBeFalsy();
  });
});
