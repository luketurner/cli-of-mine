import { exec } from '.';
import { ExecConfig } from './interfaces';

describe("stdio features", () => {
  let execConfig: ExecConfig;

  const testCLI = (argv: string[] = []) => exec({ ...execConfig, argv });

  beforeEach(() => {
    execConfig = {
      catchErrors: false,
      name: "testapp",
      handler: () => {}
    };
  });

  describe("when stdout is set to 'capture'", () => {
    beforeEach(() => {
      execConfig.stdout = "capture";
    });

    it("should capture everything logged with ctx.console.log", async () => {
      execConfig.handler = jest.fn(async ctx => {
        ctx.console.log("expected log output");
      });
      const { stdout } = await testCLI();
      expect(stdout).toEqual("expected log output\n");
    });

    it("should capture things explicitly written to stdout stream", async () => {
      execConfig.handler = jest.fn(async ctx =>
        ctx.stdout.write("expected output")
      );
      const { stdout } = await testCLI();
      expect(stdout).toEqual("expected output");
    });

    it("should concatenate all chunks in the output stream together", async () => {
      execConfig.handler = jest.fn(async ctx => {
        ctx.console.log("expected");
        ctx.console.log("log output");
      });
      const { stdout } = await testCLI();
      expect(stdout).toEqual("expected\nlog output\n");
    });

    it("should not capture things logged with regular console", async () => {
      execConfig.handler = jest.fn(async () =>
        console.log("expected log output")
      );
      const { stdout } = await testCLI();
      expect(stdout).toEqual("");
    });
  });

  describe("when stderr is set to 'capture'", () => {
    beforeEach(() => {
      execConfig.stderr = "capture";
    });

    it("should capture everything logged with ctx.console.log", async () => {
      execConfig.handler = jest.fn(async ctx => {
        ctx.console.error("expected error output");
      });
      const { stderr } = await testCLI();
      expect(stderr).toEqual("expected error output\n");
    });

    it("should capture things explicitly written to stdout stream", async () => {
      execConfig.handler = jest.fn(async ctx =>
        ctx.stderr.write("expected output")
      );
      const { stderr } = await testCLI();
      expect(stderr).toEqual("expected output");
    });

    it("should concatenate all chunks in the output stream together", async () => {
      execConfig.handler = jest.fn(async ctx => {
        ctx.console.error("expected");
        ctx.console.error("log output");
      });
      const { stderr } = await testCLI();
      expect(stderr).toEqual("expected\nlog output\n");
    });

    it("should not capture things logged with regular console", async () => {
      execConfig.handler = jest.fn(async () =>
        console.error("expected log output")
      );
      const { stderr } = await testCLI();
      expect(stderr).toEqual("");
    });
  });

  describe("when stdin is set to a string", () => {
    beforeEach(() => {
      execConfig.stdin = "test-stdin-data";
    });

    it("should coerce the string into a Readable stream for the handler", async () => {
      execConfig.handler = jest.fn(({ stdin }) => {
        expect(stdin.read().toString("utf8")).toEqual("test-stdin-data");
      });
      await testCLI();
    });
  });
});
