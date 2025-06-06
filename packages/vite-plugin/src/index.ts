import { Plugin } from "vite";
import fg from "fast-glob";
import path from "path";
import fs from "fs";
import { WebSocketServer } from "ws";
import { subscribe } from "@parcel/watcher";

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
          const jsonPath = path.join(process.cwd(), appPath, req.url);
          if (fs.existsSync(jsonPath)) {
            res.setHeader("Content-Type", "application/json");
            res.end(fs.readFileSync(jsonPath, "utf-8"));
            return;
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
        const testUpdate = {
          type: "test-update",
          message: "This is a test update from the Vite plugin",
          timestamp: Date.now()
        };

        let sentCount = 0;
        if (enableEditor && connectedClients.size > 0) {
          console.log("🧪 Test endpoint triggered - sending to", connectedClients.size, "editor clients");
          
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

        // Pre-populate the cache for hot-reloading
        const watchPattern = path.join(appPath, "**/*.editor.json");
        console.log('🔍 Absolute watch pattern:', path.resolve(watchPattern));
        const initialFiles = fg.sync(watchPattern);
        console.log(`🔍 Found ${initialFiles.length} .editor.json files to watch:`, initialFiles);
        for (const file of initialFiles) {
          try {
            const content = fs.readFileSync(file, "utf-8");
            const jsonData = JSON.parse(content);
            editorFileCache.set(path.resolve(file), jsonData);
            console.log(`📝 Cached ${path.basename(file)} for diffing.`);
          } catch (e) {
            console.error(`Error processing ${file}:`, e);
          }
        }

        // Create WebSocket server for editor communication
        const wss = new WebSocketServer({ port: 3001 });
        console.log("🚀 Starting WebSocket server on port 3001");

        wss.on("connection", (ws: any) => {
          console.log("🎨 Editor connected. Total clients:", connectedClients.size + 1);
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
                console.log("💓 Sent heartbeat to editor");
              } catch (error) {
                console.error("💓 Failed to send heartbeat:", error);
                clearInterval(heartbeatInterval);
                connectedClients.delete(ws);
              }
            } else {
              console.log("💓 WebSocket not ready, clearing heartbeat");
              clearInterval(heartbeatInterval);
              connectedClients.delete(ws);
            }
          }, 10000);

          ws.on("message", (data: Buffer) => {
            console.log("📨 Received message from editor:", data.toString());
            try {
              const update = JSON.parse(data.toString());
              console.log("📨 Parsed update:", update);

              // Broadcast to game immediately via Vite's WebSocket
              server.ws.send({
                type: "custom",
                event: "property-update",
                data: update
              });
              console.log("📤 Sent update to game via Vite WebSocket");

              // Handle debounced file saving
              if (!update.temporary) {
                console.log("💾 Scheduling debounced save for:", update.property);
                debouncedSave(update, debounceTimers);
              }
            } catch (error) {
              console.error("Invalid WebSocket message:", error);
            }
          });

          ws.on("close", () => {
            console.log("🎨 Editor disconnected. Remaining clients:", connectedClients.size - 1);
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

        // Watch for .editor.json file changes
        console.log("🔍 Setting up file watcher for pattern:", watchPattern);

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
                  const absPath = path.isAbsolute(event.path) ? event.path : path.resolve(appPath, event.path);
                  if (event.type === "create") {
                    console.log("🔍 New editor JSON file added:", absPath);
                  } else if (event.type === "update") {
                    console.log("🔍 Editor JSON file changed:", absPath);
                    console.log("🔍 Connected clients count:", connectedClients.size);
                    handleEditorJsonChange(
                      path.resolve(absPath),
                      server,
                      connectedClients
                    );
                  } else if (event.type === "delete") {
                    console.log("🔍 Editor JSON file removed:", absPath);
                  }
                }
              },
              {
                ignore: ["**/node_modules/**"]
              }
            );
            console.log("🔍 File watcher is ready and watching for changes");
          } catch (error) {
            console.error("🚨 Failed to start file watcher:", error);
          }
        })();

        console.log(
          "🎨 Editor WebSocket server running on ws://localhost:3001"
        );
      },
    });
  }

  function handleEditorJsonChange(
    filePath: string,
    server: any,
    connectedClients: Set<any>
  ) {
    console.log("🔄 Processing editor JSON change for:", filePath);
    console.log("🔄 Number of connected clients:", connectedClients.size);
    
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const newData = JSON.parse(content);
      const relativePath = path.relative(process.cwd(), filePath);

      console.log("🔄 File content read successfully");
      console.log("🔄 Relative path:", relativePath);

      // Get cached version for diffing
      const cachedData = editorFileCache.get(filePath) || {};
      console.log("🔄 Cached data exists:", Object.keys(cachedData).length > 0);

      // Find differences
      const diffs = findObjectDifferences(cachedData, newData);
      console.log(`🔄 Found ${diffs.length} differences`);

      if (diffs.length > 0) {
        console.log(
          `🔄 Detected ${diffs.length} changes in ${path.basename(filePath)}`
        );

        // Send each diff as a property update
        diffs.forEach((diff, index) => {
          const update = {
            type: "property-update",
            scenePath: relativePath.replace(".editor.json", ".ts"),
            property: diff.path,
            value: diff.newValue,
            temporary: false,
          };

          console.log(
            `  📤 Broadcasting diff ${index + 1}: ${diff.path} = ${JSON.stringify(diff.newValue)}`
          );

          // Broadcast to game via Vite's WebSocket
          server.ws.send({
            type: "custom",
            event: "property-update", 
            data: update
          });

          // Also broadcast to editor clients
          let sentCount = 0;
          connectedClients.forEach((ws) => {
            console.log("📤 Checking client readyState:", ws.readyState);
            if (ws.readyState === 1) {
              // WebSocket.OPEN
              try {
                ws.send(JSON.stringify(update));
                sentCount++;
                console.log("📤 Successfully sent update to editor client");
              } catch (error) {
                console.error("📤 Failed to send to client:", error);
              }
            } else {
              console.log("📤 Client not ready, readyState:", ws.readyState);
            }
          });
          console.log(`📤 Sent update to ${sentCount} editor clients`);
        });
      } else {
        console.log("🔄 No differences found, skipping broadcast");
      }

      // Update cache
      editorFileCache.set(filePath, newData);
      console.log("🔄 Cache updated for:", filePath);
    } catch (error) {
      console.error("Failed to process .editor.json change:", error);
    }
  }

  function findObjectDifferences(
    oldData: any,
    newData: any,
    basePath = ""
  ): Array<{ path: string; oldValue: any; newValue: any }> {
    const diffs: Array<{ path: string; oldValue: any; newValue: any }> = [];

    function compareObjects(old: any, current: any, path: string) {
      if (old === current) return;

      // Handle primitive values
      if (typeof current !== "object" || current === null) {
        if (old !== current) {
          diffs.push({ path, oldValue: old, newValue: current });
        }
        return;
      }

      // Handle arrays
      if (Array.isArray(current)) {
        if (
          !Array.isArray(old) ||
          old.length !== current.length ||
          !old.every((val, i) => val === current[i])
        ) {
          diffs.push({ path, oldValue: old, newValue: current });
        }
        return;
      }

      // Handle objects
      const allKeys = new Set([
        ...Object.keys(old || {}),
        ...Object.keys(current || {}),
      ]);

      for (const key of allKeys) {
        const newPath = path ? `${path}.${key}` : key;
        compareObjects(old?.[key], current?.[key], newPath);
      }
    }

    compareObjects(oldData, newData, basePath);
    return diffs;
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
    const editorJsonPath = update.scenePath.replace(
      /\.(ts|js)$/,
      ".editor.json"
    );

    let editorData: any = {};
    if (fs.existsSync(editorJsonPath)) {
      editorData = JSON.parse(fs.readFileSync(editorJsonPath, "utf-8"));
    }

    // Set the property value
    setNestedProperty(editorData, update.property, update.value);

    // Write to file
    fs.writeFileSync(editorJsonPath, JSON.stringify(editorData, null, 2));
    console.log(
      `💾 Saved ${update.property} to ${path.basename(editorJsonPath)}`
    );

    // Update cache to prevent circular updates
    editorFileCache.set(path.resolve(editorJsonPath), editorData);
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