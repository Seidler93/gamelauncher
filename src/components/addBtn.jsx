import { useEffect, useRef, useState } from "react";
import "./settingsBtn.css";
import { useAppContext } from "../context/AppContext";

export default function AddBtn() {
  const { openAddGamesModal, openAddEmulatorModal } = useAppContext();
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="dropdown" ref={ref}>
      <button
        className="dropdown-toggle nav-icon-button"
        type="button"
        aria-label="Add"
        data-tooltip="Add"
        onClick={() => setOpen(!open)}
      >
        +
      </button>
      {open && (
        <ul className="dropdown-menu">
          <li onClick={() => { setOpen(false); openAddGamesModal(); }}>Add Game Folder</li>
          <li onClick={() => { setOpen(false); openAddEmulatorModal(); }}>Add Launcher Folder</li>
        </ul>
      )}
    </div>
  );
}
