import React, { useState, useRef, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import cx from "classnames";
import { first, includes } from "lodash";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Activity,
  Bell,
  ChevronDown,
  CircleHelp,
  LogOut,
  Menu,
  Monitor,
  Plus,
  Settings,
  SquareTerminal,
  User,
  X,
} from "lucide-react";
import Link from "@/components/Link";
import HelpTrigger from "@/components/HelpTrigger";
import CreateDashboardDialog from "@/components/dashboards/CreateDashboardDialog";
import { useCurrentRoute } from "@/components/ApplicationArea/Router";
import { Auth, currentUser } from "@/services/auth";
import location from "@/services/location";
import settingsMenu from "@/services/settingsMenu";
import logoUrl from "@/assets/images/redash_icon_small.png";

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
    currentUser.hasPermission("list_dashboards") && {
      key: "dashboards",
      title: "Dashboards",
      href: "dashboards",
      Icon: Monitor,
    },
    currentUser.hasPermission("view_query") && {
      key: "queries",
      title: "Queries",
      href: "queries",
      Icon: SquareTerminal,
    },
    currentUser.hasPermission("list_alerts") && { key: "alerts", title: "Alerts", href: "alerts", Icon: Bell },
  ].filter(Boolean);
}

const SECTION_TITLES = { dashboards: "Dashboards", queries: "Queries", alerts: "Alerts", settings: "Settings" };

// Line icons matching the design: Lucide at a 1.8px stroke
function Icon({ component: IconComponent, size }) {
  return <IconComponent className="app-navbar-icon" size={size} strokeWidth={1.8} aria-hidden="true" />;
}

Icon.propTypes = {
  component: PropTypes.elementType.isRequired,
  size: PropTypes.number,
};

Icon.defaultProps = {
  size: 15,
};

// Menu items render plain elements because Radix needs to hold a ref to them
function MenuItem({ href, target, onSelect, className, children, ...props }) {
  return (
    <DropdownMenu.Item asChild onSelect={onSelect} className={cx("app-navbar-dropdown-item", className)}>
      {href ? (
        <a href={href} target={target} rel={target === "_blank" ? "noopener noreferrer" : undefined} {...props}>
          {children}
        </a>
      ) : (
        <button type="button" {...props}>
          {children}
        </button>
      )}
    </DropdownMenu.Item>
  );
}

MenuItem.propTypes = {
  href: PropTypes.string,
  target: PropTypes.string,
  onSelect: PropTypes.func,
  className: PropTypes.string,
  children: PropTypes.node,
};

MenuItem.defaultProps = {
  href: undefined,
  target: undefined,
  onSelect: undefined,
  className: undefined,
  children: null,
};

function MenuContent({ children, ...props }) {
  return (
    <DropdownMenu.Content className="app-navbar-dropdown-menu" align="end" sideOffset={8} loop {...props}>
      {children}
    </DropdownMenu.Content>
  );
}

MenuContent.propTypes = {
  children: PropTypes.node,
};

MenuContent.defaultProps = {
  children: null,
};

function CreateMenu() {
  // Opening the New Dashboard dialog moves focus into it, so don't pull focus back to the trigger
  const keepFocusRef = useRef(false);
  const canCreateQuery = currentUser.hasPermission("create_query");
  const canCreateDashboard = currentUser.hasPermission("create_dashboard");
  const canCreateAlert = currentUser.hasPermission("list_alerts");

  if (!canCreateQuery && !canCreateDashboard && !canCreateAlert) {
    return null;
  }

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="app-navbar-create-button" aria-label="Create" data-test="CreateButton">
          <Icon component={Plus} />
          <span className="app-navbar-create-label">Create</span>
          <span className="app-navbar-create-label">
            <Icon component={ChevronDown} size={13} />
          </span>
        </button>
      </DropdownMenu.Trigger>
      <MenuContent
        onCloseAutoFocus={(event) => {
          if (keepFocusRef.current) {
            keepFocusRef.current = false;
            event.preventDefault();
          }
        }}
      >
        {canCreateQuery && (
          <MenuItem href="queries/new" data-test="CreateQueryMenuItem">
            New Query
          </MenuItem>
        )}
        {canCreateDashboard && (
          <MenuItem
            data-test="CreateDashboardMenuItem"
            onSelect={() => {
              keepFocusRef.current = true;
              CreateDashboardDialog.showModal();
            }}
          >
            New Dashboard
          </MenuItem>
        )}
        {canCreateAlert && (
          <MenuItem href="alerts/new" data-test="CreateAlertMenuItem">
            New Alert
          </MenuItem>
        )}
      </MenuContent>
    </DropdownMenu.Root>
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
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="app-navbar-avatar-button"
          aria-label="Account menu"
          data-test="ProfileDropdown"
        >
          <Avatar size={30} />
        </button>
      </DropdownMenu.Trigger>
      <MenuContent>
        <div className="app-navbar-dropdown-account">
          <div className="app-navbar-dropdown-account-name">{currentUser.name}</div>
          <div className="app-navbar-dropdown-account-email">{currentUser.email}</div>
        </div>
        <DropdownMenu.Separator className="app-navbar-dropdown-divider" />
        <MenuItem href="users/me">Profile</MenuItem>
        {currentUser.hasPermission("super_admin") && <MenuItem href="admin/status">System Status</MenuItem>}
        {/* The Help button leaves the bar below 1024px and moves here */}
        <MenuItem href={HELP_URL} target="_blank" className="app-navbar-dropdown-item--compact-only">
          Help
        </MenuItem>
        <DropdownMenu.Separator className="app-navbar-dropdown-divider" />
        <MenuItem data-test="LogOutButton" onSelect={() => Auth.logout()}>
          Log out
        </MenuItem>
        <DropdownMenu.Separator className="app-navbar-dropdown-divider" />
        <div className="app-navbar-dropdown-version">
          <VersionInfo />
        </div>
      </MenuContent>
    </DropdownMenu.Root>
  );
}

function PhoneMenuItem({ icon, active, children, ...props }) {
  const className = cx("app-navbar-phone-menu-item", { "app-navbar-phone-menu-item--active": active });
  const content = (
    <>
      <Icon component={icon} size={20} />
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
  icon: PropTypes.elementType.isRequired,
  active: PropTypes.bool,
  href: PropTypes.string,
  children: PropTypes.node,
};

PhoneMenuItem.defaultProps = {
  active: false,
  href: null,
  children: null,
};

// The panel is a modal dialog: Radix traps focus, closes it on Esc or a backdrop tap, and returns focus to the toggle
function PhoneMenu({ sections, activeSection, settingsPath }) {
  const contentRef = useRef();

  return (
    <>
      <Dialog.Overlay className="app-navbar-phone-backdrop" />
      <Dialog.Content
        ref={contentRef}
        className="app-navbar-phone-menu"
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          // Start on the first link rather than the close button
          event.preventDefault();
          const firstLink = contentRef.current && contentRef.current.querySelector("a[href]");
          if (firstLink) {
            firstLink.focus();
          }
        }}
      >
        <Dialog.Title className="sr-only">Menu</Dialog.Title>
        {/* Sits over the bar's menu button, so the bar reads ✕ while the panel is open */}
        <Dialog.Close asChild>
          <button
            type="button"
            className="app-navbar-icon-button app-navbar-icon-button--active app-navbar-phone-menu-close"
            aria-label="Close menu"
          >
            <Icon component={X} size={20} />
          </button>
        </Dialog.Close>

        <div className="app-navbar-phone-menu-items">
          {sections.map((section) => (
            <PhoneMenuItem
              key={section.key}
              href={section.href}
              icon={section.Icon}
              active={activeSection === section.key}
            >
              {section.title}
            </PhoneMenuItem>
          ))}

          <div className="app-navbar-phone-menu-divider" role="separator" />

          {settingsPath && (
            <PhoneMenuItem href={settingsPath} icon={Settings} active={activeSection === "settings"}>
              Settings
            </PhoneMenuItem>
          )}
          <PhoneMenuItem href={HELP_URL} target="_blank" rel="noopener noreferrer" icon={CircleHelp}>
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
          <PhoneMenuItem href="users/me" icon={User}>
            Profile
          </PhoneMenuItem>
          {currentUser.hasPermission("super_admin") && (
            <PhoneMenuItem href="admin/status" icon={Activity}>
              System Status
            </PhoneMenuItem>
          )}
          <PhoneMenuItem icon={LogOut} onClick={() => Auth.logout()}>
            Log out
          </PhoneMenuItem>
        </div>
      </Dialog.Content>
    </>
  );
}

PhoneMenu.propTypes = {
  sections: PropTypes.arrayOf(PropTypes.object).isRequired,
  activeSection: PropTypes.string,
  settingsPath: PropTypes.string,
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

  // Close the phone menu on navigation
  useEffect(() => {
    setIsPhoneMenuOpen(false);
  }, [routeKey]);

  // ...and when the window grows past the phone breakpoint
  useEffect(() => {
    if (!isPhoneMenuOpen || !window.matchMedia) {
      return;
    }
    const query = window.matchMedia("(min-width: 768px)");
    const handleChange = () => query.matches && setIsPhoneMenuOpen(false);
    query.addListener(handleChange);
    return () => query.removeListener(handleChange);
  }, [isPhoneMenuOpen]);

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
        <Icon component={CircleHelp} size={17} />
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
          <Icon component={Settings} size={17} />
        </Link>
      )}

      <UserMenu />

      <Dialog.Root open={isPhoneMenuOpen} onOpenChange={setIsPhoneMenuOpen}>
        <Dialog.Trigger asChild>
          <button type="button" className="app-navbar-icon-button app-navbar-phone-menu-toggle" aria-label="Open menu">
            <Icon component={Menu} size={20} />
          </button>
        </Dialog.Trigger>
        <PhoneMenu sections={sections} activeSection={activeSection} settingsPath={settingsPath} />
      </Dialog.Root>
    </nav>
  );
}
