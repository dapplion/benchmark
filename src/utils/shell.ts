import util from "node:util";
import child from "node:child_process";

const exec = util.promisify(child.exec);

export async function shell(cmd: string): Promise<string> {
  const {stdout} = await exec(cmd);
  return (stdout || "").trim();
}
