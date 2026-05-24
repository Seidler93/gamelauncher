import './LibraryNav.css'
import SettingsBtn from '../settingsBtn'
import AddBtn from '../addBtn'
import SyncBtn from '../syncBtn'

export default function LibraryNav({
  currentlyDisplayed,
  platformOptions,
  setCurrentlyDisplayed,
  sortMode,
  setSortMode,
  openSettingsPage,
  isSettingsPage,
  openLibraryPage
}) {
  
  return (
    <nav className="library-nav">
      <span className="library-brand">GameLauncher</span>
      <div className="nav-middle">
        <div className="platform-tabs" aria-label="Library platform filters">
          {platformOptions.map((p) => (
            <button
              key={p}
              type="button"
              className={!isSettingsPage && p === currentlyDisplayed ? "active" : ""}
              aria-pressed={!isSettingsPage && p === currentlyDisplayed}
              onClick={() => {
                setCurrentlyDisplayed(p);
                openLibraryPage();
              }}
            >
              {p}
            </button>
          ))}
        </div>
        <label className="filter-control" title="Sort library" aria-label="Sort library">
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
            <option value="title-asc">Name A-Z</option>
            <option value="title-desc">Name Z-A</option>
            <option value="platform">Platform</option>
            <option value="genre">Genre</option>
            <option value="recently-added">Recently Added</option>
            <option value="last-played">Last Played</option>
            <option value="playtime-desc">Most Played</option>
            <option value="release-date-desc">Release Date Newest</option>
            <option value="release-date-asc">Release Date Oldest</option>
          </select>
        </label>
      </div>
      <div className="nav-actions">
        <AddBtn />
        <SyncBtn />
        <SettingsBtn openSettingsPage={openSettingsPage}/>
      </div>
    </nav>
  )
}
