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
    expect(stdout).toMatch("testapp");
  });

  it("should include description in help text, if specified", async () => {
    execConfig.description = "test-description";
    const { stdout } = await testCLI(["--help"]);
    expect(stdout).toMatch("test-description");
  });

  it("should include details in help text, if specified", async () => {
    execConfig.details = "test-details";
    const { stdout } = await testCLI(["--help"]);
    expect(stdout).toMatch("test-details");
  });

  it("should include examples in help text, if specified", async () => {
    execConfig.examples = ["example-one", "example-two"];
    const { stdout } = await testCLI(["--help"]);
    expect(stdout).toMatch("example-one");
    expect(stdout).toMatch("example-two");
  });

  it("should include options in help text, if specified", async () => {
    execConfig.options = [{ name: "test-option" }];
    const { stdout } = await testCLI(["--help"]);
    expect(stdout).toMatch("--test-option");
  });

  it("should provide helptext for subcommand if --help is specified after subcommand", async () => {
    execConfig.subcommands = [{ name: "testcommand", details: "test details" }];
    const { stdout } = await testCLI(["testcommand", "--help"]);
    expect(stdout).not.toMatch("testapp");
    expect(stdout).toMatch("testcommand");
  });

  it("should include subcommand details in subcommand help", async () => {
    execConfig.subcommands = [
      { name: "testcommand", details: "test cmd details" }
    ];
    const { stdout } = await testCLI(["testcommand", "--help"]);
    expect(stdout).toMatch("test cmd details");
  });

  it("should include resources in helptext", async () => {
    execConfig.resources = [{ name: "TestResource", commands: [] }];
    const { stdout } = await testCLI(["--help"]);
    expect(stdout).toMatch("TestResource");
  });

  it("should include resource commands in helptext", async () => {
    execConfig.resources = [
      { name: "TestResource", commands: [{ name: "testverb" }] }
    ];
    const { stdout } = await testCLI(["--help"]);
    expect(stdout).toMatch("testverb");
  });

  it("should provide helptext for resource commands, if specified after the command", async () => {
    execConfig.resources = [
      {
        name: "TestResource",
        commands: [{ name: "testverb", details: "test-details" }]
      }
    ];
    const { stdout } = await testCLI(["testverb", "testresource", "--help"]);
    expect(stdout).toMatch("test-details");
  });
});
