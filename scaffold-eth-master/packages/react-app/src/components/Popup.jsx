
import React from "react";

export default function Popup({
    handleClose,
    content
}) {
    return (
        <div className="popup-box">
            <div className="box">
                <span className="close-icon" onClick={handleClose}>x</span>
                {content}
            </div>
        </div>
    );
}