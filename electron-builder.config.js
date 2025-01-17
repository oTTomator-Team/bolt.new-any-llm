export default {
  appId: 'com.stackblitz.bolt.diy',
  productName: 'bolt.diy',
  files: ['dist-electron/**/*', 'build/**/*', 'public/**/*', 'package.json'],
  directories: {
    buildResources: 'resources',
    output: 'release',
  },
  // Add this for pnpm support
  asar: true,
  // Important: This tells electron-builder how to find dependencies with pnpm
  beforeBuild: async (context) => {
    const { Platform } = await import('electron-builder');
    if (context.platform === Platform.WINDOWS) {
      await import('electron-builder-squirrel-windows');
    }
  },
  npmRebuild: false,
  nodeGypRebuild: false,
  buildDependenciesFromSource: true,
  // Add this to handle node_modules correctly
  extraMetadata: {
    main: 'dist-electron/main.js',
  },
  mac: {
    category: 'public.app.category.developer_tools',
    icon: 'public/logo.icns', // Mac icon
    target: ['dmg', 'zip'],
  },
  win: {
    icon: 'public/logo.ico', // Win icon
    target: ['nsis', 'portable'],
  },
  linux: {
    icon: 'public/logo.png', // linux icon
    target: ['AppImage', 'deb'],
    category: 'Development',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
};