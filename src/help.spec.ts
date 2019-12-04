import { exec } from '.';
import { ExecConfig } from './interfaces';

describe("generateHelp", () => {
  let execConfig: ExecConfig;

  const testCLI = (argv: string[] = []) => exec({ ...execConfig, argv });

  beforeEach(() => {
    execConfig = {
      errorStrategy: "throw",
      stdout: "capture",
      name: "testapp",
      handler: () => {}
    };
  });

  it("should print help text when --help is specified", async () => {
    const { stdout } = await testCLI(["--help"]);
    expect(stdout).toContain("testapp");
  });

  it("should include description in help text, if specified", async () => {
    execConfig.description = "test-description";
    const { stdout } = await testCLI(["--help"]);
    expect(stdout).toContain("test-description");
  });

  it("should include examples in help text, if specified", async () => {
    execConfig.examples = ["example-one", "example-two"];
    const { stdout } = await testCLI(["--help"]);
    expect(stdout).toContain("example-one");
    expect(stdout).toContain("example-two");
  });

  it("should include options in help text, if specified", async () => {
    execConfig.options = [{ name: "test-option" }];
    const { stdout } = await testCLI(["--help"]);
    expect(stdout).toContain("--test-option");
  });

  it("should provide helptext for subcommand if --help is specified after subcommand", async () => {
    execConfig.subcommands = [{ name: "testcommand" }];
    const { stdout } = await testCLI(["testcommand", "--help"]);
    expect(stdout).not.toContain("testapp");
    expect(stdout).toContain("testcommand");
  });
});
