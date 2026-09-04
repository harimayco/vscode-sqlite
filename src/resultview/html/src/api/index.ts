import VsCodeApi from "./vscodeapi";

export interface ColumnFilter {
    column: string;
    operator: string;
    value: string;
}

export interface ResultSetData {
    id: number;
    statement: string;
    columns: string[];
    size: number;
    canFilter?: boolean;
    filters?: ColumnFilter[];
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

    openSettings() {
        this.vscodeApi.postMessage({
            type: "OPEN_SETTINGS",
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

    applyFilter(queryId: string, result: number, filters: ColumnFilter[]) {
        this.vscodeApi.postMessage({
            type: "APPLY_FILTER",
            payload: { queryId, result, filters }
        });
    }

    onRows(callback: (rows: RowsData) => void) {
        this.vscodeApi.onMessage((message) => {
            if (message.type === "FETCH_ROWS") {
                callback(message.payload);
            }
        });
    }

    onUpdateFilterResults(callback: (payload: {
        queryId: string;
        result: number;
        statement: string;
        size: number;
        rows: string[][];
        offset: number;
        limit: number;
        filters: ColumnFilter[];
    }) => void) {
        this.vscodeApi.onMessage((message) => {
            if (message.type === "UPDATE_FILTER_RESULTS") {
                callback(message.payload);
            }
        });
    }
}
