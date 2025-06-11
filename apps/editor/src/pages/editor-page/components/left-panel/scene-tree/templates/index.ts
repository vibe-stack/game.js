import { geometryTemplates } from './geometry-templates';
import { cameraTemplates } from './camera-templates';
import { lightTemplates } from './light-templates';
import { utilityTemplates } from './utility-templates';

export const gameObjectTemplates = [
  ...geometryTemplates,
  ...cameraTemplates,
  ...lightTemplates,
  ...utilityTemplates
]; 