interface FileSystemPermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

interface FileSystemHandle {
  queryPermission(descriptor?: FileSystemPermissionDescriptor): Promise<PermissionState>;
  requestPermission(descriptor?: FileSystemPermissionDescriptor): Promise<PermissionState>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  // Existing methods are already defined in lib.dom.d.ts
}

interface FileSystemFileHandle extends FileSystemHandle {
  // Existing methods are already defined in lib.dom.d.ts
}
