import * as React from "react";

const Gear: React.FunctionComponent<{}> = () => {
    const fgFill = "var(--vscode-editor-foreground)";
    return (
        <svg viewBox="0 0 16 16" transform="translate(0 2)">
            <path
                id="fg"
                fill={fgFill}
                fillRule="evenodd"
                d="M9.1 4.4L8.6 2H7.4l-.5 2.4-.7.3-2-1.3-.9.8 1.3 2-.2.7-2.4.5v1.2l2.4.5.3.8-1.3 2 .8.8 2-1.3.8.3.4 2.3h1.2l.5-2.4.8-.3 2 1.3.8-.8-1.3-2 .3-.8 2.3-.4V7.4l-2.4-.5-.3-.7 1.3-2-.8-.9-2 1.3-.7-.3zM8 10.5c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5z"
            />
        </svg>
    );
};

export default Gear;
