import { Plugin } from "vite";
interface Json2TsPluginOptions {
    input: string;
    output: string;
    className?: string;
    isDefaultImport?: boolean;
}
export default function json2TsPlugin(options: Json2TsPluginOptions): Plugin;
export {};
