import { RegistryItem } from "./types";

export class Registry<T = any> {
  private items = new Map<string, RegistryItem<T>>();
  private nameIndex = new Map<string, string>();
  private tagIndex = new Map<string, Set<string>>();

  add(id: string, name: string, item: T, metadata?: Record<string, any>): void {
    console.log("Adding item to registry", id, name, item, metadata);
    if (this.items.has(id)) {
      throw new Error(`Item with id '${id}' already exists in registry`);
    }

    const registryItem: RegistryItem<T> = {
      id,
      name,
      item,
      metadata,
    };

    this.items.set(id, registryItem);
    this.nameIndex.set(name, id);

    if (metadata?.tags) {
      metadata.tags.forEach((tag: string) => {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(id);
      });
    }
  }

  get(id: string): T | undefined {
    return this.items.get(id)?.item;
  }

  getByName(name: string): T | undefined {
    const id = this.nameIndex.get(name);
    return id ? this.get(id) : undefined;
  }

  getById(id: string): RegistryItem<T> | undefined {
    return this.items.get(id);
  }

  getByTag(tag: string): T[] {
    const ids = this.tagIndex.get(tag);
    if (!ids) return [];
    
    return Array.from(ids)
      .map(id => this.get(id))
      .filter(Boolean) as T[];
  }

  update(id: string, updates: Partial<RegistryItem<T>>): boolean {
    const item = this.items.get(id);
    if (!item) return false;

    if (updates.name && updates.name !== item.name) {
      this.nameIndex.delete(item.name);
      this.nameIndex.set(updates.name, id);
    }

    Object.assign(item, updates);
    return true;
  }

  remove(id: string): boolean {
    const item = this.items.get(id);
    if (!item) return false;

    this.items.delete(id);
    this.nameIndex.delete(item.name);

    if (item.metadata?.tags) {
      item.metadata.tags.forEach((tag: string) => {
        const tagSet = this.tagIndex.get(tag);
        if (tagSet) {
          tagSet.delete(id);
          if (tagSet.size === 0) {
            this.tagIndex.delete(tag);
          }
        }
      });
    }

    return true;
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  hasName(name: string): boolean {
    return this.nameIndex.has(name);
  }

  size(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
    this.nameIndex.clear();
    this.tagIndex.clear();
  }

  getAllIds(): string[] {
    return Array.from(this.items.keys());
  }

  getAllItems(): T[] {
    return Array.from(this.items.values()).map(item => item.item);
  }

  getAllRegistryItems(): RegistryItem<T>[] {
    return Array.from(this.items.values());
  }

  findByPredicate(predicate: (item: T) => boolean): T[] {
    return this.getAllItems().filter(predicate);
  }

  forEach(callback: (item: T, id: string) => void): void {
    this.items.forEach((registryItem, id) => {
      callback(registryItem.item, id);
    });
  }

  swap(id1: string, id2: string): boolean {
    const item1 = this.items.get(id1);
    const item2 = this.items.get(id2);
    
    if (!item1 || !item2) return false;

    this.items.set(id1, { ...item1, item: item2.item });
    this.items.set(id2, { ...item2, item: item1.item });
    
    return true;
  }
}

export class RegistryManager {
  private registries = new Map<string, Registry<any>>();

  createRegistry<T>(name: string): Registry<T> {
    if (this.registries.has(name)) {
      throw new Error(`Registry '${name}' already exists`);
    }

    const registry = new Registry<T>();
    this.registries.set(name, registry);
    return registry;
  }

  getRegistry<T>(name: string): Registry<T> | undefined {
    return this.registries.get(name);
  }

  hasRegistry(name: string): boolean {
    return this.registries.has(name);
  }

  removeRegistry(name: string): boolean {
    return this.registries.delete(name);
  }

  clearAll(): void {
    this.registries.forEach(registry => registry.clear());
    this.registries.clear();
  }

  getAllRegistryNames(): string[] {
    return Array.from(this.registries.keys());
  }

  getTotalItemCount(): number {
    return Array.from(this.registries.values())
      .reduce((total, registry) => total + registry.size(), 0);
  }
} 