import * as React from "react";

interface Props {
    filled?: boolean;
}

const Filter: React.FunctionComponent<Props> = (props) => {
    const fgFill = props.filled
        ? "var(--vscode-focusBorder, #007acc)"
        : "var(--vscode-editor-foreground, #cccccc)";
    return (
        <svg viewBox="0 0 16 16" width="14" height="14" style={{ display: "inline-block", verticalAlign: "middle" }}>
            <path
                fill={fgFill}
                fillRule="evenodd"
                d="M15 2v1.5l-5.5 5.5v5.5l-3-1.5V9L1 3.5V2h14zm-6.2 6.5L13.6 4H2.4l4.8 4.5v3.6l1.6.8V8.5z"
            />
        </svg>
    );
};

export default Filter;
