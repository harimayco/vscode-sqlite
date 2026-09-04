import * as React from "react";

interface Props {
    visible: boolean;
    columns: string[];
    tableName?: string;
    selectedRowsCount?: number;
    totalRowsCount?: number;
    onClose: () => void;
    onExport: (selectedColumns: string[], multiValue: boolean) => void;
}

function isLikelyIdColumn(col: string, tableName?: string): boolean {
    if (!col) return false;
    const clean = col.trim().toLowerCase();
    if (clean === "id" || clean === "rowid" || clean === "_rowid_" || clean === "oid") {
        return true;
    }
    if (tableName) {
        const cleanTable = tableName.trim().toLowerCase();
        let singularTable = cleanTable;
        if (cleanTable.endsWith("ies") && cleanTable.length > 3) {
            singularTable = cleanTable.slice(0, -3) + "y";
        } else if (cleanTable.endsWith("es") && cleanTable.length > 2) {
            singularTable = cleanTable.slice(0, -2);
        } else if (cleanTable.endsWith("s") && cleanTable.length > 1) {
            singularTable = cleanTable.slice(0, -1);
        }

        if (clean === `${cleanTable}_id` || clean === `${cleanTable}id` ||
            clean === `${singularTable}_id` || clean === `${singularTable}id`) {
            return true;
        }
    }
    // General ID convention fallback
    if (clean.endsWith("_id") && clean.length > 3) {
        return true;
    }
    return false;
}

const SqlExportModal: React.FunctionComponent<Props> = (props) => {
    if (!props.visible) return null;

    const [selectedColumns, setSelectedColumns] = React.useState<Set<string>>(() => {
        const initial = new Set<string>();
        props.columns.forEach(col => {
            if (!isLikelyIdColumn(col, props.tableName)) {
                initial.add(col);
            }
        });
        // If all columns were flagged as ID, ensure at least one remains checked
        if (initial.size === 0 && props.columns.length > 0) {
            initial.add(props.columns[0]);
        }
        return initial;
    });

    const [multiValue, setMultiValue] = React.useState<boolean>(true);
    const [searchFilter, setSearchFilter] = React.useState<string>("");

    // Reset selection when columns change
    React.useEffect(() => {
        const initial = new Set<string>();
        props.columns.forEach(col => {
            if (!isLikelyIdColumn(col, props.tableName)) {
                initial.add(col);
            }
        });
        if (initial.size === 0 && props.columns.length > 0) {
            initial.add(props.columns[0]);
        }
        setSelectedColumns(initial);
        setSearchFilter("");
    }, [props.columns, props.visible, props.tableName]);

    // Handle Escape key
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                props.onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [props.onClose]);

    const filteredColumns = props.columns.filter(col =>
        col.toLowerCase().includes(searchFilter.toLowerCase().trim())
    );

    const handleToggleColumn = (col: string) => {
        const next = new Set(selectedColumns);
        if (next.has(col)) {
            next.delete(col);
        } else {
            next.add(col);
        }
        setSelectedColumns(next);
    };

    const handleSelectAll = () => {
        setSelectedColumns(new Set(props.columns));
    };

    const handleDeselectAll = () => {
        setSelectedColumns(new Set());
    };

    const handleExport = () => {
        // Keep order identical to original columns
        const orderedSelected = props.columns.filter(col => selectedColumns.has(col));
        if (orderedSelected.length === 0) return;
        props.onExport(orderedSelected, multiValue);
        props.onClose();
    };

    return (
        <div style={styles.overlay} onClick={props.onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerTitle}>
                        <span style={{ fontSize: "16px", marginRight: "8px" }}>💾</span>
                        Export as INSERT INTO SQL
                    </div>
                    <button
                        style={styles.closeButton}
                        onClick={props.onClose}
                        title="Close (Esc)"
                    >
                        ✕
                    </button>
                </div>

                {/* Subtitle info */}
                {props.selectedRowsCount !== undefined && (
                    <div style={styles.infoBanner}>
                        Exporting <strong>{props.selectedRowsCount}</strong> selected row{props.selectedRowsCount === 1 ? "" : "s"}.
                    </div>
                )}

                {/* Body */}
                <div style={styles.body}>
                    {/* Columns selection section */}
                    <div style={styles.sectionHeader}>
                        <span style={styles.sectionTitle}>
                            Columns to Export ({selectedColumns.size} of {props.columns.length})
                        </span>
                        <div style={styles.quickLinks}>
                            <button style={styles.linkButton} onClick={handleSelectAll}>
                                Select All
                            </button>
                            <span style={{ opacity: 0.4 }}>|</span>
                            <button style={styles.linkButton} onClick={handleDeselectAll}>
                                Deselect All
                            </button>
                        </div>
                    </div>

                    {props.columns.length > 5 && (
                        <div style={styles.searchBox}>
                            <input
                                type="text"
                                style={styles.searchInput}
                                placeholder="Search columns..."
                                value={searchFilter}
                                onChange={e => setSearchFilter(e.target.value)}
                            />
                        </div>
                    )}

                    <div style={styles.columnList}>
                        {filteredColumns.map(col => {
                            const isId = isLikelyIdColumn(col, props.tableName);
                            const isChecked = selectedColumns.has(col);
                            return (
                                <label
                                    key={col}
                                    style={{
                                        ...styles.columnItem,
                                        backgroundColor: isChecked
                                            ? "var(--vscode-list-activeSelectionBackground, rgba(0, 122, 204, 0.15))"
                                            : "transparent",
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggleColumn(col)}
                                        style={styles.checkbox}
                                    />
                                    <span style={styles.columnName}>{col}</span>
                                    {isId && (
                                        <span style={styles.idBadge} title="Auto-increment / primary key column">
                                            ID (Excluded by default)
                                        </span>
                                    )}
                                </label>
                            );
                        })}
                        {filteredColumns.length === 0 && (
                            <div style={styles.noMatch}>No columns match "{searchFilter}"</div>
                        )}
                    </div>

                    {/* Insert Style Section */}
                    <div style={{ marginTop: "16px" }}>
                        <div style={styles.sectionTitle}>Insert Format Style:</div>
                        <div style={styles.styleOptionContainer}>
                            <label
                                style={{
                                    ...styles.styleOptionCard,
                                    borderColor: multiValue
                                        ? "var(--vscode-focusBorder, #007acc)"
                                        : "var(--vscode-widget-border, #444)",
                                    backgroundColor: multiValue
                                        ? "var(--vscode-list-hoverBackground, rgba(255, 255, 255, 0.06))"
                                        : "transparent",
                                }}
                                onClick={() => setMultiValue(true)}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <input
                                        type="radio"
                                        name="insertStyle"
                                        checked={multiValue}
                                        onChange={() => setMultiValue(true)}
                                    />
                                    <strong style={{ fontSize: "13px" }}>Multiple Values (Batch)</strong>
                                    <span style={styles.recommendedBadge}>Default</span>
                                </div>
                                <div style={styles.styleSubtext}>
                                    INSERT INTO table (col1, col2) VALUES (a, b), (c, d);
                                </div>
                            </label>

                            <label
                                style={{
                                    ...styles.styleOptionCard,
                                    borderColor: !multiValue
                                        ? "var(--vscode-focusBorder, #007acc)"
                                        : "var(--vscode-widget-border, #444)",
                                    backgroundColor: !multiValue
                                        ? "var(--vscode-list-hoverBackground, rgba(255, 255, 255, 0.06))"
                                        : "transparent",
                                }}
                                onClick={() => setMultiValue(false)}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <input
                                        type="radio"
                                        name="insertStyle"
                                        checked={!multiValue}
                                        onChange={() => setMultiValue(false)}
                                    />
                                    <strong style={{ fontSize: "13px" }}>Single Value Statements</strong>
                                </div>
                                <div style={styles.styleSubtext}>
                                    One INSERT INTO statement per row
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={styles.footer}>
                    <button style={styles.secondaryButton} onClick={props.onClose}>
                        Cancel
                    </button>
                    <button
                        style={{
                            ...styles.primaryButton,
                            opacity: selectedColumns.size === 0 ? 0.5 : 1,
                            cursor: selectedColumns.size === 0 ? "not-allowed" : "pointer"
                        }}
                        disabled={selectedColumns.size === 0}
                        onClick={handleExport}
                    >
                        Export SQL ({selectedColumns.size} columns)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SqlExportModal;

const styles: { [prop: string]: React.CSSProperties } = {
    overlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(2px)",
    },
    modal: {
        backgroundColor: "var(--vscode-editorWidget-background, #252526)",
        color: "var(--vscode-editor-foreground, #cccccc)",
        border: "1px solid var(--vscode-editorWidget-border, #454545)",
        borderRadius: "6px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.45)",
        width: "480px",
        maxWidth: "92vw",
        maxHeight: "85vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "var(--vscode-font-family, sans-serif)",
    },
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 18px",
        borderBottom: "1px solid var(--vscode-editorWidget-border, #3a3a3a)",
        backgroundColor: "var(--vscode-titleBar-activeBackground, #1e1e1e)",
    },
    headerTitle: {
        fontSize: "14px",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
    },
    closeButton: {
        background: "transparent",
        border: "none",
        color: "var(--vscode-icon-foreground, #c5c5c5)",
        cursor: "pointer",
        fontSize: "15px",
        padding: "4px 8px",
        borderRadius: "4px",
        lineHeight: 1,
    },
    infoBanner: {
        backgroundColor: "var(--vscode-textBlockQuote-background, rgba(0, 122, 204, 0.12))",
        borderBottom: "1px solid var(--vscode-editorWidget-border, #3a3a3a)",
        padding: "8px 18px",
        fontSize: "12px",
        color: "var(--vscode-descriptionForeground, #999)",
    },
    body: {
        padding: "16px 18px",
        overflowY: "auto",
        flex: 1,
    },
    sectionHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "8px",
    },
    sectionTitle: {
        fontSize: "12px",
        fontWeight: 600,
        color: "var(--vscode-foreground, #ccc)",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
    },
    quickLinks: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    linkButton: {
        background: "transparent",
        border: "none",
        color: "var(--vscode-textLink-foreground, #3794ff)",
        fontSize: "11px",
        cursor: "pointer",
        padding: 0,
        textDecoration: "underline",
    },
    searchBox: {
        marginBottom: "8px",
    },
    searchInput: {
        width: "100%",
        boxSizing: "border-box",
        padding: "6px 10px",
        backgroundColor: "var(--vscode-input-background, #3c3c3c)",
        color: "var(--vscode-input-foreground, #cccccc)",
        border: "1px solid var(--vscode-input-border, #3c3c3c)",
        borderRadius: "3px",
        fontSize: "12px",
        outline: "none",
    },
    columnList: {
        border: "1px solid var(--vscode-input-border, #3c3c3c)",
        borderRadius: "4px",
        maxHeight: "170px",
        overflowY: "auto",
        backgroundColor: "var(--vscode-input-background, #1e1e1e)",
    },
    columnItem: {
        display: "flex",
        alignItems: "center",
        padding: "7px 12px",
        borderBottom: "1px solid var(--vscode-editorWidget-border, rgba(255, 255, 255, 0.05))",
        cursor: "pointer",
        userSelect: "none",
        gap: "10px",
        transition: "background-color 0.12s ease",
    },
    checkbox: {
        cursor: "pointer",
        margin: 0,
    },
    columnName: {
        fontSize: "13px",
        fontFamily: "var(--vscode-editor-font-family, monospace)",
        flex: 1,
    },
    idBadge: {
        fontSize: "10px",
        padding: "2px 6px",
        borderRadius: "3px",
        backgroundColor: "var(--vscode-badge-background, rgba(255, 140, 0, 0.2))",
        color: "var(--vscode-badge-foreground, #e5a55d)",
        fontWeight: 500,
        marginLeft: "auto",
    },
    noMatch: {
        padding: "16px",
        textAlign: "center",
        color: "var(--vscode-descriptionForeground, #888)",
        fontSize: "12px",
    },
    styleOptionContainer: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        marginTop: "8px",
    },
    styleOptionCard: {
        border: "1px solid var(--vscode-widget-border, #444)",
        borderRadius: "4px",
        padding: "10px 12px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        userSelect: "none",
        transition: "border-color 0.15s ease",
    },
    styleSubtext: {
        fontSize: "11px",
        color: "var(--vscode-descriptionForeground, #888)",
        marginLeft: "24px",
        fontFamily: "var(--vscode-editor-font-family, monospace)",
    },
    recommendedBadge: {
        fontSize: "10px",
        padding: "1px 6px",
        borderRadius: "3px",
        backgroundColor: "var(--vscode-statusBarItem-prominentBackground, #007acc)",
        color: "#ffffff",
        fontWeight: 600,
    },
    footer: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "10px",
        padding: "12px 18px",
        borderTop: "1px solid var(--vscode-editorWidget-border, #3a3a3a)",
        backgroundColor: "var(--vscode-titleBar-activeBackground, #1e1e1e)",
    },
    secondaryButton: {
        backgroundColor: "var(--vscode-button-secondaryBackground, #3a3d41)",
        color: "var(--vscode-button-secondaryForeground, #ffffff)",
        border: "none",
        borderRadius: "3px",
        padding: "6px 14px",
        fontSize: "12px",
        cursor: "pointer",
    },
    primaryButton: {
        backgroundColor: "var(--vscode-button-background, #0e639c)",
        color: "var(--vscode-button-foreground, #ffffff)",
        border: "none",
        borderRadius: "3px",
        padding: "6px 16px",
        fontSize: "12px",
        fontWeight: 600,
        cursor: "pointer",
    },
};
