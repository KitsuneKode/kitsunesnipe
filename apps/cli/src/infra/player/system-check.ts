import { Bun } from "bun";

export interface SystemDependencies {
    readonly hasMpv: boolean;
    readonly hasYtDlp: boolean;
    readonly missing: readonly string[];
}

/**
 * Validates that the host machine has the required binaries installed.
 * Used to block playback attempts and surface a clear diagnostic UI to the user.
 */
export function checkSystemDependencies(): SystemDependencies {
    const hasMpv = Bun.which("mpv") !== null;
    const hasYtDlp = Bun.which("yt-dlp") !== null;
    
    const missing: string[] = [];
    if (!hasMpv) missing.push("mpv");
    if (!hasYtDlp) missing.push("yt-dlp");

    return {
        hasMpv,
        hasYtDlp,
        missing
    };
}
