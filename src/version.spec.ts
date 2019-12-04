import { exec } from '.';
import { ExecConfig } from './interfaces';

describe("generateVersion", () => {
  let execConfig: ExecConfig;

  const testCLI = (argv: string[] = []) => exec({ ...execConfig, argv });

  beforeEach(() => {
    execConfig = {
      errorStrategy: "throw",
      stdout: "capture",
      name: "testapp",
      version: "testversion",
      handler: () => {}
    };
  });

  it("should print version text when --version is specified", async () => {
    const { stdout } = await testCLI(["--version"]);
    expect(stdout).toContain("testversion");
  });

  it("should use 0.0.0 as default version", async () => {
    delete execConfig.version;
    const { stdout } = await testCLI(["--version"]);
    expect(stdout).toContain("0.0.0");
  });

  it("should not add --version option when generateVersion is false", async () => {
    execConfig.generateVersion = false;
    await expect(testCLI(["--version"])).rejects.toThrow(
      "Unexpected argument: --version"
    );
  });
});
