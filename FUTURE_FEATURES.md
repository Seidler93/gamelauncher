# Future Features

## High Impact

### SaveLocker Integration
- Per-emulator save profiles for save folders, memory cards, BIOS/config, and cloud sync rules.
- Per-game save matching so uploads/downloads only show files that belong to the selected game.
- Conflict detection when both local and cloud saves changed.
- Manual and automatic save sync modes.
- Save snapshots with restore points before overwriting local files.

### Emulator Profiles
- Platform-specific launch profiles for PCSX2, RPCS3, Dolphin, RetroArch, and other emulators.
- Per-game launch argument overrides.
- Emulator health checks that verify EXE path, save folders, BIOS/config folders, and permissions.
- Profile import/export for moving launcher settings between PCs.

### Library Experience
- Better sorting and filtering by platform, genre, release date, playtime, install status, and favorites.
- Collections such as Favorites, Recently Played, Backlog, Completed, and Custom Lists.
- Duplicate detection across Steam, local games, and emulator libraries.
- Missing metadata repair flow for cover art, screenshots, trailers, and descriptions.
- Per-platform visual themes with a default neutral app theme.

### Duplicate Detection
- Detect duplicate games from repeated scans of the same folder.
- Detect the same game across Steam, local PC installs, and emulator libraries.
- Match duplicates by normalized title, platform, file path, Steam app ID, ROM serial/code, and executable path.
- Show a review screen before merging or hiding duplicates.
- Let the user choose the preferred entry, cover art, metadata, and launch target.
- Preserve alternate launch targets instead of deleting them, such as Steam version, standalone EXE, ROM, or remaster.
- Add an ignore option for games that look similar but are actually different releases.
- Flag duplicate save files separately from duplicate game entries.

### Launch Reliability
- Clear notifications for failed launches, missing EXEs, missing ROMs, bad arguments, and permission errors.
- Running-game tracking with status updates when a game closes.
- Launch logs per game for debugging.
- Safe multi-click protection for all launch buttons.

## Competitive Features

### Playtime and Activity
- Track total playtime, last played, session length, and launch count.
- Activity timeline per game.
- Optional playtime import from Steam where available.

### Metadata and Media
- Metadata provider selection and manual refresh.
- Cover/header image editor with crop and replace actions.
- Trailer preview controls.
- Platform-specific cover/header fallback art.

### Controller and Big Picture Mode
- Controller-friendly library navigation.
- Fullscreen couch mode.
- Quick actions for launch, favorite, filter, and close.

### Game Detail Pages
- More compact game aside layout.
- Save status summary per game.
- Emulator profile summary per game.
- Related games by platform, genre, or collection.

## Save and Cloud Features

### Sync Rules
- Include/exclude patterns per emulator.
- Sync only memory cards, only save states, or both.
- Separate rules for PCSX2, RPCS3, Dolphin, and RetroArch.
- Dry-run sync preview showing files that will upload, download, or be skipped.

### File Safety
- Backup local saves before download.
- Detect newer local saves before cloud restore.
- Keep last N backups per game.
- Show file size, modified date, and source location.

### Sharing
- Optional save sharing between trusted devices.
- Export save bundle for a single game.
- Import save bundle with validation.

## Quality of Life

### Settings
- Search settings.
- Reset section to defaults.
- Test buttons for emulator EXE paths and save folders.
- Clickable path validation with status badges.

### Library Maintenance
- Scheduled scans.
- Manual scan progress indicator.
- Scan result summary showing added, removed, and changed games.
- Ignore list for folders or files that should never appear.

### Notifications
- Notification history.
- Error details expandable from toast.
- Retry action on failed launch or failed sync.

## Longer-Term Ideas

### Profiles and Portability
- Multiple user profiles.
- Portable mode with relative paths.
- Cloud-backed settings sync.

### Plugin System
- Community metadata providers.
- Emulator-specific plugins.
- Theme packs.
- Custom launch scripts.

### Achievements and Progress
- Manual completion status.
- Notes per game.
- Achievement import where supported.
- Backlog planning and play queues.
