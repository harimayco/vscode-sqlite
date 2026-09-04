import * as React from "react";

const ArrowFirst: React.FunctionComponent<{}> = () => {
    const fgFill = "var(--vscode-editor-foreground)";
    return (
        <svg viewBox="0 0 16 16" transform="translate(0 2)">
            <path
                id="fg"
                fill={fgFill}
                fillRule="evenodd"
                d="M2 3h1.5v10H2V3zm7 0L10.5 4.5 6.75 8 10.5 11.5 9 13l-5-5 5-5z"
            />
        </svg>
    );
};

export default ArrowFirst;
