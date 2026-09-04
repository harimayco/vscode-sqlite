import * as React from "react";
import { merge } from '../../utils';

interface Props {
    title?: string;
    width?: string | number;
    height?: string | number;
    background?: string;
    disabled?: boolean;
    onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

const Button: React.FunctionComponent<Props> = (props) => {
    const style = merge(styles.button, {
        width: props.width || 24,
        height: props.height || props.width,
        background: props.background || "transparent",
        opacity: props.disabled ? 0.35 : 1,
        cursor: props.disabled ? "default" : "pointer",
        pointerEvents: props.disabled ? "none" : "auto"
    });
    return (
        <button
            type="button"
            style={style}
            title={props.title}
            disabled={props.disabled}
            onClick={props.disabled ? undefined : props.onClick}
        >
            {props.children}
        </button>
    );
};

export default Button;

const styles: {button: React.CSSProperties} = {
    button: {
        width: 24,
        height: 24,
        border: "none",
        padding: "2px",
        cursor: "pointer",
        margin: "2px 2px"
    }
};