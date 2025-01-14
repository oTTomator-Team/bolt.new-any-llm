## Sync UI and Persistence Enhancements

This PR improves the sync functionality by enhancing the UI and leveraging existing persistence capabilities.

### 🔄 Persistence Layer

- Utilizes IndexedDB for storing sync folder handles
- Implements permission verification on folder restoration
- Automatically restores sync folder settings on app start
- Gracefully handles permission revocation

### 🎨 UI Improvements

- **Workbench Header**

  - Streamlined main sync display
  - Comprehensive tooltip with detailed status
  - Clear visual indicators for sync states
  - Organized sync controls

- **Settings Panel (SyncTab)**
  - Enhanced layout and visual hierarchy
  - Improved folder information display
  - Clear status indicators
  - Fixed overlapping elements

### 🛠 Technical Enhancements

- Strengthened TypeScript type definitions
- Optimized component organization
- Enhanced state management
- More efficient rendering
- Robust persistence implementation

### 🔍 Implementation Details

```typescript
// Core persistence functions
saveSyncFolderHandle(handle)    // Store folder handle
loadSyncFolderHandle()          // Restore with permission check
clearSyncFolderHandle()         // Clear stored handle

// UI Components
- Minimal workbench display
- Detailed tooltip overlay
- Status indicators
- Folder information
- Sync controls
```

### 🎯 Impact

These changes significantly improve the user experience by:

1. Maintaining sync settings across sessions
2. Providing a cleaner, more intuitive interface
3. Offering better sync status visibility
4. Ensuring robust permission handling
5. Preserving a professional appearance
