import React from "react";
import PropTypes from "prop-types";
import DynamicComponent from "@/components/DynamicComponent";
import Navbar from "./Navbar";

import "./index.less";

export default function ApplicationLayout({ children }) {
  return (
    <React.Fragment>
      <DynamicComponent name="ApplicationWrapper">
        <DynamicComponent name="ApplicationNavbar">
          <Navbar />
        </DynamicComponent>
        <div className="application-layout-content">{children}</div>
      </DynamicComponent>
    </React.Fragment>
  );
}

ApplicationLayout.propTypes = {
  children: PropTypes.node,
};

ApplicationLayout.defaultProps = {
  children: null,
};
