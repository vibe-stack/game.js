import { ScriptManager } from "../script-manager";

export class EntityScripts {
  private entity: { entityId: string };
  private scriptManager: ScriptManager | null = null;
  private attachedScripts: string[] = [];
  private emitChange: () => void;

  constructor(
    entity: { entityId: string },
    emitChange: () => void
  ) {
    this.entity = entity;
    this.emitChange = emitChange;
  }

  public setScriptManager(scriptManager: ScriptManager): void {
    this.scriptManager = scriptManager;
  }

  public serializeScripts() {
    if (!this.scriptManager || this.attachedScripts.length === 0) return undefined;
    
    return this.attachedScripts.map(scriptId => ({
      scriptId,
      parameters: this.scriptManager!.getScriptParameters(this.entity.entityId, scriptId)
    }));
  }

  public attachScript(scriptId: string): boolean {
    if (!this.scriptManager) {
      console.warn(`Cannot attach script ${scriptId}: ScriptManager not set on entity ${this.entity.entityId}`);
      return false;
    }

    if (this.scriptManager.attachScript(this.entity.entityId, scriptId)) {
      if (!this.attachedScripts.includes(scriptId)) {
        this.attachedScripts.push(scriptId);
      }
      this.emitChange();
      return true;
    }
    return false;
  }

  public detachScript(scriptId: string): boolean {
    if (!this.scriptManager) return false;

    if (this.scriptManager.detachScript(this.entity.entityId, scriptId)) {
      const index = this.attachedScripts.indexOf(scriptId);
      if (index > -1) {
        this.attachedScripts.splice(index, 1);
      }
      this.emitChange();
      return true;
    }
    return false;
  }

  public getAttachedScripts(): string[] {
    return [...this.attachedScripts];
  }

  public hasScript(scriptId: string): boolean {
    return this.attachedScripts.includes(scriptId);
  }

  public detachAllScripts(): void {
    const scriptsToDetach = [...this.attachedScripts];
    for (const scriptId of scriptsToDetach) {
      this.detachScript(scriptId);
    }
  }

  public destroy(): void {
    this.detachAllScripts();
  }
} 