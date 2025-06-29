import { ipcMain } from "electron";
import { 
  PROJECT_LOAD_PROJECTS_CHANNEL,
  PROJECT_CREATE_PROJECT_CHANNEL,
  PROJECT_OPEN_PROJECT_CHANNEL,
  PROJECT_SAVE_PROJECT_CHANNEL,
  PROJECT_DELETE_PROJECT_CHANNEL,
  PROJECT_OPEN_FOLDER_CHANNEL,
  PROJECT_SELECT_DIRECTORY_CHANNEL,
  PROJECT_LIST_SCENES_CHANNEL,
  PROJECT_LOAD_SCENE_CHANNEL,
  PROJECT_SAVE_SCENE_CHANNEL,
  PROJECT_CREATE_SCENE_CHANNEL,
  PROJECT_DELETE_SCENE_CHANNEL,
  PROJECT_SWITCH_SCENE_CHANNEL,
  PROJECT_GET_ACTIVE_SCENE_CHANNEL,
  PROJECT_SELECT_ASSET_FILES_CHANNEL,
  PROJECT_IMPORT_ASSET_FROM_DATA_CHANNEL,
  PROJECT_IMPORT_ASSET_CHANNEL,
  PROJECT_DELETE_ASSET_CHANNEL,
  PROJECT_GET_ASSETS_CHANNEL,
  PROJECT_GET_ASSET_DATA_URL_CHANNEL,
  PROJECT_GET_ASSET_URL_CHANNEL,
  PROJECT_GET_ASSET_SERVER_PORT_CHANNEL,
  PROJECT_READ_FILE_CHANNEL,
  PROJECT_WRITE_FILE_CHANNEL,
  PROJECT_FILE_EXISTS_CHANNEL,
  PROJECT_LIST_DIRECTORY_CHANNEL,
  PROJECT_GET_FILE_STATS_CHANNEL,
  PROJECT_CREATE_FILE_CHANNEL,
  PROJECT_CREATE_DIRECTORY_CHANNEL,
  PROJECT_DELETE_FILE_CHANNEL,
  PROJECT_DELETE_DIRECTORY_CHANNEL,
  PROJECT_RENAME_ITEM_CHANNEL,
  PROJECT_SAVE_SCRIPT_FILE_CHANNEL,
  PROJECT_OPEN_SCRIPT_IN_EDITOR_CHANNEL
} from "./project-channels";
import { ProjectService } from "../../../services/project-service";

export function addProjectEventListeners() {

  // Project Management
  ipcMain.handle(PROJECT_LOAD_PROJECTS_CHANNEL, () => ProjectService.loadProjects());
  ipcMain.handle(PROJECT_CREATE_PROJECT_CHANNEL, (_, ...args: [string, string?, string?, string?, string?]) => 
    ProjectService.createProject(...args));
  ipcMain.handle(PROJECT_OPEN_PROJECT_CHANNEL, (_, ...args: [string]) => 
    ProjectService.openProject(...args));
  ipcMain.handle(PROJECT_SAVE_PROJECT_CHANNEL, (_, ...args: [any]) => 
    ProjectService.saveProject(...args));
  ipcMain.handle(PROJECT_DELETE_PROJECT_CHANNEL, (_, ...args: [string]) => 
    ProjectService.deleteProject(...args));
  ipcMain.handle(PROJECT_OPEN_FOLDER_CHANNEL, (_, ...args: [string]) => 
    ProjectService.openProjectFolder(...args));
  ipcMain.handle(PROJECT_SELECT_DIRECTORY_CHANNEL, () => 
    ProjectService.selectProjectDirectory());

  // Scene Management
  ipcMain.handle(PROJECT_LIST_SCENES_CHANNEL, (_, ...args: [string]) => 
    ProjectService.listScenes(...args));
  ipcMain.handle(PROJECT_LOAD_SCENE_CHANNEL, (_, ...args: [string, string]) => 
    ProjectService.loadScene(...args));
  ipcMain.handle(PROJECT_SAVE_SCENE_CHANNEL, (_, ...args: [string, string, any]) => 
    ProjectService.saveScene(...args));
  ipcMain.handle(PROJECT_CREATE_SCENE_CHANNEL, (_, ...args: [string, string, any?]) => 
    ProjectService.createScene(...args));
  ipcMain.handle(PROJECT_DELETE_SCENE_CHANNEL, (_, ...args: [string, string]) => 
    ProjectService.deleteScene(...args));
  ipcMain.handle(PROJECT_SWITCH_SCENE_CHANNEL, (_, ...args: [string, string]) => 
    ProjectService.switchScene(...args));
  ipcMain.handle(PROJECT_GET_ACTIVE_SCENE_CHANNEL, (_, ...args: [string]) => 
    ProjectService.getActiveScene(...args));

  // Asset Management
  ipcMain.handle(PROJECT_SELECT_ASSET_FILES_CHANNEL, () => 
    ProjectService.selectAssetFiles());
  ipcMain.handle(PROJECT_IMPORT_ASSET_FROM_DATA_CHANNEL, (_, ...args: [string, string, Buffer]) => 
    ProjectService.importAssetFromData(...args));
  ipcMain.handle(PROJECT_IMPORT_ASSET_CHANNEL, (_, ...args: [string, string]) => 
    ProjectService.importAsset(...args));
  ipcMain.handle(PROJECT_DELETE_ASSET_CHANNEL, (_, ...args: [string, string]) => 
    ProjectService.deleteAsset(...args));
  ipcMain.handle(PROJECT_GET_ASSETS_CHANNEL, (_, ...args: [string]) => 
    ProjectService.getAssets(...args));
  ipcMain.handle(PROJECT_GET_ASSET_DATA_URL_CHANNEL, (_, ...args: [string, string]) => 
    ProjectService.getAssetDataUrl(...args));
  ipcMain.handle(PROJECT_GET_ASSET_URL_CHANNEL, (_, ...args: [string, string]) => 
    ProjectService.getAssetUrl(...args));
  ipcMain.handle(PROJECT_GET_ASSET_SERVER_PORT_CHANNEL, (_, ...args: [string]) => 
    ProjectService.getAssetServerPort(...args));

  // File System Operations
  ipcMain.handle(PROJECT_READ_FILE_CHANNEL, (_, ...args: [string]) => 
    ProjectService.readFile(...args));
  ipcMain.handle(PROJECT_WRITE_FILE_CHANNEL, (_, ...args: [string, string]) => 
    ProjectService.writeFile(...args));
  ipcMain.handle(PROJECT_FILE_EXISTS_CHANNEL, (_, ...args: [string]) => 
    ProjectService.fileExists(...args));
  ipcMain.handle(PROJECT_LIST_DIRECTORY_CHANNEL, (_, ...args: [string]) => 
    ProjectService.listDirectory(...args));
  ipcMain.handle(PROJECT_GET_FILE_STATS_CHANNEL, (_, ...args: [string]) => 
    ProjectService.getFileStats(...args));
  ipcMain.handle(PROJECT_CREATE_FILE_CHANNEL, (_, ...args: [string, string]) => 
    ProjectService.createFile(...args));
  ipcMain.handle(PROJECT_CREATE_DIRECTORY_CHANNEL, (_, ...args: [string]) => 
    ProjectService.createDirectory(...args));
  ipcMain.handle(PROJECT_DELETE_FILE_CHANNEL, (_, ...args: [string]) => 
    ProjectService.deleteFile(...args));
  ipcMain.handle(PROJECT_DELETE_DIRECTORY_CHANNEL, (_, ...args: [string]) => 
    ProjectService.deleteDirectory(...args));
  ipcMain.handle(PROJECT_RENAME_ITEM_CHANNEL, (_, ...args: [string, string]) => 
    ProjectService.renameItem(...args));

  // Script Management
  ipcMain.handle(PROJECT_SAVE_SCRIPT_FILE_CHANNEL, (_, ...args: [string, string, string]) => 
    ProjectService.saveScriptFile(...args));
  ipcMain.handle(PROJECT_OPEN_SCRIPT_IN_EDITOR_CHANNEL, (_, ...args: [string, string]) => 
    ProjectService.openScriptInEditor(...args));
} 