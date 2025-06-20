import { dialog } from "electron";
import fs from "fs/promises";
import path from "path";
import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";

// Import the correct type from project types
import type { AssetReference } from "../types/project";

export interface GameScene {
  assets: AssetReference[];
  metadata: {
    modified: Date;
  };
}

export class AssetManager {
  private static assetServer: any = null;
  private static assetServerPort: number = 0;

  private constructor() {} // Prevent instantiation

  private static async startAssetServer(projectPath: string): Promise<number> {
    if (AssetManager.assetServer) {
      return AssetManager.assetServerPort;
    }

    const app = express();
    
    // Serve assets directory with CORS headers
    app.use('/assets', (req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      next();
    }, express.static(path.join(projectPath, 'assets')));

    // Serve .gamejs directory for compiled scripts and vendor files
    app.use('/.gamejs', (req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      res.header('Content-Type', 'application/javascript'); // Set correct MIME type for JS files
      next();
    }, express.static(path.join(projectPath, '.gamejs')));

    const server = createServer(app);
    
    // Find available port
    const port = await new Promise<number>((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          resolve(address.port);
        } else {
          resolve(3001); // fallback
        }
      });
    });

    AssetManager.assetServer = server;
    AssetManager.assetServerPort = port;
    
    console.log(`Asset server started on port ${port} serving ${projectPath}`);
    return port;
  }

  private static stopAssetServer() {
    if (AssetManager.assetServer) {
      AssetManager.assetServer.close();
      AssetManager.assetServer = null;
      AssetManager.assetServerPort = 0;
      console.log('Asset server stopped');
    }
  }

  static async getAssetServerPort(projectPath: string): Promise<number> {
    return await AssetManager.startAssetServer(projectPath);
  }

  static async getAssetUrl(projectPath: string, assetPath: string): Promise<string | null> {
    try {
      const fullAssetPath = path.resolve(projectPath, assetPath);
      const projectDir = path.resolve(projectPath);

      if (!fullAssetPath.startsWith(projectDir)) {
        throw new Error("Asset path is outside project directory");
      }

      if (!(await AssetManager.fileExists(fullAssetPath))) {
        console.warn("Asset file does not exist:", fullAssetPath);
        return null;
      }

      const extension = path.extname(assetPath).toLowerCase();
      
      // For multi-file formats like GLTF, use HTTP server
      if (extension === '.gltf') {
        const port = await AssetManager.startAssetServer(projectPath);
        return `http://localhost:${port}/${assetPath}`;
      }
      
      // For single-file formats like GLB, use data URL (existing behavior)
      return AssetManager.getAssetDataUrl(projectPath, assetPath);
    } catch (error) {
      console.error("Error getting asset URL:", error);
      return null;
    }
  }

  static async selectAssetFiles(): Promise<string[]> {
    const result = await dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [
        {
          name: "Assets",
          extensions: [
            "jpg",
            "jpeg",
            "png",
            "webp",
            "bmp",
            "tga",
            "hdr",
            "exr",
            "glb",
            "gltf",
            ".bin",
            "fbx",
            "obj",
            "dae",
            "ply",
            "stl",
            "mp3",
            "wav",
            "ogg",
            "flac",
            "m4a",
            "js",
            "ts",
            "jsx",
            "tsx",
            "glsl",
            "vert",
            "frag",
            "vs",
            "fs",
          ],
        },
        {
          name: "Images",
          extensions: [
            "jpg",
            "jpeg",
            "png",
            "webp",
            "bmp",
            "tga",
            "hdr",
            "exr",
          ],
        },
        {
          name: "3D Models",
          extensions: ["glb", "gltf", "fbx", "obj", "dae", "ply", "stl"],
        },
        { name: "Audio", extensions: ["mp3", "wav", "ogg", "flac", "m4a"] },
        { name: "Scripts", extensions: ["js", "ts", "jsx", "tsx"] },
        { name: "Shaders", extensions: ["glsl", "vert", "frag", "vs", "fs"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    return result.canceled ? [] : result.filePaths;
  }

  static async importAssetFromData(
    projectPath: string,
    fileName: string,
    fileData: Buffer,
  ): Promise<AssetReference> {
    const assetsDir = path.join(projectPath, "assets");
    await fs.mkdir(assetsDir, { recursive: true });

    // Get file info
    const fileExtension = path.extname(fileName).toLowerCase();
    const nameWithoutExt = path.basename(fileName, fileExtension);

    // Determine asset type based on extension
    const assetType = AssetManager.getAssetTypeFromExtension(fileExtension);

    // Create unique filename to avoid conflicts
    let counter = 0;
    let finalFileName = fileName;
    let destinationPath = path.join(assetsDir, finalFileName);

    while (await AssetManager.fileExists(destinationPath)) {
      counter++;
      finalFileName = `${nameWithoutExt}_${counter}${fileExtension}`;
      destinationPath = path.join(assetsDir, finalFileName);
    }

    // Write file data to assets directory
    await fs.writeFile(destinationPath, fileData);

    // Create asset reference
    const assetReference: AssetReference = {
      id: `asset_${Date.now()}_${counter}`,
      type: assetType,
      path: `assets/${finalFileName}`, // Relative path from project root
      name: nameWithoutExt,
    };

    return assetReference;
  }

  static async importAsset(
    projectPath: string,
    assetPath: string,
  ): Promise<AssetReference> {
    const assetsDir = path.join(projectPath, "assets");
    await fs.mkdir(assetsDir, { recursive: true });

    // Get file info
    const fileName = path.basename(assetPath);
    const fileExtension = path.extname(fileName).toLowerCase();
    const nameWithoutExt = path.basename(fileName, fileExtension);

    // Determine asset type based on extension
    const assetType = AssetManager.getAssetTypeFromExtension(fileExtension);

    // Create unique filename to avoid conflicts
    let counter = 0;
    let finalFileName = fileName;
    let destinationPath = path.join(assetsDir, finalFileName);

    while (await AssetManager.fileExists(destinationPath)) {
      counter++;
      finalFileName = `${nameWithoutExt}_${counter}${fileExtension}`;
      destinationPath = path.join(assetsDir, finalFileName);
    }

    // Copy file to assets directory
    await fs.copyFile(assetPath, destinationPath);

    // Create asset reference
    const assetReference: AssetReference = {
      id: `asset_${Date.now()}_${counter}`,
      type: assetType,
      path: `assets/${finalFileName}`, // Relative path from project root
      name: nameWithoutExt,
    };

    return assetReference;
  }

  static async deleteAsset(projectPath: string, assetId: string): Promise<void> {
    // Get current scene to find the asset
    const scenesDir = path.join(projectPath, "scenes");
    
    try {
      const sceneFiles = await fs.readdir(scenesDir);
      const sceneNames = sceneFiles
        .filter((file) => file.endsWith(".json"))
        .map((file) => file.replace(".json", ""));

      for (const sceneName of sceneNames) {
        try {
          const scenePath = path.join(scenesDir, `${sceneName}.json`);
          const sceneContent = await fs.readFile(scenePath, "utf-8");
          const scene = JSON.parse(sceneContent) as GameScene;
          
          const assetIndex = scene.assets.findIndex(
            (asset: AssetReference) => asset.id === assetId,
          );

          if (assetIndex >= 0) {
            const asset = scene.assets[assetIndex];
            const assetPath = path.join(projectPath, asset.path);

            // Delete physical file
            try {
              await fs.unlink(assetPath);
            } catch (error) {
              console.warn(`Failed to delete asset file: ${assetPath}`, error);
            }

            // Remove from scene assets
            scene.assets.splice(assetIndex, 1);
            scene.metadata.modified = new Date();
            const sceneData = JSON.stringify(scene, null, 2);
            await fs.writeFile(scenePath, sceneData, "utf-8");
            break;
          }
        } catch (error) {
          console.warn(`Failed to check scene ${sceneName} for asset`, error);
        }
      }
    } catch (error) {
      console.warn("Failed to read scenes directory", error);
    }
  }

  static async getAssets(projectPath: string): Promise<AssetReference[]> {
    const assetsDir = path.join(projectPath, "assets");

    if (!(await AssetManager.fileExists(assetsDir))) {
      return [];
    }

    try {
      const files = await fs.readdir(assetsDir);
      const assets: AssetReference[] = [];

      for (const file of files) {
        const filePath = path.join(assetsDir, file);
        const stat = await fs.stat(filePath);

        if (stat.isFile()) {
          const fileExtension = path.extname(file).toLowerCase();
          const nameWithoutExt = path.basename(file, fileExtension);

          // Determine asset type based on extension
          const assetType = AssetManager.getAssetTypeFromExtension(fileExtension);

          const asset: AssetReference = {
            id: `asset_${file}_${stat.mtime.getTime()}`,
            type: assetType,
            path: `assets/${file}`,
            name: nameWithoutExt,
          };

          assets.push(asset);
        }
      }

      return assets;
    } catch (error) {
      console.error("Error reading assets directory:", error);
      return [];
    }
  }

  static async getAssetDataUrl(
    projectPath: string,
    assetPath: string,
  ): Promise<string | null> {
    try {
      // Ensure the asset path is within the project directory for security
      const fullAssetPath = path.resolve(projectPath, assetPath);
      const projectDir = path.resolve(projectPath);

      if (!fullAssetPath.startsWith(projectDir)) {
        throw new Error("Asset path is outside project directory");
      }

      if (!(await AssetManager.fileExists(fullAssetPath))) {
        console.warn("Asset file does not exist:", fullAssetPath);
        return null;
      }

      // Read the file as buffer
      const fileBuffer = await fs.readFile(fullAssetPath);

      // Determine MIME type based on file extension
      const extension = path.extname(assetPath).toLowerCase();
      const mimeType = AssetManager.getMimeTypeFromExtension(extension);

      // Convert to base64 data URL
      const base64Data = fileBuffer.toString("base64");
      return `data:${mimeType};base64,${base64Data}`;
    } catch (error) {
      console.error("Error reading asset file:", error);
      return null;
    }
  }

  private static getAssetTypeFromExtension(fileExtension: string): AssetReference["type"] {
    if (
      [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".bmp",
        ".tga",
        ".hdr",
        ".exr",
      ].includes(fileExtension)
    ) {
      return "texture";
    } else if (
      [".glb", ".gltf", ".fbx", ".obj", ".dae", ".ply", ".stl"].includes(
        fileExtension,
      )
    ) {
      return "model";
    } else if (
      [".mp3", ".wav", ".ogg", ".flac", ".m4a"].includes(fileExtension)
    ) {
      return "audio";
    } else if ([".js", ".ts", ".jsx", ".tsx"].includes(fileExtension)) {
      return "script";
    } else if (
      [".glsl", ".vert", ".frag", ".vs", ".fs"].includes(fileExtension)
    ) {
      return "material";
    } else {
      return "texture"; // Default fallback
    }
  }

  private static getMimeTypeFromExtension(extension: string): string {
    switch (extension) {
      case ".jpg":
      case ".jpeg":
        return "image/jpeg";
      case ".png":
        return "image/png";
      case ".webp":
        return "image/webp";
      case ".bmp":
        return "image/bmp";
      case ".tga":
        return "image/tga";
      case ".hdr":
        return "image/vnd.radiance";
      case ".exr":
        return "image/x-exr";
      case ".glb":
        return "model/gltf-binary";
      case ".gltf":
        return "model/gltf+json";
      case ".mp3":
        return "audio/mpeg";
      case ".wav":
        return "audio/wav";
      case ".ogg":
        return "audio/ogg";
      case ".flac":
        return "audio/flac";
      case ".m4a":
        return "audio/mp4";
      default:
        return "application/octet-stream";
    }
  }

  private static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
} 