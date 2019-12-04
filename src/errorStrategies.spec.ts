import { AppError, exec } from '.';
import { ExecConfig, HandlerCallback, HandlerContext } from './interfaces';

describe("error strategies", () => {
  let execConfig: ExecConfig;
  let handler: jest.Mock;
  let exit: jest.SpyInstance<any, any>;

  const testCLI = (argv: string[] = []) => exec({ ...execConfig, argv });

  const mockPlainErrorHandler = () => {
    handler.mockImplementation(async () => {
      throw new Error("test-error-message");
    });
  };

  const mockAppErrorHandler = (code: number) => {
    handler.mockImplementation(async () => {
      const err = new AppError("TEST_ERROR", "test-error-message");
      err.processExitCode = code;
      throw err;
    });
  };

  const mockExitCodeHandler = (code: number) => {
    handler.mockImplementation((ctx: HandlerContext, next: HandlerCallback) => {
      ctx.processExitCode = code;
      return next();
    });
  };

  const expectRejectionToMatch = async (
    promise: Promise<any>,
    matchObject: any,
    message?: string
  ) => {
    try {
      await promise;
      fail(message || "Expected promise to be rejected");
    } catch (e) {
      expect(e).toMatchObject(matchObject);
    }
  };

  beforeAll(() => {
    exit = jest.spyOn(process as any, "exit");
    exit.mockImplementation(() => {});
  });
  afterAll(() => exit.mockRestore());

  beforeEach(() => {
    exit.mockClear();
    handler = jest.fn();
    execConfig = {
      name: "testapp",
      stdout: "capture",
      stderr: "capture",
      handler
    };
  });

  describe("errorStrategy: 'log'", () => {
    beforeEach(() => (execConfig.errorStrategy = "log"));

    describe("when no error is thrown", () => {
      describe("when HandlerContext.processExitCode is missing", () => {
        it("ExecResult.processExitCode should be 0", async () => {
          const { processExitCode } = await testCLI();
          expect(processExitCode).toBe(0);
        });
      });

      describe("when HandlerContext.processExitCode is a number", () => {
        it("ExecResult.processExitCode should be that number", async () => {
          mockExitCodeHandler(111);
          const { processExitCode } = await testCLI();
          expect(processExitCode).toBe(111);
        });
      });
    });

    describe("when error is thrown", () => {
      it("should log error message", async () => {
        mockPlainErrorHandler();
        const { stderr } = await testCLI();
        expect(stderr).toContain("test-error-message");
      });

      describe("when error.processExitCode is missing", () => {
        it("ExecResult.processExitCode should be 1", async () => {
          mockPlainErrorHandler();
          const { processExitCode } = await testCLI();
          expect(processExitCode).toBe(1);
        });
      });

      describe("when error.processExitCode is a number", () => {
        it("ExecResult.processExitCode should be that number", async () => {
          mockAppErrorHandler(222);
          const { processExitCode } = await testCLI();
          expect(processExitCode).toBe(222);
        });
      });
    });
  });

  describe("errorStrategy: 'throw'", () => {
    beforeEach(() => (execConfig.errorStrategy = "throw"));

    describe("when no error is thrown", () => {
      describe("when HandlerContext.processExitCode is missing", () => {
        it("ExecResult.processExitCode should be 0", async () => {
          const { processExitCode } = await testCLI();
          expect(processExitCode).toBe(0);
        });
      });

      describe("when HandlerContext.processExitCode is a number", () => {
        it("ExecResult.processExitCode should be that number", async () => {
          mockExitCodeHandler(111);
          const { processExitCode } = await testCLI();
          expect(processExitCode).toBe(111);
        });
      });
    });

    describe("when error is thrown", () => {
      describe("when error.processExitCode is missing", () => {
        it("ExecutionError.processExitCode should be 1", () => {
          mockPlainErrorHandler();
          return expectRejectionToMatch(testCLI(), {
            processExitCode: 1
          });
        });
      });

      describe("when error.processExitCode is a number", () => {
        it("ExecutionError.processExitCode should be that number", () => {
          mockAppErrorHandler(222);
          return expectRejectionToMatch(testCLI(), {
            processExitCode: 222
          });
        });
      });
    });
  });

  describe("errorStrategy: 'exit'", () => {
    beforeEach(() => (execConfig.errorStrategy = "exit"));

    describe("when no error is thrown", () => {
      describe("when HandlerContext.processExitCode is missing", () => {
        it("process.exit should not be called", async () => {
          await testCLI();
          expect(exit).not.toHaveBeenCalled();
        });
      });

      describe("when HandlerContext.processExitCode is a number", () => {
        it("process.exit should have been called with that number", async () => {
          mockExitCodeHandler(111);
          await testCLI();
          expect(exit).toHaveBeenCalledWith(111);
        });
      });
    });

    describe("when error is thrown", () => {
      it("should log error message", async () => {
        mockPlainErrorHandler();
        const { stderr } = await testCLI();
        expect(stderr).toContain("test-error-message");
      });

      describe("when error.processExitCode is missing", () => {
        it("process.exit should have been called with 1", async () => {
          mockPlainErrorHandler();
          await testCLI();
          expect(exit).toHaveBeenCalledWith(1);
        });
      });

      describe("when error.processExitCode is a number", () => {
        it("process.exit should have been called with that number", async () => {
          mockAppErrorHandler(222);
          await testCLI();
          expect(exit).toHaveBeenCalledWith(222);
        });
      });
    });
  });
});
