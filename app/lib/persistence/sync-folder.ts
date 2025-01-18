import { openDB } from 'idb';
import '~/types/file-system';

const DB_NAME = 'bolt_sync';
const STORE_NAME = 'sync_folder';
const HANDLE_KEY = 'folder_handle';

// Open the IndexedDB database
const openSyncDB = () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });
};

// Save the folder handle to IndexedDB
export async function saveSyncFolderHandle(handle: FileSystemDirectoryHandle) {
  console.log('Saving sync folder handle to IndexedDB:', handle.name);

  const db = await openSyncDB();
  await db.put(STORE_NAME, handle, HANDLE_KEY);
}

// Load the folder handle from IndexedDB and verify permissions
export async function loadSyncFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    console.log('Loading sync folder handle from IndexedDB...');

    const db = await openSyncDB();
    const handle = (await db.get(STORE_NAME, HANDLE_KEY)) as FileSystemDirectoryHandle;

    if (!handle) {
      console.log('No sync folder handle found in IndexedDB');
      return null;
    }

    console.log('Found sync folder handle:', handle.name);

    // Verify we still have permission to access the folder
    console.log('Checking folder permissions...');

    const permissionStatus = await handle.queryPermission({ mode: 'readwrite' });
    console.log('Current permission status:', permissionStatus);

    if (permissionStatus === 'granted') {
      console.log('Permission already granted');
      return handle;
    }

    // If permission is 'prompt', request it again
    if (permissionStatus === 'prompt') {
      console.log('Requesting permission again...');

      const newPermissionStatus = await handle.requestPermission({ mode: 'readwrite' });
      console.log('New permission status:', newPermissionStatus);

      if (newPermissionStatus === 'granted') {
        console.log('Permission granted');
        return handle;
      }
    }

    // If we don't have permission, remove the handle
    console.log('Permission denied, removing handle from IndexedDB');
    await db.delete(STORE_NAME, HANDLE_KEY);

    return null;
  } catch (error) {
    console.error('Failed to load sync folder handle:', error);
    return null;
  }
}

// Clear the stored handle from IndexedDB
export async function clearSyncFolderHandle() {
  console.log('Clearing sync folder handle from IndexedDB');

  const db = await openSyncDB();
  await db.delete(STORE_NAME, HANDLE_KEY);
}
