import * as React from "react";

interface Props {
    offset: number;
    columns: string[];
    rows: (string | number)[][];
}

const Table: React.FunctionComponent<Props> = (props) => {
    return (
        <div style={styles.container}>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.headColRowNumber}>#</th>
                        {props.columns.map((col, i) => (
                            <th key={i} style={styles.headCol}>{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {props.rows.map((row, i) => (
                        <tr key={i}>
                            <td style={styles.bodyColRowNumber}>{props.offset + i + 1}</td>
                            {row.map((col, j) => (
                                <td key={j} style={styles.bodyCol}>{col}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Table;

const styles: {[prop: string]: React.CSSProperties} = {
    container: {
        overflow: "auto",
        maxHeight: "calc(100vh - 85px)",
        marginBottom: "4px"
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
        whiteSpace: "pre"
    },
    bodyCol: {
        border: "1px solid var(--vscode-foreground)",
        padding: "6px",
        whiteSpace: "pre"
    }
};