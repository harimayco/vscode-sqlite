import * as React from "react";
import { Icons } from "./Base";

interface Props {
    value: string;
    onCopy?: (text: string) => void;
}

const Statement: React.FunctionComponent<Props> = (props) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(props.value).catch(() => {});
        }
        if (props.onCopy) {
            props.onCopy(props.value);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={styles.statement}>
            <div style={styles.codeWrapper}>
                <code style={styles.code}>{props.value}</code>
            </div>
            <button
                type="button"
                style={styles.copyBtn}
                onClick={handleCopy}
                title="Copy SQL Query to Clipboard"
            >
                <Icons.Copy />
                <span style={{ marginLeft: "4px", fontSize: "11px" }}>
                    {copied ? "Copied!" : "Copy SQL"}
                </span>
            </button>
        </div>
    );
};

export default Statement;

const styles: { [prop: string]: React.CSSProperties } = {
    statement: {
        width: "100%",
        borderRadius: "2px",
        margin: "2px",
        padding: "6px 8px",
        backgroundColor: "rgba(127, 127, 127, 0.25)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "8px",
        boxSizing: "border-box",
    },
    codeWrapper: {
        flex: 1,
        whiteSpace: "pre-line",
        overflowX: "auto",
    },
    code: {
        color: "var(--vscode-editor-foreground)",
        fontFamily: "var(--vscode-editor-font-family)",
        fontSize: "var(--vscode-editor-font-size)",
        cursor: "auto",
    },
    copyBtn: {
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        backgroundColor: "var(--vscode-button-secondaryBackground, #3a3d41)",
        color: "var(--vscode-button-secondaryForeground, #ffffff)",
        border: "none",
        borderRadius: "2px",
        cursor: "pointer",
        flexShrink: 0,
        outline: "none",
    }
};