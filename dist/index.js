import fs from "fs";
import path from "path";
import { parse as parseJsonc } from "jsonc-parser";
export default function json2TsPlugin(options) {
    const { input, output, className = "LocalizationKeys", isDefaultImport = false, } = options;
    const inputPath = path.resolve(process.cwd(), input);
    const outputPath = path.resolve(process.cwd(), output);
    const generate = () => {
        if (!fs.existsSync(inputPath)) {
            console.warn(`[localizationkeys] Input file ${inputPath} not found`);
            return;
        }
        const raw = fs.readFileSync(inputPath, "utf-8");
        let json;
        try {
            json = parseJsonc(raw);
        }
        catch (error) {
            console.error(`[localizationkeys] Failed to parse JSONC:`, error);
            return;
        }
        var result = `export${isDefaultImport ? " default" : ""} class ${className}`;
        var getSpaces = function (depth) {
            var result = "\n";
            while (depth > 0) {
                result += "    ";
                depth--;
            }
            return result;
        };
        var escapeHtml = function (val) {
            return val
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };
        var iteratee = function (obj, result, objPath, depth) {
            var spaces = getSpaces(depth);
            var bracketsSpaces = getSpaces(depth - 1);
            result += bracketsSpaces + "{";
            if (objPath) {
                result += spaces + `AllKeys: "${objPath.replace(/\.$/gi, "")}",`;
            }
            for (var objKey in obj) {
                if (!obj.hasOwnProperty(objKey))
                    continue;
                const objValue = obj[objKey];
                if (obj[objKey] != null && typeof objValue === "object") {
                    if (objPath) {
                        result += iteratee(objValue, `${spaces}${objKey}: `, objPath + objKey + ".", depth + 1);
                    }
                    else {
                        result += iteratee(objValue, `${spaces}public static ${objKey} = `, objPath + objKey + ".", depth + 1);
                    }
                }
                else if (objPath) {
                    result += `${spaces}/** ${escapeHtml(String(objValue))} */${getSpaces(depth)}${objKey}: "${objPath + objKey}",`;
                }
                else {
                    result += `${spaces}/** ${escapeHtml(String(objValue))} */${getSpaces(depth)}${objKey} = "${objPath + objKey}";`;
                }
            }
            result += bracketsSpaces + "}";
            if (objPath && depth > 2) {
                result += ",";
            }
            return result;
        };
        result = iteratee(json, result, "", 1);
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, result, "utf-8");
        console.log(`[localizationkeys] Generated ${outputPath}`);
    };
    return {
        name: "vite-plugin-localizationkeys",
        apply: "serve", // работает и в dev, и в build
        configureServer(server) {
            server.watcher.add(inputPath);
            server.watcher.on("change", (changedPath) => {
                if (changedPath === inputPath) {
                    console.log(`[localizationkeys] Detected change in ${inputPath}`);
                    generate();
                }
            });
            generate(); // на старте
        },
        buildStart() {
            generate(); // при build
        },
    };
}
