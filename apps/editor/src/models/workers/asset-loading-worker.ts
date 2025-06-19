// Asset Loading Worker
// Handles background loading of assets to avoid blocking the main thread

interface LoadingTask {
  id: string;
  type: 'texture' | 'model' | 'audio';
  url: string;
  options?: any;
}

interface LoadingProgress {
  id: string;
  progress: number;
  loaded: number;
  total: number;
}

class AssetLoadingWorker {
  private loadingTasks = new Map<string, LoadingTask>();
  private abortControllers = new Map<string, AbortController>();

  constructor() {
    self.onmessage = this.handleMessage.bind(this);
  }

  private async handleMessage(event: MessageEvent): Promise<void> {
    const { type, data } = event.data;

    try {
      switch (type) {
        case 'loadAsset':
          await this.loadAsset(data);
          break;
        case 'cancelLoad':
          this.cancelLoad(data.id);
          break;
        case 'prioritizeLoad':
          this.prioritizeLoad(data.id, data.priority);
          break;
        default:
          console.warn(`Unknown message type: ${type}`);
      }
    } catch (error) {
      self.postMessage({
        type: 'error',
        id: data.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async loadAsset(task: LoadingTask): Promise<void> {
    const { id, type, url, options = {} } = task;
    
    this.loadingTasks.set(id, task);
    const abortController = new AbortController();
    this.abortControllers.set(id, abortController);

    try {
      let result: ArrayBuffer;

      switch (type) {
        case 'texture':
          result = await this.loadTexture(url, options, abortController.signal);
          break;
        case 'model':
          result = await this.loadModel(url, options, abortController.signal);
          break;
        case 'audio':
          result = await this.loadAudio(url, options, abortController.signal);
          break;
        default:
          throw new Error(`Unsupported asset type: ${type}`);
      }

      // Send success response
      self.postMessage({
        type: 'assetLoaded',
        id,
        result,
        size: result.byteLength,
      });

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        self.postMessage({
          type: 'loadCancelled',
          id,
        });
      } else {
        self.postMessage({
          type: 'loadError',
          id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } finally {
      this.loadingTasks.delete(id);
      this.abortControllers.delete(id);
    }
  }

  private async loadTexture(
    url: string, 
    options: any, 
    signal: AbortSignal
  ): Promise<ArrayBuffer> {
    const response = await fetch(url, { 
      signal,
      headers: {
        'Accept': 'image/webp,image/avif,image/jpeg,image/png,*/*',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load texture: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const contentLength = response.headers.get('Content-Length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;

    const chunks: Uint8Array[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        loaded += value.length;

        // Report progress
        if (total > 0) {
          self.postMessage({
            type: 'loadProgress',
            id: url,
            progress: (loaded / total) * 100,
            loaded,
            total,
          } as LoadingProgress);
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Combine chunks into single ArrayBuffer
    const result = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result.buffer;
  }

  private async loadModel(
    url: string, 
    options: any, 
    signal: AbortSignal
  ): Promise<ArrayBuffer> {
    const response = await fetch(url, { 
      signal,
      headers: {
        'Accept': 'model/gltf-binary,model/gltf+json,application/octet-stream',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load model: ${response.statusText}`);
    }

    return this.loadWithProgress(response, url);
  }

  private async loadAudio(
    url: string, 
    options: any, 
    signal: AbortSignal
  ): Promise<ArrayBuffer> {
    const response = await fetch(url, { 
      signal,
      headers: {
        'Accept': 'audio/webm,audio/ogg,audio/mpeg,audio/wav,*/*',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load audio: ${response.statusText}`);
    }

    return this.loadWithProgress(response, url);
  }

  private async loadWithProgress(response: Response, id: string): Promise<ArrayBuffer> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const contentLength = response.headers.get('Content-Length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;

    const chunks: Uint8Array[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        loaded += value.length;

        // Report progress
        if (total > 0) {
          self.postMessage({
            type: 'loadProgress',
            id,
            progress: (loaded / total) * 100,
            loaded,
            total,
          } as LoadingProgress);
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Combine chunks into single ArrayBuffer
    const result = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result.buffer;
  }

  private cancelLoad(id: string): void {
    const abortController = this.abortControllers.get(id);
    if (abortController) {
      abortController.abort();
    }
  }

  private prioritizeLoad(id: string, priority: number): void {
    // In a more sophisticated implementation, you might reorder loading queues
    // For now, just acknowledge the priority change
    self.postMessage({
      type: 'priorityUpdated',
      id,
      priority,
    });
  }
}

// Initialize the worker
new AssetLoadingWorker(); 