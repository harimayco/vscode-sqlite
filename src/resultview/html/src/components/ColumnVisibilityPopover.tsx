import * as React from "react";

interface Props {
    visible: boolean;
    columns: string[];
    hiddenColumns: Set<string>;
    anchorRect?: { top: number; left: number; bottom: number; right: number };
    onToggleColumn: (column: string) => void;
    onSetAllColumns: (visible: boolean) => void;
    onClose: () => void;
}

const ColumnVisibilityPopover: React.FunctionComponent<Props> = (props) => {
    if (!props.visible) return null;

    const [searchFilter, setSearchFilter] = React.useState<string>("");
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const popoverRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (props.visible && searchInputRef.current) {
            searchInputRef.current.focus();
        }
        setSearchFilter("");
    }, [props.visible]);

    // Handle Escape or click outside
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                props.onClose();
            }
        };
        const handleMouseDown = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                props.onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("mousedown", handleMouseDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("mousedown", handleMouseDown);
        };
    }, [props.onClose]);

    const filteredColumns = props.columns.filter(col =>
        col.toLowerCase().includes(searchFilter.toLowerCase().trim())
    );

    const visibleCount = props.columns.length - props.hiddenColumns.size;

    // Calculate popover positioning near anchorRect
    let positionStyle: React.CSSProperties = {
        position: "fixed",
        top: "60px",
        right: "20px",
    };

    if (props.anchorRect) {
        const popoverWidth = 280;
        const popoverHeight = 320;
        const left = Math.max(10, Math.min(props.anchorRect.right - popoverWidth, window.innerWidth - popoverWidth - 10));
        const top = Math.min(props.anchorRect.bottom + 6, window.innerHeight - popoverHeight - 10);
        positionStyle = {
            position: "fixed",
            top: `${top}px`,
            left: `${left}px`,
        };
    }

    return (
        <div style={styles.backdrop}>
            <div ref={popoverRef} style={{ ...styles.popover, ...positionStyle }}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.title}>
                        <span style={{ fontSize: "14px", marginRight: "6px" }}>👁️</span>
                        Show / Hide Columns
                    </div>
                    <button style={styles.closeButton} onClick={props.onClose} title="Close (Esc)">
                        ✕
                    </button>
                </div>

                {/* Subtitle / Counter */}
                <div style={styles.subBar}>
                    <span style={styles.countText}>
                        {visibleCount} of {props.columns.length} visible
                    </span>
                    <div style={styles.quickLinks}>
                        <button style={styles.linkButton} onClick={() => props.onSetAllColumns(true)}>
                            Show All
                        </button>
                        <span style={{ opacity: 0.4 }}>|</span>
                        <button style={styles.linkButton} onClick={() => props.onSetAllColumns(false)}>
                            Hide All
                        </button>
                    </div>
                </div>

                {/* Search box */}
                <div style={styles.searchContainer}>
                    <input
                        ref={searchInputRef}
                        type="text"
                        style={styles.searchInput}
                        placeholder="Filter columns..."
                        value={searchFilter}
                        onChange={e => setSearchFilter(e.target.value)}
                    />
                    {searchFilter && (
                        <button
                            style={styles.clearSearchBtn}
                            onClick={() => setSearchFilter("")}
                            title="Clear search"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Column list */}
                <div style={styles.list}>
                    {filteredColumns.map(col => {
                        const isVisible = !props.hiddenColumns.has(col);
                        return (
                            <label
                                key={col}
                                style={{
                                    ...styles.item,
                                    backgroundColor: isVisible
                                        ? "var(--vscode-list-activeSelectionBackground, rgba(0, 122, 204, 0.15))"
                                        : "transparent",
                                    opacity: isVisible ? 1 : 0.65,
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={isVisible}
                                    onChange={() => props.onToggleColumn(col)}
                                    style={styles.checkbox}
                                />
                                <span
                                    style={{
                                        ...styles.columnName,
                                        textDecoration: isVisible ? "none" : "line-through",
                                    }}
                                >
                                    {col}
                                </span>
                            </label>
                        );
                    })}
                    {filteredColumns.length === 0 && (
                        <div style={styles.empty}>No columns match "{searchFilter}"</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ColumnVisibilityPopover;

const styles: { [prop: string]: React.CSSProperties } = {
    backdrop: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: "transparent",
    },
    popover: {
        width: "280px",
        maxHeight: "360px",
        backgroundColor: "var(--vscode-editorWidget-background, #252526)",
        color: "var(--vscode-editor-foreground, #cccccc)",
        border: "1px solid var(--vscode-editorWidget-border, #454545)",
        borderRadius: "6px",
        boxShadow: "0 6px 24px rgba(0, 0, 0, 0.4)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 10000,
        fontFamily: "var(--vscode-font-family, sans-serif)",
    },
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        borderBottom: "1px solid var(--vscode-editorWidget-border, #3a3a3a)",
        backgroundColor: "var(--vscode-titleBar-activeBackground, #1e1e1e)",
    },
    title: {
        fontSize: "13px",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
    },
    closeButton: {
        background: "transparent",
        border: "none",
        color: "var(--vscode-icon-foreground, #c5c5c5)",
        cursor: "pointer",
        fontSize: "14px",
        padding: "2px 6px",
        borderRadius: "3px",
        lineHeight: 1,
    },
    subBar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 14px",
        backgroundColor: "var(--vscode-editorWidget-background, #252526)",
        borderBottom: "1px solid var(--vscode-editorWidget-border, #333)",
        fontSize: "11px",
    },
    countText: {
        color: "var(--vscode-descriptionForeground, #888)",
        fontWeight: 500,
    },
    quickLinks: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
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
    searchContainer: {
        position: "relative",
        padding: "8px 12px",
        borderBottom: "1px solid var(--vscode-editorWidget-border, #333)",
    },
    searchInput: {
        width: "100%",
        boxSizing: "border-box",
        padding: "5px 8px",
        paddingRight: "24px",
        backgroundColor: "var(--vscode-input-background, #3c3c3c)",
        color: "var(--vscode-input-foreground, #cccccc)",
        border: "1px solid var(--vscode-input-border, #3c3c3c)",
        borderRadius: "3px",
        fontSize: "12px",
        outline: "none",
    },
    clearSearchBtn: {
        position: "absolute",
        right: "18px",
        top: "50%",
        transform: "translateY(-50%)",
        background: "transparent",
        border: "none",
        color: "var(--vscode-descriptionForeground, #888)",
        cursor: "pointer",
        fontSize: "12px",
        padding: 0,
    },
    list: {
        padding: "4px 0",
        maxHeight: "220px",
        overflowY: "auto",
        flex: 1,
    },
    item: {
        display: "flex",
        alignItems: "center",
        padding: "6px 14px",
        cursor: "pointer",
        gap: "8px",
        userSelect: "none",
        transition: "background-color 0.1s ease",
    },
    checkbox: {
        cursor: "pointer",
        margin: 0,
    },
    columnName: {
        fontSize: "12px",
        fontFamily: "var(--vscode-editor-font-family, monospace)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    empty: {
        padding: "16px",
        textAlign: "center",
        color: "var(--vscode-descriptionForeground, #888)",
        fontSize: "11px",
    },
};
