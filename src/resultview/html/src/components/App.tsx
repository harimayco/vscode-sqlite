import * as React from "react";
import produce from "immer";
import { Api, ColumnFilter, QueryResultPayload, RowsData } from "../api";
import TabBar, { QueryTabItem } from "./TabBar";
import ResultSetList from "./ResultSetList";

interface Props {
    api: Api;
}

interface State {
    tabs: Array<QueryTabItem>;
    activeTabId: string;
}

class App extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {
            tabs: [],
            activeTabId: "",
        };
    }

    componentDidMount() {
        this.props.api.onResults((payload: QueryResultPayload) => {
            const state = produce(this.state, (draftState) => {
                const newTab: QueryTabItem = {
                    id: payload.queryId,
                    title: payload.title,
                    statement: payload.statement,
                    timestamp: payload.timestamp,
                    results: payload.results.map(result => ({ ...result }))
                };
                draftState.tabs.push(newTab);
                draftState.activeTabId = newTab.id;
            });
            this.setState(state);
        });

        this.props.api.onRestoreTabs((tabs: QueryResultPayload[]) => {
            if (tabs && tabs.length > 0) {
                const state = produce(this.state, (draftState) => {
                    draftState.tabs = tabs.map(t => ({
                        id: t.queryId,
                        title: t.title,
                        statement: t.statement,
                        timestamp: t.timestamp,
                        results: t.results.map(r => ({ ...r }))
                    }));
                    if (!draftState.activeTabId || !draftState.tabs.some(t => t.id === draftState.activeTabId)) {
                        draftState.activeTabId = draftState.tabs[draftState.tabs.length - 1].id;
                    }
                });
                this.setState(state);
            }
        });

        this.props.api.onRows((rowsData: RowsData) => {
            const state = produce(this.state, (draftState) => {
                const targetTab = rowsData.queryId
                    ? draftState.tabs.find(t => t.id === rowsData.queryId)
                    : draftState.tabs.find(t => t.id === draftState.activeTabId);
                if (targetTab && targetTab.results[rowsData.result]) {
                    targetTab.results[rowsData.result].rows = rowsData;
                }
            });
            this.setState(state);
        });

        this.props.api.onUpdateFilterResults((payload) => {
            const state = produce(this.state, (draftState) => {
                const targetTab = draftState.tabs.find(t => t.id === payload.queryId);
                if (targetTab && targetTab.results[payload.result]) {
                    targetTab.statement = payload.statement;
                    const res = targetTab.results[payload.result];
                    res.statement = payload.statement;
                    res.size = payload.size;
                    res.filters = payload.filters;
                    res.rows = {
                        result: payload.result,
                        rows: payload.rows,
                        offset: payload.offset,
                        limit: payload.limit,
                        queryId: payload.queryId,
                    };
                }
            });
            this.setState(state);
        });

        this.props.api.fetchResults();
    }

    render() {
        const activeTab = this.state.tabs.find(t => t.id === this.state.activeTabId);

        return (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
                <style>
                    {"button:focus {outline: 1px solid -webkit-focus-ring-color;}"}
                </style>
                <TabBar
                    tabs={this.state.tabs}
                    activeTabId={this.state.activeTabId}
                    onSelectTab={this.handleSelectTab.bind(this)}
                    onCloseTab={this.handleCloseTab.bind(this)}
                    onClearAll={this.handleClearAll.bind(this)}
                    onOpenSettings={() => this.props.api.openSettings()}
                    onExport={this.handleExport.bind(this)}
                />
                {activeTab ? (
                    <ResultSetList
                        key={activeTab.id}
                        list={activeTab.results}
                        onExport={this.handleExport.bind(this)}
                        onRows={this.handleRows.bind(this)}
                        onChangeLimit={this.handleChangeLimit.bind(this)}
                        onOpenSettings={() => this.props.api.openSettings()}
                        onApplyFilter={this.handleApplyFilter.bind(this)}
                        onCopy={this.handleCopy.bind(this)}
                    />
                ) : (
                    <div style={styles.emptyState}>
                        <div style={{ fontSize: "28px", marginBottom: "12px" }}>📊</div>
                        <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>
                            No Query Results
                        </div>
                        <div style={{ fontSize: "12px", opacity: 0.8 }}>
                            Run a query with the Play button or Ctrl+Shift+Q to view results.
                        </div>
                    </div>
                )}
            </div>
        );
    }

    private handleSelectTab(tabId: string) {
        this.setState({ activeTabId: tabId });
    }

    private handleCloseTab(tabId: string) {
        const state = produce(this.state, (draftState) => {
            const idx = draftState.tabs.findIndex(t => t.id === tabId);
            if (idx !== -1) {
                draftState.tabs.splice(idx, 1);
                if (draftState.activeTabId === tabId) {
                    if (draftState.tabs.length > 0) {
                        const newIdx = Math.min(idx, draftState.tabs.length - 1);
                        draftState.activeTabId = draftState.tabs[newIdx].id;
                    } else {
                        draftState.activeTabId = "";
                    }
                }
            }
        });
        this.setState(state);
        this.props.api.closeQuery(tabId);
    }

    private handleClearAll() {
        this.setState({ tabs: [], activeTabId: "" });
        this.props.api.clearAllQueries();
    }

    private handleExport(format: string, index?: number, rows?: (string | number)[][]) {
        const activeTab = this.state.tabs.find(t => t.id === this.state.activeTabId);
        this.props.api.exportResults(format, index, rows, activeTab ? activeTab.id : undefined);
    }

    private handleCopy(text: string) {
        this.props.api.copyToClipboard(text);
    }

    private handleRows(offset: number, limit: number, index: number) {
        const activeTab = this.state.tabs.find(t => t.id === this.state.activeTabId);
        this.props.api.fetchRows(index, offset, limit, activeTab ? activeTab.id : undefined);
    }

    private handleChangeLimit(limit: number, resultIndex?: number, saveAsDefault: boolean = false) {
        const activeTab = this.state.tabs.find(t => t.id === this.state.activeTabId);
        if (activeTab) {
            if (typeof resultIndex === "number") {
                this.props.api.fetchRows(resultIndex, 0, limit, activeTab.id);
            } else {
                activeTab.results.forEach((_, idx) => {
                    this.props.api.fetchRows(idx, 0, limit, activeTab.id);
                });
            }
        }
        if (saveAsDefault) {
            this.props.api.updateConfig({ recordsPerPage: limit });
        }
    }

    private handleApplyFilter(filters: ColumnFilter[], resultIndex: number) {
        const activeTab = this.state.tabs.find(t => t.id === this.state.activeTabId);
        if (activeTab) {
            this.props.api.applyFilter(activeTab.id, resultIndex, filters);
        }
    }
}

export default App;

const styles: { [prop: string]: React.CSSProperties } = {
    emptyState: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "50px 20px",
        color: "var(--vscode-descriptionForeground, #888)",
        textAlign: "center",
        userSelect: "none",
    }
};