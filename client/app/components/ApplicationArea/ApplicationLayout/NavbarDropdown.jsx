import React, { useState, useRef, useEffect, useCallback, useContext } from "react";
import PropTypes from "prop-types";
import cx from "classnames";
import { uniqueId } from "lodash";
import Link from "@/components/Link";

const DropdownContext = React.createContext({ close: () => {} });

function getMenuItems(menu) {
  // Items hidden with CSS at the current breakpoint are skipped
  return menu
    ? Array.from(menu.querySelectorAll('[role="menuitem"]')).filter((item) => item.offsetParent !== null)
    : [];
}

function focusMenuItem(menu, index) {
  const items = getMenuItems(menu);
  if (items.length > 0) {
    items[(index + items.length) % items.length].focus();
  }
}

// Menu button with a popup menu. Keyboard: Enter/Space/ArrowDown open it and focus the first item, ArrowUp the last;
// arrows, Home and End move between items; Esc closes it and returns focus to the button; Tab closes it.
export default function NavbarDropdown({ align, className, buttonClassName, buttonContent, buttonProps, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuId] = useState(() => uniqueId("app-navbar-dropdown-"));
  const containerRef = useRef();
  const buttonRef = useRef();
  const menuRef = useRef();
  const focusOnOpenRef = useRef(null);

  const open = useCallback((focusIndex = null) => {
    focusOnOpenRef.current = focusIndex;
    setIsOpen(true);
  }, []);

  const close = useCallback((returnFocus = false) => {
    setIsOpen(false);
    if (returnFocus && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (focusOnOpenRef.current !== null) {
      focusMenuItem(menuRef.current, focusOnOpenRef.current);
      focusOnOpenRef.current = null;
    }

    function handleOutsideClick(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        close();
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOpen, close]);

  const handleButtonKeyDown = (event) => {
    switch (event.key) {
      case "Enter":
      case " ":
        event.preventDefault();
        if (isOpen) {
          close();
        } else {
          open(0);
        }
        break;
      case "ArrowDown":
        event.preventDefault();
        open(0);
        if (isOpen) {
          focusMenuItem(menuRef.current, 0);
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        open(-1);
        if (isOpen) {
          focusMenuItem(menuRef.current, -1);
        }
        break;
      case "Escape":
        if (isOpen) {
          event.stopPropagation();
          close(true);
        }
        break;
      // no default
    }
  };

  const handleMenuKeyDown = (event) => {
    const items = getMenuItems(menuRef.current);
    const index = items.indexOf(document.activeElement);
    switch (event.key) {
      case "ArrowDown":
        focusMenuItem(menuRef.current, index + 1);
        break;
      case "ArrowUp":
        focusMenuItem(menuRef.current, index - 1);
        break;
      case "Home":
        focusMenuItem(menuRef.current, 0);
        break;
      case "End":
        focusMenuItem(menuRef.current, -1);
        break;
      case "Escape":
        event.stopPropagation();
        close(true);
        break;
      case "Tab":
        close();
        return;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <div className={cx("app-navbar-dropdown", className, { "app-navbar-dropdown--open": isOpen })} ref={containerRef}>
      <button
        type="button"
        ref={buttonRef}
        className={buttonClassName}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleButtonKeyDown}
        {...buttonProps}
      >
        {buttonContent}
      </button>
      {isOpen && (
        <DropdownContext.Provider value={{ close }}>
          {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus */}
          <div
            id={menuId}
            ref={menuRef}
            role="menu"
            aria-label={buttonProps["aria-label"]}
            className={cx("app-navbar-dropdown-menu", `app-navbar-dropdown-menu--${align}`)}
            onKeyDown={handleMenuKeyDown}
          >
            {children}
          </div>
        </DropdownContext.Provider>
      )}
    </div>
  );
}

NavbarDropdown.propTypes = {
  align: PropTypes.oneOf(["left", "right"]),
  className: PropTypes.string,
  buttonClassName: PropTypes.string,
  buttonContent: PropTypes.node.isRequired,
  buttonProps: PropTypes.object,
  children: PropTypes.node,
};

NavbarDropdown.defaultProps = {
  align: "left",
  className: null,
  buttonClassName: null,
  buttonProps: {},
  children: null,
};

function NavbarDropdownItem({ href, target, onClick, className, children, ...props }) {
  const { close } = useContext(DropdownContext);
  const itemProps = {
    ...props,
    role: "menuitem",
    tabIndex: -1,
    className: cx("app-navbar-dropdown-item", className),
    onClick: (event) => {
      close();
      if (onClick) {
        onClick(event);
      }
    },
  };

  if (href) {
    return (
      <Link href={href} target={target} rel={target === "_blank" ? "noopener noreferrer" : undefined} {...itemProps}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" {...itemProps}>
      {children}
    </button>
  );
}

NavbarDropdownItem.propTypes = {
  href: PropTypes.string,
  target: PropTypes.string,
  onClick: PropTypes.func,
  className: PropTypes.string,
  children: PropTypes.node,
};

NavbarDropdownItem.defaultProps = {
  href: null,
  target: null,
  onClick: null,
  className: null,
  children: null,
};

function NavbarDropdownDivider({ className }) {
  return <div role="separator" className={cx("app-navbar-dropdown-divider", className)} />;
}

NavbarDropdownDivider.propTypes = {
  className: PropTypes.string,
};

NavbarDropdownDivider.defaultProps = {
  className: null,
};

NavbarDropdown.Item = NavbarDropdownItem;
NavbarDropdown.Divider = NavbarDropdownDivider;
