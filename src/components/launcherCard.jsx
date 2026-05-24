import './launcherCard.css'
import { launchExecutable } from './utils/launchers'
import { useAppContext } from '../context/AppContext';

export default function LauncherCard({ launcher }) {
  const { showToast } = useAppContext();

  const handleLaunch = async () => {
    if (!launcher?.path) return;

    try {
      await launchExecutable(launcher.path);
    } catch (err) {
      console.error("Failed to launch launcher:", err);
      showToast(`Failed to launch ${launcher.name || "launcher"}.`, "error");
    }
  };

  return (
    <button
      type="button"
      className="launcher-card"
      onClick={handleLaunch}
      onDoubleClick={handleLaunch}
      title={launcher.path}
    >
      <div className="launcher-icon" aria-hidden="true">
        {(launcher.name || launcher.platform || "L").charAt(0).toUpperCase()}
      </div>
      <span className="launcher-name">{launcher.name || "Launcher"}</span>
      <span className="launcher-platform">{launcher.platform || "Custom"}</span>
    </button>
  )
}
