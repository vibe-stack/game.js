import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    // asar: false, // Disable ASAR to avoid pnpm symlink issues
    // Ensure esbuild is not ignored during packaging
    // ignore: (path: string) => {
    //   // Always keep esbuild and its platform-specific binaries
    //   if (path.includes("node_modules/esbuild") || path.includes("node_modules/@esbuild")) {
    //     return false;
    //   }
      
    //   // Ignore only specific development dependencies that aren't needed at runtime
    //   if (/node_modules\/(typescript|@types\/|eslint|prettier|vitest|playwright|electron-devtools-installer)/i.test(path)) {
    //     return true;
    //   }
      
    //   // Ignore documentation and test files
    //   if (/\.(md|txt|LICENSE|test\.|spec\.)$/i.test(path)) {
    //     return true;
    //   }
      
    //   // Keep everything else (including runtime dependencies like tslib)
    //   return false;
    // },
    // // Use prune: false to prevent dependency resolution issues with pnpm workspaces
    // prune: false,
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ["darwin"]),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.mts",
        },
      ],
    }),

    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
