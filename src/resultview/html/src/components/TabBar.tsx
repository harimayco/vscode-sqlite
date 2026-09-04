import * as React from "react";
import { ResultSetData } from "../api";
import BtnExportCsv from "./BtnExportCsv";
import BtnExportHtml from "./BtnExportHtml";
import BtnExportJson from "./BtnExportJson";
import BtnExportSql from "./BtnExportSql";

export interface QueryTabItem {
    id: string;
    title: string;
    statement: string;
    timestamp: string;
    results: Array<ResultSetData>;
}

interface Props {
    tabs: QueryTabItem[];
    activeTabId: string;
    onSelectTab: (tabId: string) => void;
    onCloseTab: (tabId: string) => void;
    onClearAll: () => void;
    onExport: (format: "csv" | "html" | "json" | "sql") => void;
}

const TabBar: React.FunctionComponent<Props> = (props) => {
    return (
        <div style={styles.container}>
            <div style={styles.tabStrip}>
                {props.tabs.map((tab) => {
                    const isActive = tab.id === props.activeTabId;
                    const totalRows = tab.results.reduce(
                        (sum, r) => sum + (r.size || (r.rows && r.rows.rows ? r.rows.rows.length : 0)),
                        0
                    );

                    const tooltip = `Query: ${tab.statement || tab.title}\nTime: ${tab.timestamp}\nRows: ${totalRows}`;

                    return (
                        <div
                            key={tab.id}
                            style={{
                                ...styles.tab,
                                ...(isActive ? styles.tabActive : styles.tabInactive),
                            }}
                            onClick={() => props.onSelectTab(tab.id)}
                            title={tooltip}
                        >
                            <span style={styles.tabTitle}>{tab.title}</span>
                            <span
                                style={{
                                    ...styles.badge,
                                    ...(isActive ? styles.badgeActive : styles.badgeInactive),
                                }}
                            >
                                {totalRows}
                            </span>
                            <span
                                style={styles.closeBtn}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    props.onCloseTab(tab.id);
                                }}
                                title="Close Tab"
                            >
                                ×
                            </span>
                        </div>
                    );
                })}
            </div>

            {props.tabs.length > 0 && (
                <div style={styles.actions}>
                    <button
                        style={styles.clearBtn}
                        onClick={props.onClearAll}
                        title="Close all result tabs"
                    >
                        Clear All
                    </button>
                    <div style={styles.separator} />
                    <BtnExportCsv onClick={() => props.onExport("csv")} />
                    <BtnExportHtml onClick={() => props.onExport("html")} />
                    <BtnExportJson onClick={() => props.onExport("json")} />
                    <BtnExportSql onClick={() => props.onExport("sql")} />
                </div>
            )}
        </div>
    );
};

export default TabBar;

const styles: { [prop: string]: React.CSSProperties } = {
    container: {
        display: "flex",
        alignItems: "stretch",
        justifyContent: "space-between",
        backgroundColor: "var(--vscode-editorGroupHeader-tabsBackground, #252526)",
        borderBottom: "1px solid var(--vscode-editorGroupHeader-tabsBorder, var(--vscode-widget-border, #333333))",
        height: "34px",
        minHeight: "34px",
        boxSizing: "border-box",
        overflow: "hidden",
        userSelect: "none",
    },
    tabStrip: {
        display: "flex",
        alignItems: "stretch",
        overflowX: "auto",
        whiteSpace: "nowrap",
        flex: 1,
        scrollbarWidth: "none",
    },
    tab: {
        display: "inline-flex",
        alignItems: "center",
        height: "100%",
        padding: "0 10px 0 12px",
        cursor: "pointer",
        boxSizing: "border-box",
        borderRight: "1px solid var(--vscode-tab-border, rgba(128, 128, 128, 0.2))",
        maxWidth: "260px",
        minWidth: "90px",
        transition: "background-color 0.15s ease",
    },
    tabActive: {
        backgroundColor: "var(--vscode-tab-activeBackground, #1e1e1e)",
        color: "var(--vscode-tab-activeForeground, #ffffff)",
        borderTop: "2px solid var(--vscode-tab-activeBorderTop, var(--vscode-focusBorder, #007acc))",
        borderBottom: "1px solid transparent",
        fontWeight: 600,
    },
    tabInactive: {
        backgroundColor: "var(--vscode-tab-inactiveBackground, #2d2d2d)",
        color: "var(--vscode-tab-inactiveForeground, #969696)",
        borderTop: "2px solid transparent",
        borderBottom: "1px solid var(--vscode-editorGroupHeader-tabsBorder, rgba(128, 128, 128, 0.2))",
    },
    tabTitle: {
        textOverflow: "ellipsis",
        overflow: "hidden",
        whiteSpace: "nowrap",
        fontSize: "12px",
        marginRight: "6px",
        flex: 1,
    },
    badge: {
        fontSize: "10px",
        padding: "1px 5px",
        borderRadius: "10px",
        marginRight: "6px",
        flexShrink: 0,
        fontWeight: "normal",
    },
    badgeActive: {
        backgroundColor: "rgba(128, 128, 128, 0.35)",
        color: "var(--vscode-tab-activeForeground, #ffffff)",
    },
    badgeInactive: {
        backgroundColor: "rgba(128, 128, 128, 0.15)",
        color: "var(--vscode-tab-inactiveForeground, #969696)",
    },
    closeBtn: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "16px",
        height: "16px",
        borderRadius: "3px",
        fontSize: "13px",
        lineHeight: "13px",
        cursor: "pointer",
        flexShrink: 0,
        opacity: 0.7,
    },
    actions: {
        display: "flex",
        alignItems: "center",
        padding: "0 6px",
        flexShrink: 0,
        backgroundColor: "var(--vscode-editorGroupHeader-tabsBackground, #252526)",
        borderLeft: "1px solid var(--vscode-tab-border, rgba(128, 128, 128, 0.2))",
    },
    clearBtn: {
        background: "transparent",
        border: "none",
        color: "var(--vscode-descriptionForeground, #969696)",
        cursor: "pointer",
        fontSize: "11px",
        padding: "3px 6px",
        borderRadius: "3px",
        outline: "none",
    },
    separator: {
        width: "1px",
        height: "16px",
        backgroundColor: "var(--vscode-tab-border, rgba(128, 128, 128, 0.3))",
        margin: "0 6px",
    },
};
