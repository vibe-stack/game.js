import { isLegacyMaterial, upgradeMaterialComponent } from './material-compatibility';

// Recursively upgrade all legacy materials in a GameObject tree
export function upgradeGameObjectMaterials(obj: GameObject): GameObject {
  const upgradedComponents = obj.components.map(component => {
    if (component.type === 'Mesh' && isLegacyMaterial(component)) {
      return upgradeMaterialComponent(component);
    }
    return component;
  });

  const upgradedChildren = obj.children.map(child => 
    upgradeGameObjectMaterials(child)
  );

  return {
    ...obj,
    components: upgradedComponents,
    children: upgradedChildren
  };
}

// Upgrade all materials in a scene
export function upgradeSceneMaterials(scene: GameScene): GameScene {
  const upgradedObjects = scene.objects.map(obj => 
    upgradeGameObjectMaterials(obj)
  );

  return {
    ...scene,
    objects: upgradedObjects,
    metadata: {
      ...scene.metadata,
      modified: new Date(),
      version: scene.metadata.version + '.upgraded'
    }
  };
}

// Check if a scene contains any legacy materials
export function sceneHasLegacyMaterials(scene: GameScene): boolean {
  function checkObjectForLegacyMaterials(obj: GameObject): boolean {
    const hasLegacyComponent = obj.components.some(component => 
      component.type === 'Mesh' && isLegacyMaterial(component)
    );
    
    if (hasLegacyComponent) return true;
    
    return obj.children.some(child => checkObjectForLegacyMaterials(child));
  }

  return scene.objects.some(obj => checkObjectForLegacyMaterials(obj));
}

// Get statistics about legacy materials in a scene
export function getLegacyMaterialStats(scene: GameScene): {
  totalMeshComponents: number;
  legacyMeshComponents: number;
  modernMeshComponents: number;
} {
  let totalMeshComponents = 0;
  let legacyMeshComponents = 0;
  let modernMeshComponents = 0;

  function countInObject(obj: GameObject) {
    obj.components.forEach(component => {
      if (component.type === 'Mesh') {
        totalMeshComponents++;
        if (isLegacyMaterial(component)) {
          legacyMeshComponents++;
        } else {
          modernMeshComponents++;
        }
      }
    });
    
    obj.children.forEach(child => countInObject(child));
  }

  scene.objects.forEach(obj => countInObject(obj));

  return {
    totalMeshComponents,
    legacyMeshComponents,
    modernMeshComponents
  };
} 