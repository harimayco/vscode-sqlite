import * as React from "react";
import * as Icons from "./Icons";
import ColumnFilterPopover from "../ColumnFilterPopover";

interface Props {
    offset: number;
    columns: string[];
    rows: (string | number)[][];
    canFilter?: boolean;
    activeFilters?: { [column: string]: { operator: string; value: string } };
    onApplyFilter?: (column: string, operator: string, value: string) => void;
    onClearFilter?: (column: string) => void;
    onExportSelected?: (format: string, rows: (string | number)[][]) => void;
    onCopy?: (text: string) => void;
}

interface ContextMenuState {
    visible: boolean;
    x: number;
    y: number;
    rowIndex?: number;
}

const Table: React.FunctionComponent<Props> = (props) => {
    const [selectedRows, setSelectedRows] = React.useState<Set<number>>(new Set());
    const [selectedCells, setSelectedCells] = React.useState<Set<string>>(new Set());
    const [lastSelectedRow, setLastSelectedRow] = React.useState<number | null>(null);
    const [lastSelectedCell, setLastSelectedCell] = React.useState<{ r: number; c: number } | null>(null);
    const [dragStart, setDragStart] = React.useState<{ r: number; c: number } | null>(null);
    const [isDragging, setIsDragging] = React.useState<boolean>(false);
    const [contextMenu, setContextMenu] = React.useState<ContextMenuState>({ visible: false, x: 0, y: 0 });
    const [filterPopover, setFilterPopover] = React.useState<{
        visible: boolean;
        column: string;
        x: number;
        y: number;
    }>({ visible: false, column: "", x: 0, y: 0 });

    const containerRef = React.useRef<HTMLDivElement>(null);

    // Global mouseup to finish drag selection
    React.useEffect(() => {
        const handleMouseUp = () => {
            setIsDragging(false);
            setDragStart(null);
        };
        window.addEventListener("mouseup", handleMouseUp);
        return () => window.removeEventListener("mouseup", handleMouseUp);
    }, []);

    // Helper: copy current selection formatted as TSV
    const copySelection = React.useCallback((includeHeaders: boolean = false): boolean => {
        let text = "";

        if (selectedRows.size > 0) {
            const sortedIndices = Array.from(selectedRows).sort((a, b) => a - b);
            const lines: string[] = [];
            if (includeHeaders) {
                lines.push(props.columns.join("\t"));
            }
            for (const idx of sortedIndices) {
                const row = props.rows[idx];
                if (row) {
                    lines.push(row.join("\t"));
                }
            }
            text = lines.join("\n");
        } else if (selectedCells.size > 0) {
            const parsed = Array.from(selectedCells).map(s => {
                const parts = s.split(",").map(Number);
                return { r: parts[0], c: parts[1] };
            });
            const minR = Math.min(...parsed.map(p => p.r));
            const maxR = Math.max(...parsed.map(p => p.r));
            const minC = Math.min(...parsed.map(p => p.c));
            const maxC = Math.max(...parsed.map(p => p.c));

            const lines: string[] = [];
            if (includeHeaders) {
                lines.push(props.columns.slice(minC, maxC + 1).join("\t"));
            }
            for (let r = minR; r <= maxR; r++) {
                const rowValues: string[] = [];
                for (let c = minC; c <= maxC; c++) {
                    if (selectedCells.has(`${r},${c}`) && props.rows[r] && props.rows[r][c] !== undefined) {
                        rowValues.push(String(props.rows[r][c]));
                    } else {
                        rowValues.push("");
                    }
                }
                lines.push(rowValues.join("\t"));
            }
            text = lines.join("\n");
        } else {
            return false;
        }

        if (text) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).catch(() => {});
            }
            if (props.onCopy) {
                props.onCopy(text);
            }
            return true;
        }
        return false;
    }, [selectedRows, selectedCells, props.columns, props.rows, props.onCopy]);

    // Keyboard shortcuts (Ctrl+C, Ctrl+A, Esc)
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) {
            // If user has highlighted native text with mouse cursor, allow native copy
            const nativeSelection = window.getSelection();
            if (nativeSelection && nativeSelection.toString().length > 0) {
                return;
            }
            if (selectedRows.size > 0 || selectedCells.size > 0) {
                e.preventDefault();
                copySelection(false);
            }
        } else if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
            e.preventDefault();
            const all = new Set<number>();
            for (let i = 0; i < props.rows.length; i++) {
                all.add(i);
            }
            setSelectedRows(all);
            setSelectedCells(new Set());
        } else if (e.key === "Escape") {
            if (contextMenu.visible) {
                setContextMenu({ visible: false, x: 0, y: 0 });
            } else {
                setSelectedRows(new Set());
                setSelectedCells(new Set());
            }
        }
    };

    // Row selection on # click
    const handleRowNumberClick = (e: React.MouseEvent, rowIndex: number) => {
        e.stopPropagation();
        if (e.shiftKey && lastSelectedRow !== null) {
            const start = Math.min(lastSelectedRow, rowIndex);
            const end = Math.max(lastSelectedRow, rowIndex);
            const next = new Set<number>(e.ctrlKey || e.metaKey ? selectedRows : []);
            for (let i = start; i <= end; i++) {
                next.add(i);
            }
            setSelectedRows(next);
            setSelectedCells(new Set());
        } else if (e.ctrlKey || e.metaKey) {
            const next = new Set(selectedRows);
            if (next.has(rowIndex)) {
                next.delete(rowIndex);
            } else {
                next.add(rowIndex);
            }
            setSelectedRows(next);
            setSelectedCells(new Set());
            setLastSelectedRow(rowIndex);
        } else {
            setSelectedRows(new Set([rowIndex]));
            setSelectedCells(new Set());
            setLastSelectedRow(rowIndex);
        }
    };

    // Header # click: toggle all rows
    const handleHeaderRowClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (selectedRows.size === props.rows.length) {
            setSelectedRows(new Set());
        } else {
            const all = new Set<number>();
            for (let i = 0; i < props.rows.length; i++) {
                all.add(i);
            }
            setSelectedRows(all);
            setSelectedCells(new Set());
        }
    };

    // Cell click & drag selection
    const handleCellMouseDown = (e: React.MouseEvent, r: number, c: number) => {
        if (e.button !== 0) return; // Left-click only

        if (e.shiftKey && lastSelectedCell) {
            const minR = Math.min(lastSelectedCell.r, r);
            const maxR = Math.max(lastSelectedCell.r, r);
            const minC = Math.min(lastSelectedCell.c, c);
            const maxC = Math.max(lastSelectedCell.c, c);
            const next = new Set<string>();
            for (let row = minR; row <= maxR; row++) {
                for (let col = minC; col <= maxC; col++) {
                    next.add(`${row},${col}`);
                }
            }
            setSelectedCells(next);
            setSelectedRows(new Set());
        } else if (e.ctrlKey || e.metaKey) {
            const key = `${r},${c}`;
            const next = new Set(selectedCells);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            setSelectedCells(next);
            setSelectedRows(new Set());
            setLastSelectedCell({ r, c });
        } else {
            setDragStart({ r, c });
            setIsDragging(true);
            setSelectedCells(new Set([`${r},${c}`]));
            setSelectedRows(new Set());
            setLastSelectedCell({ r, c });
        }
    };

    const handleCellMouseEnter = (r: number, c: number) => {
        if (!isDragging || !dragStart) return;

        const minR = Math.min(dragStart.r, r);
        const maxR = Math.max(dragStart.r, r);
        const minC = Math.min(dragStart.c, c);
        const maxC = Math.max(dragStart.c, c);
        const next = new Set<string>();
        for (let row = minR; row <= maxR; row++) {
            for (let col = minC; col <= maxC; col++) {
                next.add(`${row},${col}`);
            }
        }
        setSelectedCells(next);
        setSelectedRows(new Set());
    };

    // Right-click context menu handler on row # or cells
    const handleContextMenu = (e: React.MouseEvent, rowIndex?: number, cellCol?: number) => {
        e.preventDefault();
        e.stopPropagation();

        if (typeof rowIndex === "number") {
            if (cellCol === undefined) {
                // Right-click on row number #
                if (!selectedRows.has(rowIndex)) {
                    if (!e.ctrlKey && !e.metaKey) {
                        setSelectedRows(new Set([rowIndex]));
                        setSelectedCells(new Set());
                        setLastSelectedRow(rowIndex);
                    }
                }
            } else {
                // Right-click on a data cell
                const key = `${rowIndex},${cellCol}`;
                if (!selectedCells.has(key) && !selectedRows.has(rowIndex)) {
                    setSelectedCells(new Set([key]));
                    setSelectedRows(new Set());
                    setLastSelectedCell({ r: rowIndex, c: cellCol });
                }
            }
        }

        const menuWidth = 240;
        const menuHeight = 260;
        const x = Math.max(10, Math.min(e.clientX, window.innerWidth - menuWidth - 10));
        const y = Math.max(10, Math.min(e.clientY, window.innerHeight - menuHeight - 10));

        setContextMenu({ visible: true, x, y, rowIndex });
    };

    const getTargetRowsForExport = (): (string | number)[][] => {
        if (selectedRows.size > 0) {
            const sortedIndices = Array.from(selectedRows).sort((a, b) => a - b);
            return sortedIndices.map(idx => props.rows[idx]).filter(Boolean);
        } else if (typeof contextMenu.rowIndex === "number" && props.rows[contextMenu.rowIndex]) {
            return [props.rows[contextMenu.rowIndex]];
        }
        return props.rows;
    };

    const handleExportSelected = (format: string) => {
        const targetRows = getTargetRowsForExport();
        if (props.onExportSelected) {
            props.onExportSelected(format, targetRows);
        }
        setContextMenu({ visible: false, x: 0, y: 0 });
    };

    const handleFilterButtonClick = (e: React.MouseEvent, column: string) => {
        e.stopPropagation();
        e.preventDefault();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setFilterPopover({
            visible: true,
            column,
            x: rect.left,
            y: rect.bottom + 4,
        });
    };

    return (
        <div
            ref={containerRef}
            style={styles.container}
            tabIndex={0}
            onKeyDown={handleKeyDown}
        >
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th
                            style={styles.headColRowNumber}
                            onClick={handleHeaderRowClick}
                            title="Click to select / deselect all rows"
                        >
                            #
                        </th>
                        {props.columns.map((col, i) => {
                            const activeFilter = props.activeFilters && props.activeFilters[col];
                            const isFiltered = Boolean(activeFilter && activeFilter.operator && activeFilter.operator !== "(default)");
                            return (
                                <th key={i} style={styles.headCol}>
                                    <div style={styles.headColWrapper}>
                                        <span style={styles.headColText}>{col}</span>
                                        {props.canFilter && (
                                            <button
                                                type="button"
                                                style={isFiltered ? styles.filterBtnActive : styles.filterBtn}
                                                onClick={(e) => handleFilterButtonClick(e, col)}
                                                title={isFiltered ? `Filtered by ${col} (${activeFilter?.operator}: ${activeFilter?.value})` : `Filter by ${col}`}
                                            >
                                                <Icons.Filter filled={isFiltered} />
                                            </button>
                                        )}
                                    </div>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {props.rows.map((row, i) => {
                        const isRowSelected = selectedRows.has(i);
                        return (
                            <tr key={i}>
                                <td
                                    style={isRowSelected ? styles.bodyColRowNumberSelected : styles.bodyColRowNumber}
                                    onClick={(e) => handleRowNumberClick(e, i)}
                                    onContextMenu={(e) => handleContextMenu(e, i)}
                                    title="Click to select row, Shift+Click for range, Ctrl+Click for multi-select, Right-click to export"
                                >
                                    {props.offset + i + 1}
                                </td>
                                {row.map((col, j) => {
                                    const isCellSelected = selectedCells.has(`${i},${j}`);
                                    let cellStyle = styles.bodyCol;
                                    if (isRowSelected) {
                                        cellStyle = styles.bodyColRowSelected;
                                    } else if (isCellSelected) {
                                        cellStyle = styles.bodyColCellSelected;
                                    }

                                    return (
                                        <td
                                            key={j}
                                            style={cellStyle}
                                            onMouseDown={(e) => handleCellMouseDown(e, i, j)}
                                            onMouseEnter={() => handleCellMouseEnter(i, j)}
                                            onContextMenu={(e) => handleContextMenu(e, i, j)}
                                        >
                                            {col}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Custom Context Menu */}
            {contextMenu.visible && (
                <>
                    <div
                        style={styles.contextMenuBackdrop}
                        onClick={() => setContextMenu({ visible: false, x: 0, y: 0 })}
                        onContextMenu={(e) => { e.preventDefault(); setContextMenu({ visible: false, x: 0, y: 0 }); }}
                    />
                    <div
                        style={{
                            ...styles.contextMenu,
                            left: contextMenu.x,
                            top: contextMenu.y
                        }}
                    >
                        <MenuItem
                            label="Copy Selected"
                            shortcut="Ctrl+C"
                            onClick={() => { copySelection(false); setContextMenu({ visible: false, x: 0, y: 0 }); }}
                        />
                        <MenuItem
                            label="Copy with Column Headers"
                            onClick={() => { copySelection(true); setContextMenu({ visible: false, x: 0, y: 0 }); }}
                        />
                        <div style={styles.menuSeparator} />
                        <MenuItem
                            label="Export Selected to INSERT INTO SQL"
                            highlight
                            onClick={() => handleExportSelected("sql")}
                        />
                        <MenuItem
                            label="Export Selected to CSV"
                            onClick={() => handleExportSelected("csv")}
                        />
                        <MenuItem
                            label="Export Selected to JSON"
                            onClick={() => handleExportSelected("json")}
                        />
                        <MenuItem
                            label="Export Selected to HTML"
                            onClick={() => handleExportSelected("html")}
                        />
                        <div style={styles.menuSeparator} />
                        <MenuItem
                            label="Select All Rows"
                            shortcut="Ctrl+A"
                            onClick={() => {
                                const all = new Set<number>();
                                for (let i = 0; i < props.rows.length; i++) all.add(i);
                                setSelectedRows(all);
                                setSelectedCells(new Set());
                                setContextMenu({ visible: false, x: 0, y: 0 });
                            }}
                        />
                        <MenuItem
                            label="Clear Selection"
                            shortcut="Esc"
                            onClick={() => {
                                setSelectedRows(new Set());
                                setSelectedCells(new Set());
                                setContextMenu({ visible: false, x: 0, y: 0 });
                            }}
                        />
                    </div>
                </>
            )}

            {filterPopover.visible && (
                <ColumnFilterPopover
                    column={filterPopover.column}
                    currentOperator={props.activeFilters && props.activeFilters[filterPopover.column]?.operator}
                    currentValue={props.activeFilters && props.activeFilters[filterPopover.column]?.value}
                    position={{ x: filterPopover.x, y: filterPopover.y }}
                    onApply={(op, val) => {
                        if (props.onApplyFilter) {
                            props.onApplyFilter(filterPopover.column, op, val);
                        }
                    }}
                    onClear={() => {
                        if (props.onClearFilter) {
                            props.onClearFilter(filterPopover.column);
                        }
                    }}
                    onClose={() => setFilterPopover({ visible: false, column: "", x: 0, y: 0 })}
                />
            )}
        </div>
    );
};

interface MenuItemProps {
    label: string;
    shortcut?: string;
    highlight?: boolean;
    onClick: () => void;
}

const MenuItem: React.FunctionComponent<MenuItemProps> = ({ label, shortcut, highlight, onClick }) => {
    const [hover, setHover] = React.useState(false);
    return (
        <div
            style={{
                ...styles.menuItem,
                background: hover ? "var(--vscode-menu-selectionBackground, #094771)" : "transparent",
                color: hover ? "var(--vscode-menu-selectionForeground, #ffffff)" : "var(--vscode-menu-foreground, #cccccc)",
                fontWeight: highlight ? "bold" : "normal"
            }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onClick={onClick}
        >
            <span>{label}</span>
            {shortcut && <span style={styles.menuShortcut}>{shortcut}</span>}
        </div>
    );
};

export default Table;

const styles: {[prop: string]: React.CSSProperties} = {
    container: {
        overflow: "auto",
        maxHeight: "calc(100vh - 85px)",
        marginBottom: "4px",
        outline: "none"
    },
    table: {
        borderCollapse: "collapse",
        minWidth: "100%",
        fontFamily: "var(--vscode-editor-font-family), monospace",
        fontSize: "var(--vscode-editor-font-size)"
    },
    headColRowNumber: {
        position: "sticky",
        top: 0,
        left: 0,
        zIndex: 3,
        border: "1px solid var(--vscode-foreground)",
        boxShadow: "0 1px 0 var(--vscode-foreground)",
        padding: "6px 8px",
        background: "var(--vscode-editor-background, #1e1e1e)",
        color: "var(--vscode-descriptionForeground)",
        textAlign: "right",
        userSelect: "none",
        cursor: "pointer",
        minWidth: "36px"
    },
    headCol: {
        position: "sticky",
        top: 0,
        zIndex: 2,
        border: "1px solid var(--vscode-foreground)",
        boxShadow: "0 1px 0 var(--vscode-foreground)",
        padding: "6px",
        background: "var(--vscode-editor-background, #1e1e1e)",
        textAlign: "left"
    },
    bodyColRowNumber: {
        position: "sticky",
        left: 0,
        zIndex: 1,
        border: "1px solid var(--vscode-foreground)",
        padding: "6px 8px",
        background: "var(--vscode-editor-background, #1e1e1e)",
        color: "var(--vscode-descriptionForeground)",
        textAlign: "right",
        userSelect: "none",
        cursor: "pointer",
        whiteSpace: "pre"
    },
    bodyColRowNumberSelected: {
        position: "sticky",
        left: 0,
        zIndex: 1,
        border: "1px solid var(--vscode-focusBorder, #007fd4)",
        padding: "6px 8px",
        background: "var(--vscode-list-activeSelectionBackground, #094771)",
        color: "var(--vscode-list-activeSelectionForeground, #ffffff)",
        fontWeight: "bold",
        textAlign: "right",
        userSelect: "none",
        cursor: "pointer",
        whiteSpace: "pre"
    },
    bodyCol: {
        border: "1px solid var(--vscode-foreground)",
        padding: "6px",
        whiteSpace: "pre",
        cursor: "cell"
    },
    bodyColRowSelected: {
        border: "1px solid var(--vscode-foreground)",
        padding: "6px",
        whiteSpace: "pre",
        cursor: "cell",
        background: "var(--vscode-editor-selectionBackground, rgba(38, 79, 120, 0.45))"
    },
    bodyColCellSelected: {
        border: "1px solid var(--vscode-focusBorder, #007fd4)",
        padding: "6px",
        whiteSpace: "pre",
        cursor: "cell",
        background: "var(--vscode-editor-selectionBackground, rgba(38, 79, 120, 0.5))",
        outline: "1px solid var(--vscode-focusBorder, #007fd4)"
    },
    contextMenuBackdrop: {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 999,
        background: "transparent"
    },
    contextMenu: {
        position: "fixed",
        zIndex: 1000,
        backgroundColor: "var(--vscode-menu-background, #252526)",
        border: "1px solid var(--vscode-menu-border, #454545)",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.5)",
        borderRadius: "3px",
        padding: "4px 0",
        minWidth: "220px",
        fontFamily: "var(--vscode-font-family, sans-serif)",
        fontSize: "12px"
    },
    menuItem: {
        padding: "6px 12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        cursor: "pointer",
        userSelect: "none"
    },
    menuShortcut: {
        marginLeft: "16px",
        fontSize: "11px",
        opacity: 0.7
    },
    menuSeparator: {
        height: "1px",
        backgroundColor: "var(--vscode-menu-separatorBackground, #454545)",
        margin: "4px 0"
    },
    headColWrapper: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "6px",
    },
    headColText: {
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    filterBtn: {
        background: "transparent",
        border: "none",
        padding: "1px 2px",
        cursor: "pointer",
        opacity: 0.5,
        borderRadius: "2px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        outline: "none",
    },
    filterBtnActive: {
        background: "var(--vscode-badge-background, rgba(0, 122, 204, 0.25))",
        border: "1px solid var(--vscode-focusBorder, #007acc)",
        padding: "0 2px",
        cursor: "pointer",
        opacity: 1,
        borderRadius: "2px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        outline: "none",
    }
};