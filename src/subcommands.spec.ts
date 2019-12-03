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
      catchErrors: false,
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
    expect(handler.mock.calls[0][0]).toMatchObject({
      args: { foo: "bar" }
    });
    expect(subhandler.mock.calls[0][0]).toMatchObject({
      args: { bar: "foo" }
    });
    expect(subsubhandler.mock.calls[0][0]).toMatchObject({
      args: { baz: "zab" }
    });
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
