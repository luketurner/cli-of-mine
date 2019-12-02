import { Readable, Writable } from 'stream';

import { InputStream, OutputStream, ValidExecConfig } from './interfaces';

interface StdIO {
  stdin: InputStream;
  stdout: OutputStream;
  stderr: OutputStream;
}

type StdIOCallback = (stdio: StdIO) => Promise<any>;

/**
 * @hidden
 */
// TODO -- refactor this function
export async function withStdIO(config: ValidExecConfig, fn: StdIOCallback) {
  const { stdin, stdout, stderr } = config;

  const stdinStream =
    typeof stdin === "string"
      ? getReadableStream(stdin)
      : stdin || process.stdin;

  let stdoutStream = stdout || process.stdout;
  let stderrStream = stderr || process.stderr;
  let stdoutPromise;
  let stderrPromise;

  if (stdout === "capture") {
    const cap = getCapturedStream();
    stdoutStream = cap.stream;
    stdoutPromise = cap.promise;
  }

  if (stderr === "capture") {
    const cap = getCapturedStream();
    stderrStream = cap.stream;
    stderrPromise = cap.promise;
  }

  const result = await fn({
    stdin: stdinStream,
    stdout: stdoutStream as Writable,
    stderr: stderrStream as Writable
  });

  if (stdout === "capture") (stdoutStream as Writable).end();
  if (stderr === "capture") (stderrStream as Writable).end();

  return {
    result,
    stdout: stdout === "capture" ? await stdoutPromise : undefined,
    stderr: stderr === "capture" ? await stderrPromise : undefined
  };
}

/**
 * Given any number of string arguments, returns a ReadableStream that the arguments are pushed onto.
 *
 * Used to convert `string` values into `ReadableStream` values.
 *
 * @param  {...any} content
 */
function getReadableStream(...content: string[]): Readable {
  const readable = new Readable();
  for (const c of content) readable.push(c, "utf8");
  readable.push(null);
  return readable;
}

/**
 * Constructs a WriteableStream that "captures" its written data into a string.
 * Can be used, for example, to route console output to a string.
 *
 * Returns an object of form { promise, stream }, where `stream` is a WriteableStream,
 * and `promise` is a Promise<string> that resolves when the stream is finished.
 */
function getCapturedStream(): { stream: Writable; promise: Promise<string> } {
  const chunks: any[] = [];
  const writable = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk);
      callback();
    }
  });

  const resultPromise = new Promise<string>((resolve, reject) => {
    writable.on("error", reject);
    writable.on("finish", () =>
      resolve(Buffer.concat(chunks).toString("utf8"))
    );
  });

  return { stream: writable, promise: resultPromise };
}
