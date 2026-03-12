/**
 * Gera public/config.lan.js para desenvolvimento na rede local.
 * Usado por npm run dev:lan. Nao e commitado (.gitignore).
 * O deploy no GitHub continua usando public/config.js (URL do Worker em producao).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const lanIp = process.env.LAN_IP || "192.168.1.11";
const outPath = join(process.cwd(), "public", "config.lan.js");

const content = `window.APP_CONFIG = {
  apiBaseUrl: "http://${lanIp}:8787",
};
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, content, "utf-8");
console.log("Config LAN escrita: public/config.lan.js (API: http://" + lanIp + ":8787)");
