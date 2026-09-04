import * as React from "react";

interface Props {
    currentLimit: number;
    totalRecords?: number;
    isOpen: boolean;
    onClose: () => void;
    onApply: (limit: number, saveAsDefault: boolean) => void;
}

interface State {
    limitValue: number;
    saveAsDefault: boolean;
}

const PRESETS = [10, 20, 50, 100, 200, 500];

export class ConfigModal extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            limitValue: props.currentLimit || 50,
            saveAsDefault: true,
        };
    }

    componentDidUpdate(prevProps: Props) {
        if (this.props.isOpen && !prevProps.isOpen) {
            this.setState({
                limitValue: this.props.currentLimit || 50,
            });
        }
    }

    render() {
        if (!this.props.isOpen) return null;

        return (
            <div style={styles.overlay} onClick={this.props.onClose}>
                <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <div style={styles.header}>
                        <span style={styles.title}>⚙️ Pagination Settings</span>
                        <span style={styles.closeIcon} onClick={this.props.onClose}>
                            ×
                        </span>
                    </div>

                    <div style={styles.body}>
                        <label style={styles.label}>Records per page:</label>
                        <div style={styles.inputRow}>
                            <input
                                style={styles.input}
                                type="number"
                                min={1}
                                max={100000}
                                value={this.state.limitValue > 0 ? this.state.limitValue : ""}
                                placeholder="All (-1)"
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    this.setState({ limitValue: isNaN(val) ? -1 : val });
                                }}
                            />
                        </div>

                        <div style={styles.presetSection}>
                            <span style={styles.presetLabel}>Quick Presets:</span>
                            <div style={styles.presetRow}>
                                {PRESETS.map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        style={{
                                            ...styles.presetBtn,
                                            ...(this.state.limitValue === p ? styles.presetBtnActive : {}),
                                        }}
                                        onClick={() => this.setState({ limitValue: p })}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    style={{
                                        ...styles.presetBtn,
                                        ...(this.state.limitValue === -1 || (this.props.totalRecords && this.state.limitValue >= this.props.totalRecords) ? styles.presetBtnActive : {}),
                                    }}
                                    onClick={() => this.setState({ limitValue: this.props.totalRecords || -1 })}
                                >
                                    All
                                </button>
                            </div>
                        </div>

                        <div style={styles.checkboxRow}>
                            <label style={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={this.state.saveAsDefault}
                                    onChange={(e) => this.setState({ saveAsDefault: e.target.checked })}
                                    style={{ marginRight: "8px", cursor: "pointer" }}
                                />
                                Save as default SQLite setting (`sqlite.recordsPerPage`)
                            </label>
                        </div>
                    </div>

                    <div style={styles.footer}>
                        <button type="button" style={styles.cancelBtn} onClick={this.props.onClose}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            style={styles.applyBtn}
                            onClick={() => {
                                const finalLimit = this.state.limitValue <= 0 ? (this.props.totalRecords || 1000000) : this.state.limitValue;
                                this.props.onApply(finalLimit, this.state.saveAsDefault);
                                this.props.onClose();
                            }}
                        >
                            Apply
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

export default ConfigModal;

const styles: { [prop: string]: React.CSSProperties } = {
    overlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
    },
    modal: {
        backgroundColor: "var(--vscode-editorWidget-background, #252526)",
        border: "1px solid var(--vscode-editorWidget-border, #454545)",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
        borderRadius: "4px",
        width: "340px",
        maxWidth: "90vw",
        color: "var(--vscode-editor-foreground, #cccccc)",
        fontFamily: "var(--vscode-editor-font-family, sans-serif)",
        fontSize: "12px",
        overflow: "hidden",
    },
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        borderBottom: "1px solid var(--vscode-editorGroupHeader-tabsBorder, rgba(128, 128, 128, 0.2))",
        fontWeight: 600,
        fontSize: "13px",
    },
    title: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
    },
    closeIcon: {
        cursor: "pointer",
        fontSize: "16px",
        lineHeight: "16px",
        opacity: 0.7,
        padding: "2px 4px",
    },
    body: {
        padding: "14px",
    },
    label: {
        display: "block",
        marginBottom: "6px",
        color: "var(--vscode-editor-foreground, #cccccc)",
    },
    inputRow: {
        marginBottom: "12px",
    },
    input: {
        width: "100%",
        boxSizing: "border-box",
        padding: "6px 8px",
        backgroundColor: "var(--vscode-input-background, #3c3c3c)",
        color: "var(--vscode-input-foreground, #cccccc)",
        border: "1px solid var(--vscode-input-border, #3c3c3c)",
        borderRadius: "2px",
        outline: "none",
        fontSize: "13px",
    },
    presetSection: {
        marginBottom: "14px",
    },
    presetLabel: {
        fontSize: "11px",
        color: "var(--vscode-descriptionForeground, #888888)",
        marginBottom: "6px",
        display: "block",
    },
    presetRow: {
        display: "flex",
        flexWrap: "wrap",
        gap: "6px",
    },
    presetBtn: {
        padding: "3px 8px",
        fontSize: "11px",
        backgroundColor: "rgba(128, 128, 128, 0.15)",
        color: "var(--vscode-editor-foreground, #cccccc)",
        border: "1px solid rgba(128, 128, 128, 0.25)",
        borderRadius: "3px",
        cursor: "pointer",
        outline: "none",
    },
    presetBtnActive: {
        backgroundColor: "var(--vscode-button-background, #0e639c)",
        color: "var(--vscode-button-foreground, #ffffff)",
        borderColor: "var(--vscode-button-background, #0e639c)",
    },
    checkboxRow: {
        marginTop: "10px",
    },
    checkboxLabel: {
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
        fontSize: "11px",
        color: "var(--vscode-descriptionForeground, #999999)",
    },
    footer: {
        display: "flex",
        justifyContent: "flex-end",
        gap: "8px",
        padding: "10px 14px",
        borderTop: "1px solid var(--vscode-editorGroupHeader-tabsBorder, rgba(128, 128, 128, 0.2))",
        backgroundColor: "rgba(0, 0, 0, 0.1)",
    },
    cancelBtn: {
        padding: "5px 12px",
        fontSize: "12px",
        backgroundColor: "transparent",
        color: "var(--vscode-editor-foreground, #cccccc)",
        border: "1px solid rgba(128, 128, 128, 0.3)",
        borderRadius: "2px",
        cursor: "pointer",
    },
    applyBtn: {
        padding: "5px 14px",
        fontSize: "12px",
        backgroundColor: "var(--vscode-button-background, #0e639c)",
        color: "var(--vscode-button-foreground, #ffffff)",
        border: "none",
        borderRadius: "2px",
        cursor: "pointer",
        fontWeight: 500,
    },
};
