import * as React from "react";
import { Button, Icons } from './Base';

interface Props {
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const BtnShowHide: React.FunctionComponent<Props> = (props) => {
    return (
        <Button title="Show / Hide Columns" onClick={props.onClick}>
            <Icons.Eye/>
        </Button>
    );
};

export default BtnShowHide;
