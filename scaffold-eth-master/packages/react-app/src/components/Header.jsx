import { PageHeader } from "antd";
import React from "react";

// displays a page header

export default function Header() {
  return (
    <a href="https://github.com/enie123/decentrapay" target="_blank" rel="noopener noreferrer">
      <PageHeader
        title="🏗 Decentrapay"
        subTitle="automated bill payment with DeFi income"
        style={{ cursor: "pointer" }}
      />
    </a>
  );
}
