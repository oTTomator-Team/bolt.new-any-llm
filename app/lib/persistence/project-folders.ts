import type { ProjectSyncInfo } from '~/types/sync';

const STORAGE_KEY = 'bolt_project_folders';

export class ProjectFolderManager {
  private static _instance: ProjectFolderManager;
  private _projectFolders: Map<string, ProjectSyncInfo>;

  private constructor() {
    this._projectFolders = new Map();
    this._loadFromStorage();
  }

  static getInstance(): ProjectFolderManager {
    if (!this._instance) {
      this._instance = new ProjectFolderManager();
    }

    return this._instance;
  }

  private _loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) {
        const data = JSON.parse(stored);
        this._projectFolders = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load project folders:', error);
    }
  }

  private _saveToStorage() {
    try {
      const data = Object.fromEntries(this._projectFolders);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save project folders:', error);
    }
  }

  private _normalizeProjectName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_\s-]/g, '')
      .replace(/[\s-]+/g, '_')
      .trim();
  }

  findExistingProject(projectName: string): ProjectSyncInfo | null {
    const normalizedName = this._normalizeProjectName(projectName);

    // First try exact match
    for (const [, info] of this._projectFolders) {
      const normalizedInfoName = this._normalizeProjectName(info.projectName);

      if (normalizedInfoName === normalizedName) {
        return info;
      }
    }

    // Then try matching without timestamp suffix
    const baseProjectName = normalizedName.replace(/_[a-z0-9]{6}$/, '');

    for (const [, info] of this._projectFolders) {
      const baseInfoName = this._normalizeProjectName(info.projectName).replace(/_[a-z0-9]{6}$/, '');

      if (baseInfoName === baseProjectName) {
        return info;
      }
    }

    return null;
  }

  async verifyProjectFolder(handle: FileSystemDirectoryHandle, folderName: string): Promise<boolean> {
    try {
      const dirHandle = await handle.getDirectoryHandle(folderName, { create: false });
      return !!dirHandle;
    } catch {
      return false;
    }
  }

  async registerProject(projectName: string, folderName: string): Promise<ProjectSyncInfo> {
    const info: ProjectSyncInfo = {
      projectName,
      folderName,
      lastSync: Date.now(),
      syncEnabled: false,
    };

    this._projectFolders.set(projectName, info);
    this._saveToStorage();

    return info;
  }

  async getOrCreateProjectFolder(
    rootHandle: FileSystemDirectoryHandle,
    projectName: string,
    createIfNotExists: boolean = false,
  ): Promise<{ folderHandle: FileSystemDirectoryHandle; projectInfo: ProjectSyncInfo }> {
    // Try to find existing project
    const existingProject = this.findExistingProject(projectName);

    if (existingProject) {
      try {
        // Try to get the existing folder
        const folderHandle = await rootHandle.getDirectoryHandle(existingProject.folderName, { create: false });
        return { folderHandle, projectInfo: existingProject };
      } catch {
        // Only if the folder was deleted, we'll fall through to creation
        if (!createIfNotExists) {
          throw new Error(`Project folder ${existingProject.folderName} not found`);
        }
      }
    }

    if (!createIfNotExists) {
      throw new Error('Project folder not found');
    }

    // This is a new project, create a new folder
    const normalizedName = this._normalizeProjectName(projectName);
    const timestampHash = Date.now().toString(36).slice(-6);
    const newFolderName = `${normalizedName}_${timestampHash}`;

    const folderHandle = await rootHandle.getDirectoryHandle(newFolderName, { create: true });
    const projectInfo = await this.registerProject(projectName, newFolderName);

    return { folderHandle, projectInfo };
  }

  getAllProjects(): ProjectSyncInfo[] {
    return Array.from(this._projectFolders.values());
  }
}
