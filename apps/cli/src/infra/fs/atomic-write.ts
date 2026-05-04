import { mkdir, rename, unlink } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

/** Write `contents` to `targetPath` via a same-directory temp file + rename (crash-safe). */
export async function writeAtomicText(targetPath: string, contents: string): Promise<void> {
  const dir = dirname(targetPath);
  await mkdir(dir, { recursive: true });
  const base = basename(targetPath);
  const tmp = join(dir, `.${base}.${process.pid}-${Math.random().toString(36).slice(2, 10)}.tmp`);

  try {
    await Bun.write(tmp, contents);

    try {
      await rename(tmp, targetPath);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (
        process.platform === "win32" &&
        (code === "EPERM" || code === "EEXIST" || code === "ENOTEMPTY")
      ) {
        await unlink(targetPath).catch(() => {});
        await rename(tmp, targetPath);
      } else {
        await unlink(tmp).catch(() => {});
        throw err;
      }
    }
  } catch (e) {
    await unlink(tmp).catch(() => {});
    throw e;
  }
}

export async function writeAtomicJson(targetPath: string, value: unknown): Promise<void> {
  await writeAtomicText(targetPath, JSON.stringify(value, null, 2));
}
