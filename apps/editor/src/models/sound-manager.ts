import * as THREE from "three/webgpu";

export interface SoundConfig {
  id: string;
  url?: string;
  buffer?: AudioBuffer;
  volume?: number;
  loop?: boolean;
  autoplay?: boolean;
  spatial?: boolean;
  maxDistance?: number;
  rolloffFactor?: number;
  refDistance?: number;
  category?: string; // For grouping sounds (music, sfx, voice, etc.)
}

export interface SoundInstance {
  id: string;
  config: SoundConfig;
  source: AudioBufferSourceNode | null;
  gainNode: GainNode;
  pannerNode?: PannerNode;
  analyser?: AnalyserNode;
  isPlaying: boolean;
  isPaused: boolean;
  startTime: number;
  pauseTime: number;
  duration: number;
  position?: THREE.Vector3;
}

export interface AudioCategory {
  name: string;
  volume: number;
  muted: boolean;
  sounds: Set<string>;
}

export class SoundManager {
  private audioContext!: AudioContext;
  private masterGainNode!: GainNode;
  private listener!: AudioListener;
  private sounds = new Map<string, SoundInstance>();
  private categories = new Map<string, AudioCategory>();
  private loadedBuffers = new Map<string, AudioBuffer>();
  private isInitialized = false;
  
  // Global settings
  private masterVolume = 1.0;
  private masterMuted = false;

  constructor() {
    // Create default categories
    this.createCategory('master', 1.0);
    this.createCategory('music', 0.8);
    this.createCategory('sfx', 1.0);
    this.createCategory('voice', 1.0);
    this.createCategory('ui', 0.7);
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create audio context (requires user interaction in most browsers)
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create master gain node
      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.connect(this.audioContext.destination);
      
      // Create audio listener for 3D audio
      this.listener = new AudioListener();
      
      // Resume context if suspended (common on mobile)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize SoundManager:', error);
      throw error;
    }
  }

  public async loadSound(config: SoundConfig): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!config.url && !config.buffer) {
      throw new Error('Sound config must have either url or buffer');
    }

    let buffer: AudioBuffer;

    if (config.buffer) {
      buffer = config.buffer;
    } else if (config.url) {
      // Check if already loaded
      if (this.loadedBuffers.has(config.url)) {
        buffer = this.loadedBuffers.get(config.url)!;
      } else {
        buffer = await this.loadAudioBuffer(config.url);
        this.loadedBuffers.set(config.url, buffer);
      }
    } else {
      throw new Error('No audio source provided');
    }

    // Create sound instance
    const soundInstance: SoundInstance = {
      id: config.id,
      config: { ...config },
      source: null,
      gainNode: this.audioContext.createGain(),
      isPlaying: false,
      isPaused: false,
      startTime: 0,
      pauseTime: 0,
      duration: buffer.duration,
    };

    // Setup spatial audio if enabled
    if (config.spatial) {
      soundInstance.pannerNode = this.audioContext.createPanner();
      soundInstance.pannerNode.panningModel = 'HRTF';
      soundInstance.pannerNode.distanceModel = 'inverse';
      soundInstance.pannerNode.maxDistance = config.maxDistance || 1000;
      soundInstance.pannerNode.rolloffFactor = config.rolloffFactor || 1;
      soundInstance.pannerNode.refDistance = config.refDistance || 1;
    }

    // Setup analyser for visualization
    soundInstance.analyser = this.audioContext.createAnalyser();
    soundInstance.analyser.fftSize = 256;

    // Set initial volume
    soundInstance.gainNode.gain.value = config.volume || 1.0;

    // Connect audio graph
    this.connectAudioNodes(soundInstance);

    // Add to category
    const category = config.category || 'sfx';
    this.addSoundToCategory(config.id, category);

    this.sounds.set(config.id, soundInstance);

    // Auto-play if configured
    if (config.autoplay) {
      await this.play(config.id);
    }
  }

  private async loadAudioBuffer(url: string): Promise<AudioBuffer> {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      throw new Error(`Failed to load audio from ${url}: ${error}`);
    }
  }

  private connectAudioNodes(soundInstance: SoundInstance): void {
    const nodes: AudioNode[] = [soundInstance.gainNode];

    if (soundInstance.pannerNode) {
      nodes.push(soundInstance.pannerNode);
    }

    if (soundInstance.analyser) {
      nodes.push(soundInstance.analyser);
    }

    // Connect in sequence
    let previousNode: AudioNode = soundInstance.gainNode;
    for (let i = 1; i < nodes.length; i++) {
      previousNode.connect(nodes[i]);
      previousNode = nodes[i];
    }

    // Connect to master
    previousNode.connect(this.masterGainNode);
  }

  public async play(soundId: string, options?: {
    volume?: number;
    loop?: boolean;
    startTime?: number;
    position?: THREE.Vector3;
  }): Promise<void> {
    const soundInstance = this.sounds.get(soundId);
    if (!soundInstance) {
      throw new Error(`Sound ${soundId} not found`);
    }

    if (soundInstance.isPlaying) {
      this.stop(soundId);
    }

    const buffer = this.getBufferForSound(soundInstance);
    if (!buffer) {
      throw new Error(`No buffer available for sound ${soundId}`);
    }

    // Create new source
    soundInstance.source = this.audioContext.createBufferSource();
    soundInstance.source.buffer = buffer;
    soundInstance.source.loop = options?.loop ?? soundInstance.config.loop ?? false;

    // Connect source to gain node
    soundInstance.source.connect(soundInstance.gainNode);

    // Set position if spatial
    if (soundInstance.pannerNode && options?.position) {
      this.setSoundPosition(soundId, options.position);
    }

    // Set volume if provided
    if (options?.volume !== undefined) {
      soundInstance.gainNode.gain.value = options.volume;
    }

    // Start playback
    const startTime = options?.startTime || 0;
    soundInstance.source.start(0, startTime);
    soundInstance.startTime = this.audioContext.currentTime - startTime;
    soundInstance.isPlaying = true;
    soundInstance.isPaused = false;

    // Handle playback end
    soundInstance.source.onended = () => {
      if (soundInstance.isPlaying) {
        soundInstance.isPlaying = false;
        soundInstance.source = null;
      }
    };
  }

  public pause(soundId: string): void {
    const soundInstance = this.sounds.get(soundId);
    if (!soundInstance || !soundInstance.isPlaying) return;

    soundInstance.pauseTime = this.audioContext.currentTime - soundInstance.startTime;
    this.stop(soundId);
    soundInstance.isPaused = true;
  }

  public resume(soundId: string): void {
    const soundInstance = this.sounds.get(soundId);
    if (!soundInstance || !soundInstance.isPaused) return;

    this.play(soundId, {
      startTime: soundInstance.pauseTime,
      volume: soundInstance.gainNode.gain.value,
    });
    soundInstance.isPaused = false;
  }

  public stop(soundId: string): void {
    const soundInstance = this.sounds.get(soundId);
    if (!soundInstance || !soundInstance.source) return;

    try {
      soundInstance.source.stop();
    } catch (_e) {
      // Source might already be stopped
    }

    soundInstance.source = null;
    soundInstance.isPlaying = false;
    soundInstance.isPaused = false;
    soundInstance.pauseTime = 0;
  }

  public setVolume(soundId: string, volume: number): void {
    const soundInstance = this.sounds.get(soundId);
    if (!soundInstance) return;

    soundInstance.gainNode.gain.setValueAtTime(
      Math.max(0, Math.min(1, volume)),
      this.audioContext.currentTime
    );
  }

  public getVolume(soundId: string): number {
    const soundInstance = this.sounds.get(soundId);
    return soundInstance?.gainNode.gain.value || 0;
  }

  public setSoundPosition(soundId: string, position: THREE.Vector3): void {
    const soundInstance = this.sounds.get(soundId);
    if (!soundInstance?.pannerNode) return;

    soundInstance.position = position.clone();
    soundInstance.pannerNode.positionX.setValueAtTime(position.x, this.audioContext.currentTime);
    soundInstance.pannerNode.positionY.setValueAtTime(position.y, this.audioContext.currentTime);
    soundInstance.pannerNode.positionZ.setValueAtTime(position.z, this.audioContext.currentTime);
  }

  public setListenerPosition(position: THREE.Vector3, forward?: THREE.Vector3, up?: THREE.Vector3): void {
    if (!this.listener) return;

    this.listener.positionX.setValueAtTime(position.x, this.audioContext.currentTime);
    this.listener.positionY.setValueAtTime(position.y, this.audioContext.currentTime);
    this.listener.positionZ.setValueAtTime(position.z, this.audioContext.currentTime);

    if (forward) {
      this.listener.forwardX.setValueAtTime(forward.x, this.audioContext.currentTime);
      this.listener.forwardY.setValueAtTime(forward.y, this.audioContext.currentTime);
      this.listener.forwardZ.setValueAtTime(forward.z, this.audioContext.currentTime);
    }

    if (up) {
      this.listener.upX.setValueAtTime(up.x, this.audioContext.currentTime);
      this.listener.upY.setValueAtTime(up.y, this.audioContext.currentTime);
      this.listener.upZ.setValueAtTime(up.z, this.audioContext.currentTime);
    }
  }

  // Category management
  public createCategory(name: string, volume: number = 1.0): void {
    this.categories.set(name, {
      name,
      volume,
      muted: false,
      sounds: new Set(),
    });
  }

  public setCategoryVolume(categoryName: string, volume: number): void {
    const category = this.categories.get(categoryName);
    if (!category) return;

    category.volume = Math.max(0, Math.min(1, volume));
    
    // Update all sounds in category
    category.sounds.forEach(soundId => {
      const soundInstance = this.sounds.get(soundId);
      if (soundInstance) {
        const effectiveVolume = soundInstance.config.volume || 1.0;
        soundInstance.gainNode.gain.value = effectiveVolume * category.volume;
      }
    });
  }

  public muteCategory(categoryName: string, muted: boolean = true): void {
    const category = this.categories.get(categoryName);
    if (!category) return;

    category.muted = muted;
    
    // Update all sounds in category
    category.sounds.forEach(soundId => {
      const soundInstance = this.sounds.get(soundId);
      if (soundInstance) {
        const effectiveVolume = muted ? 0 : (soundInstance.config.volume || 1.0) * category.volume;
        soundInstance.gainNode.gain.value = effectiveVolume;
      }
    });
  }

  private addSoundToCategory(soundId: string, categoryName: string): void {
    const category = this.categories.get(categoryName);
    if (category) {
      category.sounds.add(soundId);
    }
  }

  // Master controls
  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.masterGainNode.gain.setValueAtTime(this.masterMuted ? 0 : this.masterVolume, this.audioContext.currentTime);
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public muteMaster(muted: boolean = true): void {
    this.masterMuted = muted;
    this.masterGainNode.gain.setValueAtTime(muted ? 0 : this.masterVolume, this.audioContext.currentTime);
  }

  public isMasterMuted(): boolean {
    return this.masterMuted;
  }

  // Utility methods
  public isPlaying(soundId: string): boolean {
    return this.sounds.get(soundId)?.isPlaying || false;
  }

  public isPaused(soundId: string): boolean {
    return this.sounds.get(soundId)?.isPaused || false;
  }

  public getDuration(soundId: string): number {
    return this.sounds.get(soundId)?.duration || 0;
  }

  public getCurrentTime(soundId: string): number {
    const soundInstance = this.sounds.get(soundId);
    if (!soundInstance || !soundInstance.isPlaying) return 0;
    
    return this.audioContext.currentTime - soundInstance.startTime;
  }

  public getLoadedSounds(): string[] {
    return Array.from(this.sounds.keys());
  }

  public getAnalyserData(soundId: string): Uint8Array | null {
    const soundInstance = this.sounds.get(soundId);
    if (!soundInstance?.analyser) return null;

    const dataArray = new Uint8Array(soundInstance.analyser.frequencyBinCount);
    soundInstance.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  private getBufferForSound(soundInstance: SoundInstance): AudioBuffer | null {
    if (soundInstance.config.buffer) {
      return soundInstance.config.buffer;
    }
    if (soundInstance.config.url) {
      return this.loadedBuffers.get(soundInstance.config.url) || null;
    }
    return null;
  }

  // Cleanup
  public removeSound(soundId: string): void {
    const soundInstance = this.sounds.get(soundId);
    if (!soundInstance) return;

    this.stop(soundId);
    
    // Remove from category
    this.categories.forEach(category => {
      category.sounds.delete(soundId);
    });

    this.sounds.delete(soundId);
  }

  public stopAll(): void {
    this.sounds.forEach((_, soundId) => {
      this.stop(soundId);
    });
  }

  public dispose(): void {
    this.stopAll();
    this.sounds.clear();
    this.categories.clear();
    this.loadedBuffers.clear();

    if (this.audioContext) {
      this.audioContext.close();
    }

    this.isInitialized = false;
  }

  // Event handling for user interaction requirement
  public async handleUserInteraction(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
} 