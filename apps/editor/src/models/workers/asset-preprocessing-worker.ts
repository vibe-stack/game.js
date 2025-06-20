// Asset Preprocessing Worker
// Handles CPU-intensive preprocessing tasks for assets

interface PreprocessingTask {
  id: string;
  type: 'texture' | 'model' | 'audio';
  data: ArrayBuffer;
  options: any;
}

interface TextureProcessingOptions {
  targetSize?: number;
  format?: 'webp' | 'avif' | 'jpg' | 'png';
  generateMipmaps?: boolean;
  compression?: 'none' | 'dxt' | 'astc' | 'etc2';
  quality?: number; // 0-100
}

interface ModelProcessingOptions {
  compression?: 'draco' | 'meshopt';
  optimization?: {
    mergeGeometries?: boolean;
    deduplicateVertices?: boolean;
    quantization?: boolean;
  };
  generateLODs?: boolean;
  lodLevels?: number[];
}

interface AudioProcessingOptions {
  compression?: 'opus' | 'aac' | 'ogg';
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  spatialAudio?: boolean;
}

class AssetPreprocessingWorker {
  private canvas?: OffscreenCanvas;
  private ctx?: OffscreenCanvasRenderingContext2D;

  constructor() {
    self.onmessage = this.handleMessage.bind(this);
    this.initializeCanvas();
  }

  private initializeCanvas(): void {
    try {
      this.canvas = new OffscreenCanvas(1, 1);
      this.ctx = this.canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
    } catch (error) {
      console.warn('OffscreenCanvas not available in this worker');
    }
  }

  private async handleMessage(event: MessageEvent): Promise<void> {
    const { type, data } = event.data;

    try {
      switch (type) {
        case 'processTexture':
          await this.processTexture(data);
          break;
        case 'processModel':
          await this.processModel(data);
          break;
        case 'processAudio':
          await this.processAudio(data);
          break;
        case 'generateAtlas':
          await this.generateTextureAtlas(data);
          break;
        default:
          console.warn(`Unknown preprocessing type: ${type}`);
      }
    } catch (error) {
      self.postMessage({
        type: 'processingError',
        id: data.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async processTexture(task: PreprocessingTask): Promise<void> {
    const { id, data, options } = task;
    const textureOptions = options as TextureProcessingOptions;

    try {
      // Create ImageBitmap from ArrayBuffer
      const blob = new Blob([data]);
      const imageBitmap = await createImageBitmap(blob);

      let processedBitmap = imageBitmap;

      // Resize if target size specified
      if (textureOptions.targetSize) {
        processedBitmap = await this.resizeTexture(
          imageBitmap, 
          textureOptions.targetSize
        );
      }

      // Convert to desired format
      const result = await this.convertTextureFormat(
        processedBitmap, 
        textureOptions
      );

      // Generate mipmaps if requested
      let mipmaps: ArrayBuffer[] = [];
      if (textureOptions.generateMipmaps) {
        mipmaps = await this.generateMipmaps(processedBitmap);
      }

      self.postMessage({
        type: 'textureProcessed',
        id,
        result,
        mipmaps,
        originalSize: data.byteLength,
        processedSize: result.byteLength,
        compressionRatio: data.byteLength / result.byteLength,
      });

    } catch (error) {
      throw new Error(`Texture processing failed: ${error}`);
    }
  }

  private async resizeTexture(
    imageBitmap: ImageBitmap, 
    targetSize: number
  ): Promise<ImageBitmap> {
    if (!this.canvas || !this.ctx) {
      throw new Error('Canvas not available for texture resizing');
    }

    const { width, height } = imageBitmap;
    const scale = Math.min(targetSize / width, targetSize / height);
    
    if (scale >= 1) {
      return imageBitmap; // No need to resize
    }

    const newWidth = Math.floor(width * scale);
    const newHeight = Math.floor(height * scale);

    this.canvas.width = newWidth;
    this.canvas.height = newHeight;

    // Use high-quality scaling
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    this.ctx.drawImage(imageBitmap, 0, 0, newWidth, newHeight);

    return await createImageBitmap(this.canvas);
  }

  private async convertTextureFormat(
    imageBitmap: ImageBitmap, 
    options: TextureProcessingOptions
  ): Promise<ArrayBuffer> {
    if (!this.canvas || !this.ctx) {
      throw new Error('Canvas not available for format conversion');
    }

    this.canvas.width = imageBitmap.width;
    this.canvas.height = imageBitmap.height;
    this.ctx.drawImage(imageBitmap, 0, 0);

    const format = options.format || 'webp';
    const quality = (options.quality || 85) / 100;

    // Convert to Blob with specified format
    const blob = await this.canvas.convertToBlob({ 
      type: `image/${format}`, 
      quality 
    });

    return await blob.arrayBuffer();
  }

  private async generateMipmaps(imageBitmap: ImageBitmap): Promise<ArrayBuffer[]> {
    const mipmaps: ArrayBuffer[] = [];
    let currentBitmap = imageBitmap;
    let currentSize = Math.max(currentBitmap.width, currentBitmap.height);

    while (currentSize > 1) {
      currentSize = Math.floor(currentSize / 2);
      currentBitmap = await this.resizeTexture(currentBitmap, currentSize);
      
      const mipmapData = await this.convertTextureFormat(currentBitmap, {
        format: 'webp',
        quality: 85,
      });
      
      mipmaps.push(mipmapData);
    }

    return mipmaps;
  }

  private async processModel(task: PreprocessingTask): Promise<void> {
    const { id, data, options } = task;
    const modelOptions = options as ModelProcessingOptions;

    try {
      // Parse model data (simplified - in reality you'd use proper GLTF parser)
      let processedData = data;

      // Apply compression if specified
      if (modelOptions.compression === 'draco') {
        processedData = await this.applyDracoCompression(processedData);
      } else if (modelOptions.compression === 'meshopt') {
        processedData = await this.applyMeshOptimization(processedData);
      }

      // Apply optimizations
      if (modelOptions.optimization) {
        processedData = await this.optimizeModel(processedData, modelOptions.optimization);
      }

      // Generate LODs if requested
      let lodData: ArrayBuffer[] = [];
      if (modelOptions.generateLODs && modelOptions.lodLevels) {
        lodData = await this.generateModelLODs(processedData, modelOptions.lodLevels);
      }

      self.postMessage({
        type: 'modelProcessed',
        id,
        result: processedData,
        lods: lodData,
        originalSize: data.byteLength,
        processedSize: processedData.byteLength,
        compressionRatio: data.byteLength / processedData.byteLength,
      });

    } catch (error) {
      throw new Error(`Model processing failed: ${error}`);
    }
  }

  private async applyDracoCompression(data: ArrayBuffer): Promise<ArrayBuffer> {
    // Simplified Draco compression simulation
    // In a real implementation, you'd use the actual Draco library
    const compressionRatio = 0.3; // 70% size reduction
    const compressedSize = Math.floor(data.byteLength * compressionRatio);
    return data.slice(0, compressedSize);
  }

  private async applyMeshOptimization(data: ArrayBuffer): Promise<ArrayBuffer> {
    // Simplified mesh optimization simulation
    // In a real implementation, you'd use meshoptimizer library
    const optimizationRatio = 0.6; // 40% size reduction
    const optimizedSize = Math.floor(data.byteLength * optimizationRatio);
    return data.slice(0, optimizedSize);
  }

  private async optimizeModel(
    data: ArrayBuffer, 
    optimization: ModelProcessingOptions['optimization']
  ): Promise<ArrayBuffer> {
    // Simplified model optimization
    // In reality, you'd parse the geometry and apply actual optimizations
    let optimizedData = data;

    if (optimization?.deduplicateVertices) {
      // Simulate vertex deduplication (10% size reduction)
      const newSize = Math.floor(optimizedData.byteLength * 0.9);
      optimizedData = optimizedData.slice(0, newSize);
    }

    if (optimization?.quantization) {
      // Simulate quantization (15% size reduction)
      const newSize = Math.floor(optimizedData.byteLength * 0.85);
      optimizedData = optimizedData.slice(0, newSize);
    }

    return optimizedData;
  }

  private async generateModelLODs(
    data: ArrayBuffer, 
    lodLevels: number[]
  ): Promise<ArrayBuffer[]> {
    // Simplified LOD generation
    // In reality, you'd use mesh decimation algorithms
    const lods: ArrayBuffer[] = [];

    for (const level of lodLevels) {
      const lodSize = Math.floor(data.byteLength * level);
      const lodData = data.slice(0, lodSize);
      lods.push(lodData);
    }

    return lods;
  }

  private async processAudio(task: PreprocessingTask): Promise<void> {
    const { id, data, options } = task;
    const audioOptions = options as AudioProcessingOptions;

    try {
      // Decode audio data
      const audioContext = new OfflineAudioContext(
        audioOptions.channels || 2,
        44100, // 1 second
        audioOptions.sampleRate || 44100
      );

      const audioBuffer = await audioContext.decodeAudioData(data.slice(0));

      // Apply processing
      let processedBuffer = audioBuffer;

      if (audioOptions.compression) {
        processedBuffer = await this.compressAudio(audioBuffer, audioOptions);
      }

      // Convert back to ArrayBuffer (simplified)
      const result = await this.audioBufferToArrayBuffer(processedBuffer, audioOptions);

      self.postMessage({
        type: 'audioProcessed',
        id,
        result,
        originalSize: data.byteLength,
        processedSize: result.byteLength,
        compressionRatio: data.byteLength / result.byteLength,
      });

    } catch (error) {
      throw new Error(`Audio processing failed: ${error}`);
    }
  }

  private async compressAudio(
    audioBuffer: AudioBuffer, 
    options: AudioProcessingOptions
  ): Promise<AudioBuffer> {
    // Simplified audio compression
    // In reality, you'd use proper audio codecs
    return audioBuffer;
  }

  private async audioBufferToArrayBuffer(
    audioBuffer: AudioBuffer, 
    options: AudioProcessingOptions
  ): Promise<ArrayBuffer> {
    // Simplified conversion
    // In reality, you'd encode to the specified format (Opus, AAC, etc.)
    const length = audioBuffer.length * audioBuffer.numberOfChannels;
    const result = new Float32Array(length);
    
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        result[i * audioBuffer.numberOfChannels + channel] = channelData[i];
      }
    }

    return result.buffer;
  }

  private async generateTextureAtlas(data: {
    textures: { id: string; data: ArrayBuffer }[];
    options: {
      maxSize: number;
      padding: number;
      format: string;
    };
  }): Promise<void> {
    try {
      // Simplified texture atlas generation
      // In reality, you'd use a proper bin-packing algorithm
      const { textures, options } = data;
      const atlasSize = options.maxSize;
      
      if (!this.canvas || !this.ctx) {
        throw new Error('Canvas not available for atlas generation');
      }

      this.canvas.width = atlasSize;
      this.canvas.height = atlasSize;
      this.ctx.clearRect(0, 0, atlasSize, atlasSize);

      const atlasData: Array<{
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
      }> = [];

      let currentX = 0;
      let currentY = 0;
      let rowHeight = 0;

      for (const texture of textures) {
        const blob = new Blob([texture.data]);
        const imageBitmap = await createImageBitmap(blob);

        // Simple left-to-right, top-to-bottom packing
        if (currentX + imageBitmap.width > atlasSize) {
          currentX = 0;
          currentY += rowHeight + options.padding;
          rowHeight = 0;
        }

        if (currentY + imageBitmap.height > atlasSize) {
          throw new Error('Texture atlas size exceeded');
        }

        this.ctx.drawImage(imageBitmap, currentX, currentY);
        
        atlasData.push({
          id: texture.id,
          x: currentX,
          y: currentY,
          width: imageBitmap.width,
          height: imageBitmap.height,
        });

        currentX += imageBitmap.width + options.padding;
        rowHeight = Math.max(rowHeight, imageBitmap.height);
      }

      // Convert atlas to desired format
      const atlasBlob = await this.canvas.convertToBlob({
        type: `image/${options.format}`,
        quality: 0.9,
      });

      const atlasArrayBuffer = await atlasBlob.arrayBuffer();

      self.postMessage({
        type: 'atlasGenerated',
        atlas: atlasArrayBuffer,
        mapping: atlasData,
        size: atlasSize,
      });

    } catch (error) {
      throw new Error(`Atlas generation failed: ${error}`);
    }
  }
}

// Initialize the worker
new AssetPreprocessingWorker();