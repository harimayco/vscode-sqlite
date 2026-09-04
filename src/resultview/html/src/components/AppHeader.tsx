import * as React from "react";
import { Header } from "./Base";
import BtnExportJson from "./BtnExportJson";
import BtnExportHtml from "./BtnExportHtml";
import BtnExportCsv from "./BtnExportCsv";
import BtnExportSql from "./BtnExportSql";

interface Props {
    onExport: (format: "csv"|"html"|"json"|"sql") => void;
}

const AppHeader: React.FunctionComponent<Props> = (props) => {
    return (
        <Header style={"transparent"}>
            <div/>
            <div>
                <BtnExportCsv onClick={() => props.onExport("csv")}/>
                <BtnExportHtml onClick={() => props.onExport("html")}/>
                <BtnExportJson onClick={() => props.onExport("json")}/>
                <BtnExportSql onClick={() => props.onExport("sql")}/>
            </div>
        </Header>
    );
};

export default AppHeader;