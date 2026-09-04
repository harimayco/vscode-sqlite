import * as React from "react";

const ExportSql: React.FunctionComponent<{}> = () => {
    const fgFill = "var(--vscode-editor-foreground)";
    const actionFill = "var(--vscode-list-highlightForeground)";
    return (
        <svg viewBox="0 0 16 16">
            <path id="fg" fill={fgFill} d="M8 7.3v5.2c0 .8 1.6 1.5 3.5 1.5s3.5-.7 3.5-1.5V7.3c0-.8-1.6-1.5-3.5-1.5S8 6.5 8 7.3zm1 .1c.4-.3 1.3-.5 2.5-.5s2.1.2 2.5.5c-.4.3-1.3.5-2.5.5s-2.1-.2-2.5-.5zm0 2.1c.4-.3 1.3-.5 2.5-.5s2.1.2 2.5.5v.5c-.5.4-1.4.6-2.5.6s-2-.2-2.5-.6V9.5zm0 2.2c.4-.3 1.3-.5 2.5-.5s2.1.2 2.5.5v.5c-.5.4-1.4.6-2.5.6s-2-.2-2.5-.6v-.5z"/>
            <path id="action" fill={actionFill} d="M8 4L5 7H3l2-2H1V3h4L3 1h2l3 3z"/>
        </svg>
    );
};

export default ExportSql;
