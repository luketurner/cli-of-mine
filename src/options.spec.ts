import { exec } from '.';
import { ExecConfig } from './interfaces';

describe("option-related features", () => {
  let execConfig: ExecConfig;

  const testCLI = (argv: string[] = []) => exec({ ...execConfig, argv });

  beforeEach(() => {
    execConfig = {
      errorStrategy: "throw",
      name: "testapp",
      handler: () => {},
      options: [{ name: "foo" }]
    };
  });

  it("should provide parsed arguments in the ctx.args property of HandlerContext", async () => {
    const handler = jest.fn();
    execConfig.handler = handler;
    await testCLI(["--foo", "bar"]);
    expect(handler.mock.calls[0][0]).toMatchObject({
      args: { foo: "bar" }
    });
  });

  it("should provide an empty object to ctx.args if no arguments are specified", async () => {
    const handler = jest.fn();
    execConfig.handler = handler;
    await testCLI([]);
    expect(handler.mock.calls[0][0]).toMatchObject({
      args: {}
    });
  });

  it("should throw an error when an unknown option is encountered", async () => {
    const handler = jest.fn();
    execConfig.handler = handler;
    await expect(testCLI(["--badoption", "bar"])).rejects.toThrow(
      "Unexpected argument: --badoption"
    );
  });
});
