import './settingsBtn.css';

export default function SettingsBtn({ openSettingsPage }) {
  return (
    <button
      className="dropdown-toggle nav-icon-button"
      type="button"
      aria-label="Settings"
      data-tooltip="Settings"
      onClick={openSettingsPage}
    >
      <span role="img" aria-hidden="true">⚙️</span>
    </button>
  );
}
