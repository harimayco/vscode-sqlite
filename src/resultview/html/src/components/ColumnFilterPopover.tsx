import * as React from "react";

interface Props {
    column: string;
    currentOperator?: string;
    currentValue?: string;
    position: { x: number; y: number };
    onApply: (operator: string, value: string) => void;
    onClear: () => void;
    onClose: () => void;
}

const ColumnFilterPopover: React.FunctionComponent<Props> = (props) => {
    const [operator, setOperator] = React.useState<string>(props.currentOperator || "contains");
    const [value, setValue] = React.useState<string>(props.currentValue || "");

    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        setOperator(props.currentOperator || "contains");
        setValue(props.currentValue || "");
    }, [props.column, props.currentOperator, props.currentValue]);

    React.useEffect(() => {
        if (inputRef.current && operator !== "(default)" && operator !== "is null" && operator !== "is not null") {
            inputRef.current.focus();
        }
    }, [operator]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleApply();
        } else if (e.key === "Escape") {
            e.preventDefault();
            props.onClose();
        }
    };

    const handleApply = () => {
        if (operator === "(default)") {
            props.onClear();
        } else {
            props.onApply(operator, value);
        }
        props.onClose();
    };

    const handleClear = () => {
        props.onClear();
        props.onClose();
    };

    const popoverWidth = 240;
    const left = Math.max(10, Math.min(props.position.x, window.innerWidth - popoverWidth - 20));
    const top = Math.max(10, Math.min(props.position.y, window.innerHeight - 220));

    const needsValueInput = operator !== "(default)" && operator !== "is null" && operator !== "is not null";

    return (
        <>
            <div
                style={styles.backdrop}
                onClick={props.onClose}
                onContextMenu={(e) => { e.preventDefault(); props.onClose(); }}
            />
            <div
                style={{ ...styles.card, left, top }}
                onKeyDown={handleKeyDown}
            >
                <div style={styles.header}>
                    <span style={styles.title}>Filter: <strong>{props.column}</strong></span>
                    <button type="button" style={styles.closeBtn} onClick={props.onClose}>&times;</button>
                </div>

                <div style={styles.body}>
                    <label style={styles.label}>Condition</label>
                    <select
                        style={styles.select}
                        value={operator}
                        onChange={(e) => setOperator(e.target.value)}
                    >
                        <option value="(default)">(default) - No filter</option>
                        <option value="contains">Contains (LIKE %...%)</option>
                        <option value="equal">Equal (=)</option>
                        <option value="not equal">Not Equal (!=)</option>
                        <option value="starts with">Starts with (LIKE ...%)</option>
                        <option value="ends with">Ends with (LIKE %...)</option>
                        <option value="greater than">Greater than (&gt;)</option>
                        <option value="less than">Less than (&lt;)</option>
                        <option value="greater or equal">Greater or equal (&gt;=)</option>
                        <option value="less or equal">Less or equal (&lt;=)</option>
                        <option value="is null">Is NULL</option>
                        <option value="is not null">Is NOT NULL</option>
                    </select>

                    {needsValueInput && (
                        <>
                            <label style={styles.label}>Value</label>
                            <input
                                ref={inputRef}
                                type="text"
                                style={styles.input}
                                placeholder="Enter filter text or number..."
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                            />
                        </>
                    )}
                </div>

                <div style={styles.footer}>
                    <button
                        type="button"
                        style={styles.clearButton}
                        onClick={handleClear}
                    >
                        Clear
                    </button>
                    <button
                        type="button"
                        style={styles.applyButton}
                        onClick={handleApply}
                    >
                        Apply
                    </button>
                </div>
            </div>
        </>
    );
};

export default ColumnFilterPopover;

const styles: { [prop: string]: React.CSSProperties } = {
    backdrop: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9998,
        background: "transparent",
    },
    card: {
        position: "fixed",
        width: "240px",
        backgroundColor: "var(--vscode-editorWidget-background, #252526)",
        color: "var(--vscode-editor-foreground, #cccccc)",
        border: "1px solid var(--vscode-editorWidget-border, #454545)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
        borderRadius: "4px",
        zIndex: 9999,
        padding: "10px 12px",
        fontFamily: "var(--vscode-editor-font-family, sans-serif)",
        fontSize: "12px",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "8px",
        paddingBottom: "6px",
        borderBottom: "1px solid var(--vscode-widget-border, rgba(128,128,128,0.2))",
    },
    title: {
        fontSize: "12px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    closeBtn: {
        background: "transparent",
        border: "none",
        color: "var(--vscode-editor-foreground, #888)",
        cursor: "pointer",
        fontSize: "16px",
        lineHeight: "1",
        padding: "0 2px",
    },
    body: {
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        marginBottom: "12px",
    },
    label: {
        fontSize: "11px",
        color: "var(--vscode-descriptionForeground, #888)",
        marginTop: "2px",
    },
    select: {
        width: "100%",
        padding: "4px 6px",
        fontSize: "12px",
        backgroundColor: "var(--vscode-dropdown-background, #3c3c3c)",
        color: "var(--vscode-dropdown-foreground, #f0f0f0)",
        border: "1px solid var(--vscode-dropdown-border, #3c3c3c)",
        borderRadius: "2px",
        outline: "none",
    },
    input: {
        width: "100%",
        boxSizing: "border-box",
        padding: "4px 6px",
        fontSize: "12px",
        backgroundColor: "var(--vscode-input-background, #3c3c3c)",
        color: "var(--vscode-input-foreground, #cccccc)",
        border: "1px solid var(--vscode-input-border, #3c3c3c)",
        borderRadius: "2px",
        outline: "none",
    },
    footer: {
        display: "flex",
        justifyContent: "flex-end",
        gap: "6px",
    },
    clearButton: {
        padding: "4px 10px",
        fontSize: "12px",
        backgroundColor: "var(--vscode-button-secondaryBackground, #3a3d41)",
        color: "var(--vscode-button-secondaryForeground, #ffffff)",
        border: "none",
        borderRadius: "2px",
        cursor: "pointer",
    },
    applyButton: {
        padding: "4px 12px",
        fontSize: "12px",
        backgroundColor: "var(--vscode-button-background, #0e639c)",
        color: "var(--vscode-button-foreground, #ffffff)",
        border: "none",
        borderRadius: "2px",
        cursor: "pointer",
        fontWeight: 600,
    }
};
