export interface FileSystemPermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

export interface FileSystemHandle {
  queryPermission(descriptor?: FileSystemPermissionDescriptor): Promise<PermissionState>;
  requestPermission(descriptor?: FileSystemPermissionDescriptor): Promise<PermissionState>;
}

declare global {
  interface FileSystemDirectoryHandle extends FileSystemHandle {}
  interface FileSystemFileHandle extends FileSystemHandle {}
}
