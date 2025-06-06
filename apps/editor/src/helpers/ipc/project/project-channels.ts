export const PROJECT_CHANNELS = {
  LOAD_PROJECTS: 'project:load-projects',
  CREATE_PROJECT: 'project:create-project',
  INSTALL_PACKAGES: 'project:install-packages',
  START_DEV_SERVER: 'project:start-dev-server',
  STOP_DEV_SERVER: 'project:stop-dev-server',
  OPEN_PROJECT_FOLDER: 'project:open-project-folder',
  IS_DEV_SERVER_RUNNING: 'project:is-dev-server-running',
  GET_SERVER_INFO: 'project:get-server-info',
  
  // Editor integration channels
  CONNECT_TO_EDITOR: 'project:connect-to-editor',
  SEND_PROPERTY_UPDATE: 'project:send-property-update',
  GET_SCENE_INFO: 'project:get-scene-info',
} as const; 