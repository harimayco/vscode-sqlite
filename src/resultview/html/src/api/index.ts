import VsCodeApi from "./vscodeapi";

export interface ResultSetData {
    id: number;
    statement: string;
    columns: string[];
    size: number;
    rows: RowsData;
}

export interface RowsData {
    queryId?: string;
    result: number;
    rows: string[][];
    offset: number;
    limit: number;
}

export interface QueryResultPayload {
    queryId: string;
    title: string;
    statement: string;
    timestamp: string;
    results: ResultSetData[];
}

export class Api {
    private vscodeApi: VsCodeApi;

    constructor(vscodeApi?: VsCodeApi) {
        this.vscodeApi = vscodeApi ? vscodeApi : VsCodeApi.acquire();
    }

    fetchResults() {
        this.vscodeApi.postMessage({ type: "FETCH_RESULTS" });
    }

    fetchRows(result: number, offset: number, limit: number, queryId?: string) {
        this.vscodeApi.postMessage({
            type: "FETCH_ROWS",
            payload: { result, offset, limit, queryId },
        });
    }

    exportResults(format: "csv" | "html" | "json" | "sql" | string, result?: number, rows?: (string | number)[][], queryId?: string) {
        this.vscodeApi.postMessage({
            type: "EXPORT_RESULTS",
            payload: { result, format, rows, queryId },
        });
    }

    closeQuery(queryId: string) {
        this.vscodeApi.postMessage({
            type: "CLOSE_QUERY",
            payload: { queryId }
        });
    }

    clearAllQueries() {
        this.vscodeApi.postMessage({
            type: "CLEAR_ALL_QUERIES"
        });
    }

    updateConfig(config: { recordsPerPage: number }) {
        this.vscodeApi.postMessage({
            type: "UPDATE_CONFIG",
            payload: config,
        });
    }

    copyToClipboard(text: string) {
        this.vscodeApi.postMessage({
            type: "COPY_TO_CLIPBOARD",
            payload: { text },
        });
    }

    onResults(callback: (payload: QueryResultPayload) => void) {
        this.vscodeApi.onMessage((message) => {
            if (message.type === "FETCH_RESULTS") {
                if (Array.isArray(message.payload)) {
                    callback({
                        queryId: `q_${Date.now()}`,
                        title: `Query`,
                        statement: message.payload.length > 0 ? message.payload[0].statement : "",
                        timestamp: new Date().toLocaleTimeString(),
                        results: message.payload
                    });
                } else {
                    callback(message.payload);
                }
            }
        });
    }

    onRestoreTabs(callback: (tabs: QueryResultPayload[]) => void) {
        this.vscodeApi.onMessage((message) => {
            if (message.type === "RESTORE_QUERY_TABS") {
                callback(message.payload);
            }
        });
    }

    onRows(callback: (rows: RowsData) => void) {
        this.vscodeApi.onMessage((message) => {
            if (message.type === "FETCH_ROWS") {
                callback(message.payload);
            }
        });
    }
}
