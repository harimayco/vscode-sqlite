import * as React from "react";
import { Button, Icons } from './Base';

interface Props {
    onClick?: () => void;
}

const BtnExportSql: React.FunctionComponent<Props> = (props) => {
    return (
        <Button title="Export to INSERT INTO SQL" onClick={props.onClick}>
            <Icons.ExportSql/>
        </Button>
    );
};

export default BtnExportSql;
