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
    const baseData = this.serializeBase();
    return {
      ...baseData,
      type: "group",
    };
  }

  protected createCollider(): void {
    // Groups don't have their own collider by default.
    // Children can have their own colliders.
  }
} 