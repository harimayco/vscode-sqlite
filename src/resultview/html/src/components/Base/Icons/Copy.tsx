import * as React from "react";

interface Props {
    color?: string;
}

const Copy: React.FunctionComponent<Props> = (props) => {
    const fgFill = props.color || "var(--vscode-editor-foreground, #cccccc)";
    return (
        <svg viewBox="0 0 16 16" width="14" height="14" style={{ display: "inline-block", verticalAlign: "middle" }}>
            <path
                fill={fgFill}
                fillRule="evenodd"
                d="M4 4h7V2H4a1 1 0 0 0-1 1v7h1V4zm8 2H6a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1zm0 8H6V7h6v7z"
            />
        </svg>
    );
};

export default Copy;
