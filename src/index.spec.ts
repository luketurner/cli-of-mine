import { exec } from '.';
import { ExecConfig } from './interfaces';

describe("cli-of-mine", () => {
  let execConfig: ExecConfig;

  const testCLI = (argv: string[] = []) => exec({ ...execConfig, argv });

  beforeEach(() => {
    execConfig = {
      catchErrors: false,
      name: "testapp",
      handler: () => {}
    };
  });

  it("should return handler's return value as result property", async () => {
    execConfig.handler = jest.fn(() => "result-value");
    const { result } = await testCLI();
    expect(result).toEqual("result-value");
  });

  it("should resolve handler if it is async and put resolved value into result property", async () => {
    execConfig.handler = jest.fn(async () => "resolved-value");
    const { result } = await testCLI();
    expect(result).toEqual("resolved-value");
  });
});
