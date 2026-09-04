import { Disposable, workspace, window, ViewColumn, commands, QuickPickItem, env } from "vscode";
import { CustomView, Message } from "./customview";
import { sanitizeStringForHtml } from "../utils/utils";
import * as csvStringify from 'csv-stringify/lib/sync';
import { EOL } from "os";
import { ResultSet, Result } from "../common";
import { toInsertSql, InsertSqlOptions, extractTableName } from "./sqlExport";
import SQLite from "../sqlite";
import { getTablePrimaryKeyInfo } from "../sqlite/tableInfo";
import { isSimpleSelectQuery, buildFilteredSqlQuery, filterRows, ColumnFilter } from "../utils/sqlFilter";

interface InsertQuickPickItem extends QuickPickItem {
    multiValue: boolean;
    excludeId: boolean;
}

interface QueryTabRecord {
    queryId: string;
    title: string;
    statement: string;
    timestamp: string;
    queryIndex: number;
    results: any[];
    dbPath?: string;
}

export default class ResultView extends CustomView implements Disposable {

    private resultSet?: ResultSet;
    private queryResults: Map<string, ResultSet> = new Map();
    private originalResults: Map<string, ResultSet> = new Map();
    private queryTabs: QueryTabRecord[] = [];
    private queryCounter: number = 0;
    private msgQueue: Message[];
    private sqlite?: SQLite;

    constructor(private extensionPath: string, sqlite?: SQLite) {
        super('resultview', 'SQLite', extensionPath);
        this.sqlite = sqlite;
        this.msgQueue = [];
    }

    setSqlite(sqlite: SQLite) {
        this.sqlite = sqlite;
    }

    display(resultSet: Promise<ResultSet|undefined>, recordsPerPage: number, position: string = "bottom", queryOptions?: { isView?: boolean; dbPath?: string }) {
        this.show(this.extensionPath, recordsPerPage, position);
        
        this.msgQueue = [];
        
        resultSet.then(rs => {
            const results = rs? rs : [];
            this.resultSet = results;
            
            const queryIndex = ++this.queryCounter;
            const queryId = `q_${Date.now()}_${queryIndex}`;

            const originalCopy: ResultSet = results.map(r => ({
                stmt: r.stmt,
                header: [...r.header],
                rows: r.rows.map(row => [...row])
            }));
            const workingCopy: ResultSet = results.map(r => ({
                stmt: r.stmt,
                header: [...r.header],
                rows: r.rows.map(row => [...row])
            }));

            this.originalResults.set(queryId, originalCopy);
            this.queryResults.set(queryId, workingCopy);

            let statement = "";
            let title = `Query ${queryIndex}`;
            if (results.length > 0 && results[0].stmt) {
                statement = results[0].stmt;
                const cleanStmt = statement.replace(/[\r\n\t]+/g, " ").trim();
                const shortStmt = cleanStmt.length > 25 ? cleanStmt.substring(0, 25) + "…" : cleanStmt;
                title = `#${queryIndex}: ${shortStmt}`;
            }

            const now = new Date();
            const pad = (n: number) => ("0" + n).slice(-2);
            const timestamp = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

            const isView = queryOptions && queryOptions.isView;
            const resultsData = results.map((result, idx) => ({
                id: idx,
                statement: result.stmt,
                columns: result.header,
                size: result.rows.length,
                canFilter: isSimpleSelectQuery(result.stmt, isView),
                rows: {
                    rows: result.rows.slice(0, recordsPerPage),
                    offset: 0,
                    limit: recordsPerPage,
                    result: idx,
                    queryId
                }
            }));

            const tabRecord: QueryTabRecord = {
                queryId,
                title,
                statement,
                timestamp,
                queryIndex,
                results: resultsData,
                dbPath: queryOptions?.dbPath
            };
            this.queryTabs.push(tabRecord);

            this.send({
                type: "FETCH_RESULTS",
                payload: tabRecord
            });
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

        if (message.type === "UPDATE_CONFIG") {
            const recordsPerPage = message.payload && message.payload.recordsPerPage;
            if (typeof recordsPerPage === "number") {
                workspace.getConfiguration('sqlite').update('recordsPerPage', recordsPerPage, true);
                window.setStatusBarMessage(`SQLite: Records per page set to ${recordsPerPage}`, 3000);
            }
            return;
        }

        if (message.type === "OPEN_SETTINGS") {
            commands.executeCommand("workbench.action.openSettings", "@ext:alexcvzz.vscode-sqlite");
            return;
        }

        if (message.type === "APPLY_FILTER") {
            const queryId = message.payload && message.payload.queryId;
            const resultIdx = (message.payload && message.payload.result) || 0;
            const filters: ColumnFilter[] = (message.payload && message.payload.filters) || [];

            const origResults = this.originalResults.get(queryId);
            const targetResults = this.queryResults.get(queryId);
            const tabRecord = this.queryTabs.find(t => t.queryId === queryId);

            if (origResults && origResults[resultIdx] && targetResults && targetResults[resultIdx] && tabRecord) {
                const origResult = origResults[resultIdx];
                const filteredRows = filterRows(origResult.rows, origResult.header, filters);
                const updatedStmt = buildFilteredSqlQuery(origResult.stmt, filters);

                targetResults[resultIdx].rows = filteredRows;
                targetResults[resultIdx].stmt = updatedStmt;
                tabRecord.statement = updatedStmt;

                const cleanStmt = updatedStmt.replace(/[\r\n\t]+/g, " ").trim();
                const shortStmt = cleanStmt.length > 25 ? cleanStmt.substring(0, 25) + "…" : cleanStmt;
                tabRecord.title = `#${tabRecord.queryIndex}: ${shortStmt}`;

                const currentLimit = (tabRecord.results[resultIdx] && tabRecord.results[resultIdx].rows && tabRecord.results[resultIdx].rows.limit) || 20;

                this.send({
                    type: "UPDATE_FILTER_RESULTS",
                    payload: {
                        queryId,
                        result: resultIdx,
                        statement: updatedStmt,
                        size: filteredRows.length,
                        rows: filteredRows.slice(0, currentLimit),
                        offset: 0,
                        limit: currentLimit,
                        filters
                    }
                });
            }
            return;
        }

        if (message.type === "CLOSE_QUERY") {
            const qId = message.payload && message.payload.queryId;
            if (qId) {
                this.queryResults.delete(qId);
                this.originalResults.delete(qId);
                this.queryTabs = this.queryTabs.filter(t => t.queryId !== qId);
            }
            return;
        }

        if (message.type === "CLEAR_ALL_QUERIES") {
            this.queryResults.clear();
            this.originalResults.clear();
            this.queryTabs = [];
            this.resultSet = undefined;
            return;
        }

        if (!this.resultSet && this.queryResults.size === 0) {
            this.msgQueue.push(message);
            return;
        }

        switch(message.type) {
            case "FETCH_RESULTS": {
                if (this.queryTabs && this.queryTabs.length > 0) {
                    this.send({
                        type: "RESTORE_QUERY_TABS",
                        payload: this.queryTabs
                    });
                } else {
                    const results = this.resultSet ? this.resultSet : [];
                    this.send({
                        type: "FETCH_RESULTS",
                        payload: results.map(result => ({
                            statement: result.stmt,
                            columns: result.header,
                            size: result.rows.length
                        }))
                    });
                }
                break;
            }
            case "FETCH_ROWS": {
                const queryId = message.payload ? message.payload.queryId : undefined;
                const rs = queryId && this.queryResults.has(queryId) ? this.queryResults.get(queryId) : this.resultSet;
                const result = rs ? rs[message.payload.result] : null;
                const fromRow = message.payload.offset;
                const toRow = fromRow + message.payload.limit;
                this.send({
                    type: "FETCH_ROWS",
                    payload: {
                        queryId,
                        result: message.payload.result,
                        rows: result ? result.rows.slice(fromRow, toRow) : [],
                        offset: fromRow,
                        limit: message.payload.limit
                    }
                });
                break;
            }
            case "EXPORT_RESULTS": {
                const queryId = message.payload ? message.payload.queryId : undefined;
                const rs = queryId && this.queryResults.has(queryId) ? this.queryResults.get(queryId) : this.resultSet;
                const obj = typeof message.payload.result === "number" ? rs![message.payload.result] : rs;
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
                const tab = queryId ? this.queryTabs.find(t => t.queryId === queryId) : undefined;
                const dbPath = tab ? tab.dbPath : undefined;
                const exportOptions = message.payload.exportOptions;

                const format = message.payload.format;
                if (format === "csv") this.exportCsv(targetObj);
                if (format === "html") this.exportHtml(targetObj);
                if (format === "json") this.exportJson(targetObj);
                if (format === "sql") this.exportSql(targetObj, dbPath, exportOptions);
                break;
            }
        }
    }

    private async exportSql(
        obj: Result | Array<Result>,
        dbPath?: string,
        exportOptions?: { columns?: string[]; multiValue?: boolean }
    ) {
        const config = workspace.getConfiguration('sqlite');
        const batchSize = config.get<number>('insertExportBatchSize', 500);

        // When exportOptions is provided from the UI modal, filter columns and export directly
        if (exportOptions && (exportOptions.columns || typeof exportOptions.multiValue === "boolean")) {
            let target = obj;
            if (exportOptions.columns && exportOptions.columns.length > 0) {
                const filterCols = new Set(exportOptions.columns);
                const filterResult = (res: Result): Result => {
                    const indices = res.header
                        .map((col, idx) => ({ col, idx }))
                        .filter(item => filterCols.has(item.col));
                    const newHeader = indices.map(item => item.col);
                    const newRows = res.rows.map(row => indices.map(item => row[item.idx]));
                    return {
                        stmt: res.stmt,
                        header: newHeader,
                        rows: newRows
                    };
                };

                if (Array.isArray(obj)) {
                    target = obj.map(filterResult);
                } else {
                    target = filterResult(obj);
                }
            }

            const isMulti = typeof exportOptions.multiValue === "boolean" ? exportOptions.multiValue : true;
            this.doExportSql(target, {
                multiValue: isMulti,
                batchSize: batchSize,
                excludeId: false // User explicitly selected their columns in the modal
            });
            return;
        }

        const style = config.get<string>('insertExportStyle', 'prompt');
        const excludeIdConfig = config.get<boolean>('insertExportExcludeId', true);

        // Attempt database-level primary key / auto-increment inspection
        let detectedIdCol: string | undefined = undefined;
        if (this.sqlite && dbPath) {
            const firstResult = Array.isArray(obj) ? obj[0] : obj;
            if (firstResult && firstResult.stmt) {
                const rawTableName = extractTableName(firstResult.stmt);
                try {
                    const pkInfo = await getTablePrimaryKeyInfo(this.sqlite, dbPath, rawTableName);
                    if (pkInfo) {
                        detectedIdCol = pkInfo.autoIncrementColumn || "__NONE__";
                    }
                } catch {
                    // Fall back to naming conventions
                }
            }
        }

        if (style === "prompt") {
            const excludeItems: InsertQuickPickItem[] = [
                {
                    label: "Single-Value INSERT (Exclude ID)",
                    description: "One statement per row, omitting auto-increment ID column" + (excludeIdConfig ? " (Default)" : ""),
                    multiValue: false,
                    excludeId: true
                },
                {
                    label: "Multi-Values INSERT (Exclude ID)",
                    description: "Batch values, omitting auto-increment ID column",
                    multiValue: true,
                    excludeId: true
                }
            ];

            const includeItems: InsertQuickPickItem[] = [
                {
                    label: "Single-Value INSERT (Include ID)",
                    description: "One statement per row, including all columns" + (!excludeIdConfig ? " (Default)" : ""),
                    multiValue: false,
                    excludeId: false
                },
                {
                    label: "Multi-Values INSERT (Include ID)",
                    description: "Batch values, including all columns",
                    multiValue: true,
                    excludeId: false
                }
            ];

            const items: InsertQuickPickItem[] = excludeIdConfig
                ? [...excludeItems, ...includeItems]
                : [...includeItems, ...excludeItems];

            window.showQuickPick(items, {
                placeHolder: "Select INSERT INTO SQL export style"
            }).then(selected => {
                if (!selected) {
                    return;
                }
                this.doExportSql(obj, {
                    multiValue: selected.multiValue,
                    batchSize: batchSize,
                    excludeId: selected.excludeId,
                    idColumn: detectedIdCol
                });
            });
        } else {
            const isMulti = style === "multi";
            this.doExportSql(obj, {
                multiValue: isMulti,
                batchSize: batchSize,
                excludeId: excludeIdConfig,
                idColumn: detectedIdCol
            });
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