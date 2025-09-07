import React, { useState, useRef, useEffect } from "react";
import './settingsBtn.css'
import { useAppContext } from "../context/AppContext";

export default function SettingsBtn() {
  const { isAddGamesModalOpen, openAddGamesModal, closeAddGamesModal, } = useAppContext();
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const options = ["Add Emulator", "Connect to Steam", "Settings"]

  // Close dropdown on outside click
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
      <button className="dropdown-toggle" onClick={() => setOpen(!open)}>
        <span role="img" aria-label="settings">⚙️</span>
      </button>
      {open && (
        <ul className="dropdown-menu">
          <li onClick={() => openAddGamesModal()}>
            Add Game Folder
          </li>
        </ul>
      )}
    </div>
  );
}
