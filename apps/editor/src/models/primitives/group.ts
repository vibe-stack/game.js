import { Entity } from "../entity";
import { EntityConfig } from "../types";
import { EntityData } from "../scene-loader";

export class Group extends Entity {
  constructor(config: EntityConfig = {}) {
    super(config);
    this.metadata.type = "group";
    this.addTag("group");
  }

  serialize(): EntityData {
    return {
      id: this.entityId,
      name: this.entityName,
      type: "group",
      transform: {
        position: { x: this.position.x, y: this.position.y, z: this.position.z },
        rotation: { x: this.rotation.x, y: this.rotation.y, z: this.rotation.z },
        scale: { x: this.scale.x, y: this.scale.y, z: this.scale.z },
      },
      visible: this.visible,
      castShadow: false,
      receiveShadow: false,
      userData: { ...this.userData },
      tags: [...this.metadata.tags],
      layer: this.metadata.layer,
      physics: this.serializePhysics(),
      characterController: this.serializeCharacterController(),
      scripts: this.serializeScripts(),
      children: [], // Will be populated by scene serializer
    };
  }

  protected createCollider(_config: any): void {
    // A group has no physical body by default.
    // Colliders can be added via child entities.
  }
} 