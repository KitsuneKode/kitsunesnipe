import * as fs from "fs";

const code = fs.readFileSync("scratchpads/provider-anikai/chunks/scripts-BzTinek-.js", "utf8");

const targets = ["window.__$", "__$", "ani_id"];

targets.forEach((t) => {
  let index = code.indexOf(t);
  if (index !== -1) {
    console.log(`Target '${t}' found at index ${index}:`);
    console.log(code.substring(Math.max(0, index - 100), index + 100));
  } else {
    console.log(`Target '${t}' not found.`);
  }
});
