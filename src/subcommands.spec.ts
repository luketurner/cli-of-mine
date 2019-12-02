import { exec } from '.';
import { ExecConfig } from './interfaces';

describe("cli-of-mine", () => {
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
    execConfig.subcommands;
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
});
