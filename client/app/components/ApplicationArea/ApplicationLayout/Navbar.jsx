import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import cx from "classnames";
import { first, includes } from "lodash";
import Link from "@/components/Link";
import HelpTrigger from "@/components/HelpTrigger";
import CreateDashboardDialog from "@/components/dashboards/CreateDashboardDialog";
import { useCurrentRoute } from "@/components/ApplicationArea/Router";
import { Auth, currentUser } from "@/services/auth";
import location from "@/services/location";
import settingsMenu from "@/services/settingsMenu";
import logoUrl from "@/assets/images/redash_icon_small.png";

import NavbarDropdown from "./NavbarDropdown";
import NavbarIcon from "./NavbarIcon";
import VersionInfo from "./VersionInfo";

import "./Navbar.less";

const HELP_URL = "https://redash.io/help";

const SECTION_ROUTES = {
  dashboards: [
    "Dashboards.List",
    "Dashboards.Favorites",
    "Dashboards.My",
    "Dashboards.ViewOrEdit",
    "Dashboards.LegacyViewOrEdit",
  ],
  queries: [
    "Queries.List",
    "Queries.Favorites",
    "Queries.Archived",
    "Queries.My",
    "Queries.View",
    "Queries.New",
    "Queries.Edit",
  ],
  alerts: ["Alerts.List", "Alerts.New", "Alerts.View", "Alerts.Edit"],
};

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useActiveSection() {
  const currentRoute = useCurrentRoute();
  const routeId = currentRoute ? currentRoute.id : null;

  return useMemo(() => {
    if (includes(SECTION_ROUTES.dashboards, routeId)) {
      return "dashboards";
    }
    if (includes(SECTION_ROUTES.queries, routeId)) {
      return "queries";
    }
    if (includes(SECTION_ROUTES.alerts, routeId)) {
      return "alerts";
    }
    if (settingsMenu.getActiveItem(location.path)) {
      return "settings";
    }
    return null;
  }, [routeId]);
}

function getSections() {
  return [
    currentUser.hasPermission("list_dashboards") && { key: "dashboards", title: "Dashboards", href: "dashboards" },
    currentUser.hasPermission("view_query") && { key: "queries", title: "Queries", href: "queries" },
    currentUser.hasPermission("list_alerts") && { key: "alerts", title: "Alerts", href: "alerts" },
  ].filter(Boolean);
}

const SECTION_TITLES = { dashboards: "Dashboards", queries: "Queries", alerts: "Alerts", settings: "Settings" };

function CreateMenu() {
  const canCreateQuery = currentUser.hasPermission("create_query");
  const canCreateDashboard = currentUser.hasPermission("create_dashboard");
  const canCreateAlert = currentUser.hasPermission("list_alerts");

  if (!canCreateQuery && !canCreateDashboard && !canCreateAlert) {
    return null;
  }

  return (
    <NavbarDropdown
      align="right"
      className="app-navbar-create"
      buttonClassName="app-navbar-create-button"
      buttonProps={{ "aria-label": "Create", "data-test": "CreateButton" }}
      buttonContent={
        <>
          <NavbarIcon name="plus" />
          <span className="app-navbar-create-label">Create</span>
          <span className="app-navbar-create-label app-navbar-create-caret">
            <NavbarIcon name="chevronDown" size={13} />
          </span>
        </>
      }
    >
      {canCreateQuery && (
        <NavbarDropdown.Item href="queries/new" data-test="CreateQueryMenuItem">
          New Query
        </NavbarDropdown.Item>
      )}
      {canCreateDashboard && (
        <NavbarDropdown.Item data-test="CreateDashboardMenuItem" onClick={() => CreateDashboardDialog.showModal()}>
          New Dashboard
        </NavbarDropdown.Item>
      )}
      {canCreateAlert && (
        <NavbarDropdown.Item href="alerts/new" data-test="CreateAlertMenuItem">
          New Alert
        </NavbarDropdown.Item>
      )}
    </NavbarDropdown>
  );
}

function Avatar({ size }) {
  return (
    <img
      className="app-navbar-avatar"
      src={currentUser.profile_image_url}
      alt=""
      width={size}
      height={size}
      aria-hidden="true"
    />
  );
}

Avatar.propTypes = {
  size: PropTypes.number.isRequired,
};

function UserMenu() {
  return (
    <NavbarDropdown
      align="right"
      className="app-navbar-user-menu"
      buttonClassName="app-navbar-avatar-button"
      buttonProps={{ "aria-label": "Account menu", "data-test": "ProfileDropdown" }}
      buttonContent={<Avatar size={30} />}
    >
      <div className="app-navbar-dropdown-account">
        <div className="app-navbar-dropdown-account-name">{currentUser.name}</div>
        <div className="app-navbar-dropdown-account-email">{currentUser.email}</div>
      </div>
      <NavbarDropdown.Divider />
      <NavbarDropdown.Item href="users/me">Profile</NavbarDropdown.Item>
      {currentUser.hasPermission("super_admin") && (
        <NavbarDropdown.Item href="admin/status">System Status</NavbarDropdown.Item>
      )}
      {/* The Help button leaves the bar below 1024px and moves here */}
      <NavbarDropdown.Item href={HELP_URL} target="_blank" className="app-navbar-dropdown-item--compact-only">
        Help
      </NavbarDropdown.Item>
      <NavbarDropdown.Divider />
      <NavbarDropdown.Item data-test="LogOutButton" onClick={() => Auth.logout()}>
        Log out
      </NavbarDropdown.Item>
      <NavbarDropdown.Divider />
      <div className="app-navbar-dropdown-version">
        <VersionInfo />
      </div>
    </NavbarDropdown>
  );
}

function PhoneMenuItem({ icon, active, children, ...props }) {
  const className = cx("app-navbar-phone-menu-item", { "app-navbar-phone-menu-item--active": active });
  const content = (
    <>
      <NavbarIcon name={icon} size={20} />
      {children}
    </>
  );

  if (props.href) {
    return (
      <Link className={className} aria-current={active ? "page" : undefined} {...props}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={className} {...props}>
      {content}
    </button>
  );
}

PhoneMenuItem.propTypes = {
  icon: PropTypes.string.isRequired,
  active: PropTypes.bool,
  href: PropTypes.string,
  children: PropTypes.node,
};

PhoneMenuItem.defaultProps = {
  active: false,
  href: null,
  children: null,
};

function PhoneMenu({ sections, activeSection, settingsPath, onClose, toggleButtonRef }) {
  const panelRef = useRef();

  useEffect(() => {
    const panel = panelRef.current;
    const firstItem = panel && panel.querySelector(FOCUSABLE_SELECTOR);
    if (firstItem) {
      firstItem.focus();
    }

    // Keep focus in the panel (and the toggle button, so the menu can be closed) while it's open
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose(true);
        return;
      }
      if (event.key !== "Tab" || !panel) {
        return;
      }
      const focusable = [toggleButtonRef.current, ...panel.querySelectorAll(FOCUSABLE_SELECTOR)].filter(Boolean);
      const firstElement = first(focusable);
      const lastElement = focusable[focusable.length - 1];
      if (!includes(focusable, document.activeElement)) {
        event.preventDefault();
        firstElement.focus();
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, toggleButtonRef]);

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="app-navbar-phone-backdrop" onClick={() => onClose(true)} />
      <div className="app-navbar-phone-menu" id="app-navbar-phone-menu" ref={panelRef}>
        {sections.map((section) => (
          <PhoneMenuItem
            key={section.key}
            href={section.href}
            icon={section.key}
            active={activeSection === section.key}
          >
            {section.title}
          </PhoneMenuItem>
        ))}

        <div className="app-navbar-phone-menu-divider" role="separator" />

        {settingsPath && (
          <PhoneMenuItem href={settingsPath} icon="settings" active={activeSection === "settings"}>
            Settings
          </PhoneMenuItem>
        )}
        <PhoneMenuItem href={HELP_URL} target="_blank" rel="noopener noreferrer" icon="help">
          Help
        </PhoneMenuItem>

        <div className="app-navbar-phone-menu-divider" role="separator" />

        <div className="app-navbar-phone-menu-account">
          <Avatar size={36} />
          <div className="app-navbar-phone-menu-account-details">
            <div className="app-navbar-phone-menu-account-name">{currentUser.name}</div>
            <div className="app-navbar-phone-menu-account-email">{currentUser.email}</div>
          </div>
        </div>
        <PhoneMenuItem href="users/me" icon="user">
          Profile
        </PhoneMenuItem>
        {currentUser.hasPermission("super_admin") && (
          <PhoneMenuItem href="admin/status" icon="status">
            System Status
          </PhoneMenuItem>
        )}
        <PhoneMenuItem icon="logout" onClick={() => Auth.logout()}>
          Log out
        </PhoneMenuItem>
      </div>
    </>
  );
}

PhoneMenu.propTypes = {
  sections: PropTypes.arrayOf(PropTypes.object).isRequired,
  activeSection: PropTypes.string,
  settingsPath: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  toggleButtonRef: PropTypes.object.isRequired,
};

PhoneMenu.defaultProps = {
  activeSection: null,
  settingsPath: null,
};

export default function Navbar() {
  const currentRoute = useCurrentRoute();
  const routeKey = currentRoute ? currentRoute.key : null;
  const activeSection = useActiveSection();
  const sections = getSections();
  const firstSettingsTab = first(settingsMenu.getAvailableItems());
  const settingsPath = firstSettingsTab ? firstSettingsTab.path : null;

  const [isPhoneMenuOpen, setIsPhoneMenuOpen] = useState(false);
  const toggleButtonRef = useRef();

  const closePhoneMenu = useCallback((returnFocus = false) => {
    setIsPhoneMenuOpen(false);
    if (returnFocus && toggleButtonRef.current) {
      toggleButtonRef.current.focus();
    }
  }, []);

  // Close the phone menu on navigation
  useEffect(() => {
    closePhoneMenu();
  }, [routeKey, closePhoneMenu]);

  // ...and when the window grows past the phone breakpoint
  useEffect(() => {
    if (!isPhoneMenuOpen || !window.matchMedia) {
      return;
    }
    const query = window.matchMedia("(min-width: 768px)");
    const handleChange = () => query.matches && closePhoneMenu();
    query.addListener(handleChange);
    return () => query.removeListener(handleChange);
  }, [isPhoneMenuOpen, closePhoneMenu]);

  return (
    <nav className="app-navbar" aria-label="Main">
      <Link href="./" className="app-navbar-brand" aria-label="Redash home">
        <img src={logoUrl} alt="" width="28" height="28" />
        <span className="app-navbar-wordmark">Redash</span>
      </Link>

      <div className="app-navbar-sections">
        {sections.map((section) => (
          <Link
            key={section.key}
            href={section.href}
            className={cx("app-navbar-section", { "app-navbar-section--active": activeSection === section.key })}
            aria-current={activeSection === section.key ? "page" : undefined}
          >
            {section.title}
          </Link>
        ))}
      </div>

      <span className="app-navbar-title">{SECTION_TITLES[activeSection] || "Redash"}</span>

      <div className="app-navbar-spacer" />

      <CreateMenu />

      <div className="app-navbar-divider" aria-hidden="true" />

      <HelpTrigger type="HOME" showTooltip={false} className="app-navbar-icon-button app-navbar-help">
        <NavbarIcon name="help" size={17} />
        <span className="sr-only">Help</span>
      </HelpTrigger>

      {settingsPath && (
        <Link
          href={settingsPath}
          className={cx("app-navbar-icon-button app-navbar-settings", {
            "app-navbar-icon-button--active": activeSection === "settings",
          })}
          aria-label="Settings"
          title="Settings"
          aria-current={activeSection === "settings" ? "page" : undefined}
          data-test="SettingsLink"
        >
          <NavbarIcon name="settings" size={17} />
        </Link>
      )}

      <UserMenu />

      <button
        type="button"
        ref={toggleButtonRef}
        className={cx("app-navbar-icon-button app-navbar-phone-menu-toggle", {
          "app-navbar-icon-button--active": isPhoneMenuOpen,
        })}
        aria-label={isPhoneMenuOpen ? "Close menu" : "Open menu"}
        aria-expanded={isPhoneMenuOpen}
        aria-controls={isPhoneMenuOpen ? "app-navbar-phone-menu" : undefined}
        onClick={() => (isPhoneMenuOpen ? closePhoneMenu(true) : setIsPhoneMenuOpen(true))}
      >
        <NavbarIcon name={isPhoneMenuOpen ? "close" : "menu"} size={20} />
      </button>

      {isPhoneMenuOpen && (
        <PhoneMenu
          sections={sections}
          activeSection={activeSection}
          settingsPath={settingsPath}
          onClose={closePhoneMenu}
          toggleButtonRef={toggleButtonRef}
        />
      )}
    </nav>
  );
}
