import { writeFileSync } from "fs";
import { gunzipSync } from "zlib";

/**
 * Miruro.tv Decryption Routine
 * Ported from index-CVadNOyc.js
 */
function decryptMiruro(data: string, pipeKeyHex: string): any {
    // 1. Convert OBF_KEY Hex to Uint8Array (Ro)
    const Ro = new Uint8Array(pipeKeyHex.match(/.{2}/g)!.map(e => parseInt(e, 16)));

    // 2. Base64url to Standard Base64
    let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += "=".repeat(4 - pad);

    // 3. Base64 to Bytes (a)
    const a = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

    // 4. XOR Decryption (e = a ^ Ro)
    const e = new Uint8Array(a.length);
    for (let t = 0; t < a.length; t++) {
        e[t] = a[t] ^ Ro[t % Ro.length];
    }

    // 5. Check for Gzip Magic Bytes (31, 139)
    let finalBytes = e;
    if (e[0] === 31 && e[1] === 139) {
        try {
            finalBytes = gunzipSync(e);
        } catch (err) {
            console.error("Gzip decompression failed, returning raw XOR result.");
        }
    }

    // 6. Decode and Parse JSON
    const decoded = new TextDecoder().decode(finalBytes);
    return JSON.parse(decoded);
}

// TEST DATA: Sources request for One Piece
const testData = "bh4YNPj7z1PYnmC-plIWHGET7_9kuDNC_2xPak53sgRtxT8U9gVVlZKr-z-QcHn2jhsydFTD21qpHW5k2M9p2wjplhlVpdBkiAJ7vDw01iBYuIsWHF88x4ZMA-LOZvX7WLt0rM65lBH9PLtXL-vYQFwyFq2Uf6QpGySOHEI4qFHhG5n6wSXGuIP20c_xUeoW1thXVnEOfprKt_1jYOJBi3y_aPiC8SZazK2fxekoblL6xl4VNlsBA1rWtgSd3XausBKXFXkhgHzNRV2QNmIgsfGfZELZeU1-wzW12VcyyPK14B1SCuR9itteQ_ZNTTCMIdqL6wsrYC1l34S62-s0J_De5R9d5OQcBlN6MwRzLpKUen9LbgmIsAVi4sdQQbMBjk5HFazr6Rtfz8H6nqk7wqG2f7Av91JFBP02jt5vkQ0duqTEdJmI6jbMRfLKn3Jw4sniWwQMM1aWwetdAcSd7OVD7NMKMHfnPUB4wdOr1cmO5o0Krxutyn81aPmV7EGDOg0ZKj_jLqHN-Zmr_RXGLHE";
const pipeKey = "71951034f8fbcf53d89db52ceb3dc22c";

try {
    const result = decryptMiruro(testData, pipeKey);
    console.log("SUCCESS! Decrypted JSON:");
    console.log(JSON.stringify(result, null, 2));
    writeFileSync('scratchpads/provider-miruro/decrypted-sample.json', JSON.stringify(result, null, 2));
} catch (e) {
    console.error("Decryption pipeline failed:", e.message);
}
