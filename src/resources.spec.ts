import { exec } from '.';
import { ExecConfig } from './interfaces';

describe("resource support", () => {
  let execConfig: ExecConfig;
  let handler;

  const testCLI = (argv: string[] = []) => exec({ ...execConfig, argv });

  beforeEach(() => {
    handler = jest.fn((_ctx, next) => next());
    execConfig = {
      errorStrategy: "throw",
      name: "testapp",
      handler
    };
  });

  describe("when 1+ resources", () => {
    let verbHandler: jest.Mock;

    beforeEach(() => {
      verbHandler = jest.fn((_ctx, next) => next());
      execConfig.resources = [
        {
          name: "TestResource",
          commands: [
            {
              name: "test-verb",
              handler: verbHandler,
              options: [{ name: "testarg" }]
            }
          ]
        }
      ];
    });

    describe("when the user provides a resource and a verb", () => {
      it("should execute the verb handler", async () => {
        await testCLI(["test-verb", "testresource"]);
        expect(verbHandler).toHaveBeenCalled();
      });
    });

    describe("when the user provides additional arguments", () => {
      it("should pass the arguments to the verb handler", async () => {
        await testCLI(["test-verb", "testresource", "--testarg", "testval"]);
        expect(verbHandler.mock.calls[0][0]).toMatchObject({
          args: {
            testarg: "testval"
          }
        });
      });
    });

    describe("when the verb overlaps a command", () => {
      it("should prefer the command handler", async () => {
        const cmdHandler = jest.fn();
        execConfig.subcommands = [
          {
            name: "test-verb",
            options: [{ name: "testopt", defaultOption: true }],
            handler: cmdHandler
          }
        ];
        await testCLI(["test-verb", "testresource"]);
        expect(verbHandler).not.toHaveBeenCalled();
        expect(cmdHandler).toHaveBeenCalled();
      });
    });
  });

  describe("when resource has subcommands", () => {
    let verbHandler: jest.Mock;
    let cmdHandler: jest.Mock;

    beforeEach(() => {
      verbHandler = jest.fn((_ctx, next) => next());
      cmdHandler = jest.fn();
      execConfig.resources = [
        {
          name: "TestResource",
          commands: [
            {
              name: "test-verb",
              handler: verbHandler,
              subcommands: [
                {
                  name: "testcmd",
                  handler: cmdHandler
                }
              ]
            }
          ]
        }
      ];
    });

    it("should call subcommand handler", async () => {
      await testCLI(["test-verb", "testresource", "testcmd"]);
      expect(cmdHandler).toHaveBeenCalled();
    });
  });
});
