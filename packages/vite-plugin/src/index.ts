import { Plugin } from "vite";
import fg from "fast-glob";
import path from "path";
import fs from "fs";
import { WebSocketServer } from "ws";
import { subscribe } from "@parcel/watcher";
import diff, { Difference } from "microdiff";

/**
 * Game.js Vite Plugin with Real-time Editor Communication
 * 
 * Architecture:
 * ┌─────────────────┐    WebSocket     ┌─────────────────┐    Vite WS     ┌─────────────────┐
 * │  Editor App     │◄────port 3001────┤  Vite Plugin    │◄───────────────┤   Game Client   │
 * │  (Electron)     │                  │  WebSocket      │                │   (Browser)     │
 * └─────────────────┘                  └─────────────────┘                └─────────────────┘
 *                                             │
 *                                             ▼
 *                                      ┌─────────────────┐
 *                                      │ .editor.json    │
 *                                      │ File Watcher    │
 *                                      └─────────────────┘
 * 
 * Flow:
 * 1. Editor connects to Vite plugin WebSocket (port 3001)
 * 2. Editor sends property updates via WebSocket
 * 3. Vite plugin forwards updates to game via Vite's built-in WebSocket
 * 4. Vite plugin saves non-temporary updates to .editor.json files
 * 5. File watcher detects changes and broadcasts back to editor
 */

interface GameJSPluginOptions {
  srcDir?: string;
  appDir?: string;
  enableEditor?: boolean;
}

export default function gameJSPlugin(
  options: GameJSPluginOptions = {}
): Plugin[] {
  const srcDir = options.srcDir || "src";
  const appDir = options.appDir || "app";
  const appPath = path.join(srcDir, appDir);
  const enableEditor = options.enableEditor !== false;

  const plugins: Plugin[] = [];
  let editorFileCache = new Map<string, any>();
  let connectedClients = new Set<any>();

  // Core plugin - always included
  plugins.push({
    name: "game.js-core",
    buildStart() {
      generateRoutes();
    },
    configureServer(server) {
      // Serve .editor.json files from app directory
      server.middlewares.use((req, res, next) => {
        if (req.url?.endsWith(".editor.json")) {
          // Add CORS headers to allow cross-origin requests from Electron editor
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
          
          // Handle preflight requests
          if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
          }
          
          // Handle requests with full path like '/src/app/tt/scene.editor.json'
          const requestPath = req.url;
          let jsonPath: string;
          
          // If the request starts with the srcDir, it's already the full path
          if (requestPath.startsWith(`/${srcDir}/`)) {
            jsonPath = path.join(process.cwd(), requestPath);
          } else {
            // Otherwise, assume it's relative to appPath
            // Remove leading slash to avoid double slashes in path.join
            const relativePath = requestPath.startsWith('/') ? requestPath.slice(1) : requestPath;
            jsonPath = path.join(process.cwd(), appPath, relativePath);
          }
          
          if (fs.existsSync(jsonPath)) {
            res.setHeader("Content-Type", "application/json");
            res.end(fs.readFileSync(jsonPath, "utf-8"));
            return;
          } else {
            console.warn(`❌ Middleware: File not found: ${jsonPath}`);
            console.warn(`❌ Middleware: Directory contents:`, fs.existsSync(path.dirname(jsonPath)) ? fs.readdirSync(path.dirname(jsonPath)) : 'Directory does not exist');
          }
        }
        next();
      });

      // Watch for scene file changes
      server.ws.on("scene:reload", (data) => {
        server.ws.send("scene:reload", data);
      });

      // Add a test endpoint to manually trigger editor updates
      server.middlewares.use("/test-editor-update", (req, res) => {
        // Add CORS headers
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        
        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }
        
        const testUpdate = {
          type: "test-update",
          message: "This is a test update from the Vite plugin",
          timestamp: Date.now()
        };

        let sentCount = 0;
        if (enableEditor && connectedClients.size > 0) {
          connectedClients.forEach((ws) => {
            if (ws.readyState === 1) { // WebSocket.OPEN
              try {
                ws.send(JSON.stringify(testUpdate));
                sentCount++;
              } catch (error) {
                console.error("Failed to send test update:", error);
              }
            }
          });
          
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({
            success: true,
            message: `Test update sent to ${sentCount} editor clients`,
            connectedClients: connectedClients.size,
            testUpdate
          }));
        } else {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({
            success: false,
            message: enableEditor ? "No editor clients connected" : "Editor is not enabled",
            connectedClients: connectedClients.size
          }));
        }
      });
    },
  });

  // Editor plugin - DEVELOPMENT ONLY
  if (enableEditor) {
    plugins.push({
      name: "game.js-editor",
      apply: "serve", // Only apply during dev server
      configureServer(server) {
        let debounceTimers = new Map();
        let watcher: any | null = null;

        // Pre-populate the cache for hot-reloading
        const watchPattern = path.join(appPath, "**/*.editor.json");
        const initialFiles = fg.sync(watchPattern);
        for (const file of initialFiles) {
          try {
            const content = fs.readFileSync(file, "utf-8");
            const jsonData = JSON.parse(content);
            editorFileCache.set(path.resolve(file), jsonData);
          } catch (e) {
            console.error(`Error processing ${file}:`, e);
          }
        }

        // Create WebSocket server for editor communication
        const wss = new WebSocketServer({ port: 3001 });

        wss.on("connection", (ws: any) => {
          connectedClients.add(ws);

          // Send initial connection confirmation
          ws.send(JSON.stringify({
            type: "connection-confirmed",
            message: "Successfully connected to game.js editor"
          }));

          // Send a test heartbeat every 10 seconds to verify connection
          const heartbeatInterval = setInterval(() => {
            if (ws.readyState === 1) {
              try {
                ws.send(JSON.stringify({
                  type: "heartbeat",
                  timestamp: Date.now(),
                  message: "Connection is alive"
                }));
              } catch (error) {
                console.error("💓 Failed to send heartbeat:", error);
                clearInterval(heartbeatInterval);
                connectedClients.delete(ws);
              }
            } else {
              clearInterval(heartbeatInterval);
              connectedClients.delete(ws);
            }
          }, 10000);

          ws.on("message", (data: Buffer) => {
            try {
              const update = JSON.parse(data.toString());

              // Only process property-update messages, ignore connection-test and other message types
              if (update.type !== 'property-update' && !update.property) {
                return;
              }

              // Add route path if not present
              if (!update.routePath && update.scenePath) {
                update.routePath = getRoutePathFromScenePath(update.scenePath);
              }

              // Broadcast to active scene immediately via Vite's WebSocket
              server.ws.send({
                type: "custom",
                event: "property-update",
                data: update
              });

              // Temporarily disable cached scene update
              // Send cached scene update for non-active scenes
              // server.ws.send({
              //   type: "custom",
              //   event: "cached-scene-update",
              //   data: update
              // });

              // Handle debounced file saving - only for property updates with scenePath
              if (!update.temporary && update.scenePath && update.property) {
                debouncedSave(update, debounceTimers);
              }
            } catch (error) {
              console.error("Invalid WebSocket message:", error);
            }
          });

          ws.on("close", () => {
            clearInterval(heartbeatInterval);
            connectedClients.delete(ws);
          });

          ws.on("error", (error: any) => {
            console.error("🚨 WebSocket error:", error);
            clearInterval(heartbeatInterval);
            connectedClients.delete(ws);
          });
        });

        wss.on("error", (error: any) => {
          console.error("🚨 WebSocket Server error:", error);
        });

        // Watch for .editor.json file changes using @parcel/watcher
        let watcherSubscription: any = null;
        (async () => {
          try {
            watcherSubscription = await subscribe(
              appPath,
              async (err, events) => {
                if (err) {
                  console.error("🚨 File watcher error:", err);
                  return;
                }
                for (const event of events) {
                  if (!event.path.endsWith(".editor.json")) continue;
                  
                  // Ensure we have the absolute path
                  const absolutePath = path.isAbsolute(event.path) ? event.path : path.resolve(appPath, event.path);
                  
                  if (event.type === "create") {
                    // Add new files to cache to prevent false diffs
                    try {
                      const content = fs.readFileSync(absolutePath, "utf-8");
                      const jsonData = JSON.parse(content);
                      editorFileCache.set(absolutePath, jsonData);
                    } catch (e) {
                      console.error(`Error adding ${absolutePath} to cache:`, e);
                    }
                  } else if (event.type === "update") {
                    handleEditorJsonChange(
                      absolutePath,
                      server,
                      connectedClients
                    );
                  } else if (event.type === "delete") {
                    // Remove from cache
                    editorFileCache.delete(absolutePath);
                  }
                }
              },
              {
                ignore: ["**/node_modules/**"]
              }
            );
            
            // After watcher is ready, ensure cache is properly populated
            const existingFiles = fg.sync(path.join(appPath, "**/*.editor.json"));
            
            for (const file of existingFiles) {
              const absolutePath = path.resolve(file);
              if (!editorFileCache.has(absolutePath)) {
                try {
                  const content = fs.readFileSync(absolutePath, "utf-8");
                  const jsonData = JSON.parse(content);
                  editorFileCache.set(absolutePath, jsonData);
                } catch (e) {
                  console.error(`Error caching ${file} during ready:`, e);
                }
              }
            }
          } catch (error) {
            console.error("🚨 Failed to start file watcher:", error);
          }
        })();

        // Cleanup function
        server.httpServer?.on('close', () => {
          if (watcherSubscription) {
            watcherSubscription.unsubscribe();
          }
          wss.close();
        });
      },
    });
  }

  function handleEditorJsonChange(
    filePath: string,
    server: any,
    connectedClients: Set<any>
  ) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const newData = JSON.parse(content);
      const relativePath = path.relative(process.cwd(), filePath);

      // Get cached version for diffing
      const cachedData = editorFileCache.get(filePath) || {};

      // Find differences using microdiff
      const diffs = diff(cachedData, newData);

      if (diffs.length > 0) {
        // Determine the route path from the file path
        const routePath = getRoutePathFromFilePath(filePath);

        // Group diffs by type to handle them differently
        const simpleDiffs: Difference[] = [];
        const sceneDiffs: Difference[] = [];

        diffs.forEach((diffItem: Difference) => {
          const path = diffItem.path.join('.');
          if (path.startsWith('scene.')) {
            sceneDiffs.push(diffItem);
          } else {
            simpleDiffs.push(diffItem);
          }
        });

        // Handle simple property updates (e.g., @Editable properties)
        simpleDiffs.forEach((diffItem: Difference) => {
          // Only handle CREATE and CHANGE operations, skip REMOVE for now
          if (diffItem.type === 'REMOVE') return;

          const update = {
            type: "property-update",
            scenePath: relativePath.replace(".editor.json", ".ts"),
            routePath: routePath,
            property: diffItem.path.join('.'),
            value: diffItem.type === 'CREATE' ? diffItem.value : (diffItem as any).value,
            temporary: false,
          };

          // Broadcast to active scene via Vite's WebSocket
          server.ws.send({
            type: "custom",
            event: "property-update", 
            data: update
          });

          // Also broadcast to editor clients
          let sentCount = 0;
          connectedClients.forEach((ws) => {
            if (ws.readyState === 1) {
              // WebSocket.OPEN
              try {
                ws.send(JSON.stringify(update));
                sentCount++;
              } catch (error) {
                console.error("📤 Failed to send to client:", error);
              }
            }
          });
        });

        // Handle scene object updates by sending a scene reload event
        if (sceneDiffs.length > 0) {
          const sceneReloadUpdate = {
            type: "scene-reload",
            scenePath: relativePath.replace(".editor.json", ".ts"),
            routePath: routePath,
            sceneData: newData.scene,
            temporary: false,
          };

          // Broadcast scene reload to active scene via Vite's WebSocket
          server.ws.send({
            type: "custom",
            event: "scene-reload", 
            data: sceneReloadUpdate
          });

          // Also broadcast to editor clients
          let sentCount = 0;
          connectedClients.forEach((ws) => {
            if (ws.readyState === 1) {
              // WebSocket.OPEN
              try {
                ws.send(JSON.stringify(sceneReloadUpdate));
                sentCount++;
              } catch (error) {
                console.error("📤 Failed to send scene reload to client:", error);
              }
            }
          });

          console.log(`🔄 Scene reload triggered for ${sceneDiffs.length} Three.js object changes`);
        }
      }

      // Update cache
      editorFileCache.set(filePath, newData);
    } catch (error) {
      console.error("Failed to process .editor.json change:", error);
    }
  }

  function getRoutePathFromScenePath(scenePath: string): string {
    // Convert scene path to route path
    // Example: src/app/tt/scene.ts -> /tt
    // Example: src/app/scene.ts -> /
    
    const withoutExtension = scenePath.replace(/\.(ts|js)$/, '');
    const relativePath = path.relative(`${srcDir}/${appDir}`, withoutExtension);
    const parts = relativePath.split(path.sep);
    
    // Remove 'scene' filename
    if (parts[parts.length - 1] === 'scene') {
      parts.pop();
    }
    
    if (parts.length === 0 || (parts.length === 1 && parts[0] === '')) {
      return '/';
    }
    
    return '/' + parts.join('/');
  }

  function getRoutePathFromFilePath(filePath: string): string {
    // Convert file path to route path
    // Example: src/app/tt/scene.editor.json -> /tt
    // Example: src/app/scene.editor.json -> /
    
    const relativePath = path.relative(path.join(process.cwd(), appPath), filePath);
    const parts = relativePath.split(path.sep);
    
    // Remove the filename (scene.editor.json)
    parts.pop();
    
    if (parts.length === 0 || (parts.length === 1 && parts[0] === '')) {
      return '/';
    }
    
    return '/' + parts.join('/');
  }

  function generateRoutes() {
    const sceneFiles = fg.sync(`${appPath}/**/scene.{ts,js}`, {
      ignore: ["**/node_modules/**"],
    });

    const routes: string[] = [];

    sceneFiles.forEach((file) => {
      const relativePath = path.relative(appPath, file);
      const routePath = filePathToRoute(relativePath);
      const rawImportPath = `./${path
        .relative(srcDir, file)
        .replace(/\\/g, "/")}`;
      const importPath = rawImportPath.replace(/\.(ts|js)$/, "");

      routes.push(
        `router.registerRoute('${routePath}', () => import('${importPath}'))`
      );
    });

    const routesContent = `
// Auto-generated routes
import { GameRouter } from '@game.js/core';

const router = GameRouter.getInstance();

${routes.join(";\n")};

export default router;
`;

    fs.writeFileSync(path.join(srcDir, "routes.generated.ts"), routesContent);
  }

  function filePathToRoute(filePath: string): string {
    const parts = filePath.split(path.sep);
    parts.pop(); // Remove scene.ts

    if (parts.length === 0) {
      return "/";
    }

    return "/" + parts.join("/");
  }

  function debouncedSave(
    update: any,
    debounceTimers: Map<string, NodeJS.Timeout>
  ) {
    const key = `${update.scenePath}-${update.property}`;

    // Clear existing timer
    if (debounceTimers.has(key)) {
      clearTimeout(debounceTimers.get(key)!);
    }

    // Set new timer - only save after 500ms of no updates
    const timer = setTimeout(() => {
      savePropertyToFile(update);
      debounceTimers.delete(key);
    }, 500);

    debounceTimers.set(key, timer);
  }

  function savePropertyToFile(update: any) {
    // Safety check for required properties
    if (!update.scenePath || !update.property) {
      return;
    }

    const editorJsonPath = update.scenePath.replace(
      /\.(ts|js)$/,
      ".editor.json"
    );

    let editorData: any = {};
    if (fs.existsSync(editorJsonPath) && fs.statSync(editorJsonPath).isFile()) {
      try {
        editorData = JSON.parse(fs.readFileSync(editorJsonPath, "utf-8"));
      } catch (error) {
        console.error(`Failed to read editor data from ${editorJsonPath}:`, error);
        editorData = {};
      }
    } else if (fs.existsSync(editorJsonPath)) {
      console.error(`💾 Path exists but is not a file: ${editorJsonPath}`);
      return;
    }

    // Set the property value
    setNestedProperty(editorData, update.property, update.value);

    // Ensure the directory exists before writing
    const dir = path.dirname(editorJsonPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write to file
    try {
      fs.writeFileSync(editorJsonPath, JSON.stringify(editorData, null, 2));

      // Update cache to prevent circular updates
      editorFileCache.set(path.resolve(editorJsonPath), editorData);
    } catch (error) {
      console.error(`Failed to save editor data to ${editorJsonPath}:`, error);
    }
  }

  function setNestedProperty(obj: any, path: string, value: any) {
    const keys = path.split(".");
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
  }

  return plugins;
}