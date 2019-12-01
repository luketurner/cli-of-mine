import { exec } from '.';
import { ExecConfig } from './interfaces';

const testCLI = (opts: Partial<ExecConfig>) =>
  exec({ catchErrors: false, argv: [], name: "testapp", ...opts });

describe("simple-cli", () => {
  describe("exec", () => {
    it("should return handler's return value as result property", async () => {
      const { result } = await testCLI({
        handler: jest.fn(() => "result-value")
      });
      expect(result).toEqual("result-value");
    });

    it("should resolve handler if it is async and put resolved value into result property", async () => {
      const { result } = await testCLI({
        handler: jest.fn(async () => "resolved-value")
      });
      expect(result).toEqual("resolved-value");
    });

    it("should capture stdout into the stdout property in the resolved object", async () => {
      const { stdout } = await testCLI({
        handler: jest.fn(async ctx => ctx.console.log("expected log output")),
        stdout: "capture"
      });
      expect(stdout).toMatch("expected log output");
    });

    it("should capture stderr into the stderr property in the resolved object", async () => {
      const { stderr } = await testCLI({
        handler: jest.fn(async ctx => ctx.console.error("expected log output")),
        stderr: "capture"
      });
      expect(stderr).toMatch("expected log output");
    });

    it("should pass parsed options into handler as first argument", async () => {
      const handler = jest.fn();
      await testCLI({
        argv: ["--foo", "bar"],
        options: [{ name: "foo" }],
        handler
      });
      expect(handler.mock.calls[0][0]).toMatchObject({
        args: { foo: "bar" }
      });
    });

    it("should pass args to subcommands", async () => {
      const handler = jest.fn((_ctx, next) => next());
      const subhandler = jest.fn((_ctx, next) => next());
      const subsubhandler = jest.fn();
      await testCLI({
        argv: [
          "--foo",
          "bar",
          "testcommand",
          "--bar",
          "foo",
          "subcommand",
          "--baz",
          "zab"
        ],
        options: [{ name: "foo" }],
        handler,
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
      });
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

    it("should generate helptext when --help is specified", async () => {
      const handler = jest.fn();
      const { stdout } = await testCLI({
        argv: ["--help"],
        stdout: "capture",
        description: "test description",
        handler
      });
      expect(handler).not.toHaveBeenCalled();
      expect(stdout).toMatch("test description");
    });
  });
});
