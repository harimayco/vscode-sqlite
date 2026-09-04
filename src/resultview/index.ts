import { Disposable, workspace, window, ViewColumn, commands, QuickPickItem, env } from "vscode";
import { CustomView, Message } from "./customview";
import { sanitizeStringForHtml } from "../utils/utils";
import * as csvStringify from 'csv-stringify/lib/sync';
import { EOL } from "os";
import { ResultSet, Result } from "../common";
import { toInsertSql, InsertSqlOptions } from "./sqlExport";

interface InsertQuickPickItem extends QuickPickItem {
    multiValue: boolean;
}

export default class ResultView extends CustomView implements Disposable {

    private resultSet?: ResultSet;
    private msgQueue: Message[];

    constructor(private extensionPath: string) {
        super('resultview', 'SQLite', extensionPath);

        this.msgQueue = [];
    }

    display(resultSet: Promise<ResultSet|undefined>, recordsPerPage: number, position: string = "bottom") {
        this.show(this.extensionPath, recordsPerPage, position);
        
        this.msgQueue = [];
        
        resultSet.then(rs => {
            this.resultSet = rs? rs : [];
            const results = this.resultSet? this.resultSet : [];
            this.send({type: "FETCH_RESULTS", payload: results.map((result, idx) => (
                {statement: result.stmt, columns: result.header, size: result.rows.length, rows: {rows: result.rows.slice(0, recordsPerPage), offset: 0, limit: recordsPerPage, result: idx}}
            ))});
            if (this.msgQueue) this.msgQueue.forEach(this.handleMessage.bind(this));
        });
    }

    handleMessage(message: Message) {
        if (message.type === "COPY_TO_CLIPBOARD") {
            const text = message.payload.text;
            if (text) {
                env.clipboard.writeText(text);
                window.setStatusBarMessage("Copied to clipboard.", 2000);
            }
            return;
        }

        if (!this.resultSet) {
            this.msgQueue.push(message);
            return;
        }
        switch(message.type) {
            case "FETCH_RESULTS": {
                const results = this.resultSet? this.resultSet : [];
                this.send({type: "FETCH_RESULTS", payload: results.map(result => (
                    {statement: result.stmt, columns: result.header, size: result.rows.length}
                ))});
                break;
            }
            case "FETCH_ROWS": {
                const result = this.resultSet? this.resultSet[message.payload.result] : null;
                const fromRow = message.payload.offset;
                const toRow = fromRow + message.payload.limit;
                this.send({type: "FETCH_ROWS", payload: {result: message.payload.result, rows: result!.rows.slice(fromRow, toRow), offset: fromRow, limit: message.payload.limit}});
                break;
            }
            case "EXPORT_RESULTS": {
                const obj = typeof message.payload.result === "number" ? this.resultSet![message.payload.result] : this.resultSet;
                if (!obj) {
                    break;
                }
                let targetObj = obj;
                if (message.payload.rows && !Array.isArray(obj)) {
                    targetObj = {
                        ...obj,
                        rows: message.payload.rows
                    };
                }
                const format = message.payload.format;
                if (format === "csv") this.exportCsv(targetObj);
                if (format === "html") this.exportHtml(targetObj);
                if (format === "json") this.exportJson(targetObj);
                if (format === "sql") this.exportSql(targetObj);
                break;
            }
        }
    }

    private exportSql(obj: Result | Array<Result>) {
        const config = workspace.getConfiguration('sqlite');
        const style = config.get<string>('insertExportStyle', 'prompt');
        const batchSize = config.get<number>('insertExportBatchSize', 500);

        if (style === "prompt") {
            const items: InsertQuickPickItem[] = [
                {
                    label: "Single-Value INSERT",
                    description: "One statement per row (INSERT INTO table (...) VALUES (...);)",
                    multiValue: false
                },
                {
                    label: "Multi-Values INSERT",
                    description: "Batch values (INSERT INTO table (...) VALUES (...), (...);)",
                    multiValue: true
                }
            ];

            window.showQuickPick(items, {
                placeHolder: "Select INSERT INTO SQL export style"
            }).then(selected => {
                if (!selected) {
                    return;
                }
                this.doExportSql(obj, { multiValue: selected.multiValue, batchSize: batchSize });
            });
        } else {
            const isMulti = style === "multi";
            this.doExportSql(obj, { multiValue: isMulti, batchSize: batchSize });
        }
    }

    private doExportSql(obj: Result | Array<Result>, options: InsertSqlOptions) {
        setTimeout(() => {
            let sqlList: string[] = [];
            const results = Array.isArray(obj) ? obj : [obj];

            for (const result of results) {
                if (result) {
                    let ret = toInsertSql(result.stmt, result.header, result.rows, options);
                    if (ret) {
                        sqlList.push(ret);
                    }
                }
            }

            this.exportFile('sql', sqlList.join(EOL + EOL));
        }, 0);
    }

    private exportJson(obj: Object) {
        let content = JSON.stringify(obj);
        this.exportFile('json', content);
    }

    private exportCsv(obj: {header: string[], rows: string[][]} | Array<{header: string[], rows: string[][]}>) {
        // setTimeout is just to make this async
        setTimeout(() => {
            let csvList = [];
            if (Array.isArray(obj)) {
                for (const item of obj) {
                    if (item) {
                        let ret = csvStringify(item.rows, { columns: item.header, header: true });
                        csvList.push(ret);
                    }
                }
            } else if (obj) {
                let ret = csvStringify(obj.rows, { columns: obj.header, header: true });
                csvList.push(ret);
            }
            
            this.exportFile('csv', csvList.join(EOL));
        }, 0);
    }

    private exportHtml(obj: {header: string[], rows: string[][]} | Array<{header: string[], rows: string[][]}>) {
        let toHtml = (header: string[], rows: string[][]) => {
            let str = "<table>";
            str += "<tr>" + header.map(val => `<th>${sanitizeStringForHtml(val)}</th>`).join("") + "<tr>";
            str += rows.map(row => `<tr>${row.map(val => `<td>${sanitizeStringForHtml(val)}</td>`).join("")}</tr>`).join("");
            str += "</table>";
            return str;
        };
        
        setTimeout(() => {
            let htmlList = [];
            if (Array.isArray(obj)) {
                for (const item of obj) {
                    if (item) {
                        let ret = toHtml(item.header, item.rows);
                        htmlList.push(ret);
                    }
                }
            } else if (obj) {
                let ret = toHtml(obj.header, obj.rows);
                htmlList.push(ret);
            }
            
            this.exportFile('html', htmlList.join(""));
        }, 0);
    }

    private exportFile(language: string, content: string) {
        workspace.openTextDocument({language: language, content: content})
            .then(doc => window.showTextDocument(doc, ViewColumn.One))
            .then(() => commands.executeCommand('workbench.action.files.saveAs'))
            .then(undefined, err => {
                const message = err && err.message ? err.message : String(err);
                window.showErrorMessage(`Export failed: ${message}`);
            });
    }
}