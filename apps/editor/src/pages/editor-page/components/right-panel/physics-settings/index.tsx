import React from "react";
import { Zap, Globe, Settings, Bug } from "lucide-react";
import { DragInput } from "@/components/ui/drag-input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Vector3Controls from "../object-inspector/vector3-controls";
import useEditorStore from "@/stores/editor-store";

interface PhysicsSettingsProps {
  scene: GameScene | null;
}

// Default physics world config to ensure all properties exist
const getDefaultPhysicsWorldConfig = (): PhysicsWorldConfig => ({
  gravity: { x: 0, y: -9.81, z: 0 },
  integrationParameters: {
    dt: 1/60,
    minCcdDt: 1/60/100,
    erp: 0.8,
    damping: 0.99,
    jointErp: 1.0,
    jointDamping: 1.0,
    allowedLinearError: 0.001,
    allowedAngularError: 0.0087,
    maxVelocityIterations: 4,
    maxVelocityFrictionIterations: 8,
    maxStabilizationIterations: 1,
    interleaveRestitutionAndFrictionResolution: true,
    minIslandSize: 128,
    maxCcdSubsteps: 1
  },
  collisionDetection: {
    predictionDistance: 0.002,
    allowedLinearError: 0.001
  },
  debugRender: {
    enabled: false,
    renderBodies: true,
    renderShapes: true,
    renderJoints: true,
    renderMultibodyJoints: false,
    renderContacts: false,
    renderCollisionEvents: false,
    contactPointLength: 0.1,
    contactNormalLength: 0.1
  }
});

// Ensure physics world config has all required properties
const ensureCompletePhysicsConfig = (physicsWorld: any): PhysicsWorldConfig => {
  const defaultConfig = getDefaultPhysicsWorldConfig();
  
  if (!physicsWorld || typeof physicsWorld !== 'object') {
    return defaultConfig;
  }
  
  return {
    gravity: physicsWorld.gravity || defaultConfig.gravity,
    integrationParameters: {
      ...defaultConfig.integrationParameters,
      ...(physicsWorld.integrationParameters || {})
    },
    collisionDetection: {
      ...defaultConfig.collisionDetection,
      ...(physicsWorld.collisionDetection || {})
    },
    debugRender: {
      ...defaultConfig.debugRender,
      ...(physicsWorld.debugRender || {})
    }
  };
};

export default function PhysicsSettings({ scene }: PhysicsSettingsProps) {
  const { updateScenePhysicsConfig } = useEditorStore();

  if (!scene) {
    return (
      <div className="p-4">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
          <Zap size={16} />
          Physics Settings
        </h3>
        <div className="text-center text-muted-foreground text-sm">
          No scene selected
        </div>
      </div>
    );
  }

  // Ensure we have a complete physics config
  const physicsWorld = ensureCompletePhysicsConfig(scene.physicsWorld);

  const handlePhysicsConfigChange = (updates: Partial<PhysicsWorldConfig>) => {
    updateScenePhysicsConfig(updates);
  };

  const handleGravityChange = (gravity: Vector3) => {
    handlePhysicsConfigChange({ gravity });
  };

  const handleIntegrationParameterChange = (key: keyof typeof physicsWorld.integrationParameters, value: number | boolean) => {
    handlePhysicsConfigChange({
      integrationParameters: {
        ...physicsWorld.integrationParameters,
        [key]: value
      }
    });
  };

  const handleCollisionDetectionChange = (key: keyof typeof physicsWorld.collisionDetection, value: number) => {
    handlePhysicsConfigChange({
      collisionDetection: {
        ...physicsWorld.collisionDetection,
        [key]: value
      }
    });
  };

  const handleDebugRenderChange = (key: keyof typeof physicsWorld.debugRender, value: boolean | number) => {
    handlePhysicsConfigChange({
      debugRender: {
        ...physicsWorld.debugRender,
        [key]: value
      }
    });
  };

  return (
    <div className="p-4 space-y-6 max-h-[calc(90vh-10rem)] overflow-y-auto">
      <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
        <Zap size={16} />
        Physics Settings
      </h3>

      {/* World Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
          <Globe size={14} />
          World Settings
        </div>
        
        <div className="space-y-3 pl-4">
          <Vector3Controls
            label="Gravity"
            value={physicsWorld.gravity}
            onChange={handleGravityChange}
            step={0.1}
            precision={2}
          />
        </div>
      </div>

      {/* Integration Parameters */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
          <Settings size={14} />
          Integration Parameters
        </div>
        
        <div className="space-y-3 pl-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Time Step (dt)</Label>
            <DragInput
              value={physicsWorld.integrationParameters.dt}
              onChange={(value) => handleIntegrationParameterChange('dt', value)}
              min={0.001}
              max={0.1}
              step={0.001}
              precision={3}
              className="w-20"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Min CCD dt</Label>
            <DragInput
              value={physicsWorld.integrationParameters.minCcdDt}
              onChange={(value) => handleIntegrationParameterChange('minCcdDt', value)}
              min={0.0001}
              max={0.01}
              step={0.0001}
              precision={4}
              className="w-20"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Error Reduction (ERP)</Label>
            <DragInput
              value={physicsWorld.integrationParameters.erp}
              onChange={(value) => handleIntegrationParameterChange('erp', value)}
              min={0.0}
              max={1.0}
              step={0.01}
              precision={2}
              className="w-20"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Damping</Label>
            <DragInput
              value={physicsWorld.integrationParameters.damping}
              onChange={(value) => handleIntegrationParameterChange('damping', value)}
              min={0.0}
              max={1.0}
              step={0.01}
              precision={2}
              className="w-20"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Joint ERP</Label>
            <DragInput
              value={physicsWorld.integrationParameters.jointErp}
              onChange={(value) => handleIntegrationParameterChange('jointErp', value)}
              min={0.0}
              max={1.0}
              step={0.01}
              precision={2}
              className="w-20"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Joint Damping</Label>
            <DragInput
              value={physicsWorld.integrationParameters.jointDamping}
              onChange={(value) => handleIntegrationParameterChange('jointDamping', value)}
              min={0.0}
              max={1.0}
              step={0.01}
              precision={2}
              className="w-20"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Linear Error</Label>
            <DragInput
              value={physicsWorld.integrationParameters.allowedLinearError}
              onChange={(value) => handleIntegrationParameterChange('allowedLinearError', value)}
              min={0.0001}
              max={0.1}
              step={0.0001}
              precision={4}
              className="w-20"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Angular Error</Label>
            <DragInput
              value={physicsWorld.integrationParameters.allowedAngularError}
              onChange={(value) => handleIntegrationParameterChange('allowedAngularError', value)}
              min={0.0001}
              max={0.1}
              step={0.0001}
              precision={4}
              className="w-20"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Velocity Iterations</Label>
            <DragInput
              value={physicsWorld.integrationParameters.maxVelocityIterations}
              onChange={(value) => handleIntegrationParameterChange('maxVelocityIterations', Math.round(value))}
              min={1}
              max={50}
              step={1}
              precision={0}
              className="w-20"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Friction Iterations</Label>
            <DragInput
              value={physicsWorld.integrationParameters.maxVelocityFrictionIterations}
              onChange={(value) => handleIntegrationParameterChange('maxVelocityFrictionIterations', Math.round(value))}
              min={1}
              max={50}
              step={1}
              precision={0}
              className="w-20"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Stabilization Iterations</Label>
            <DragInput
              value={physicsWorld.integrationParameters.maxStabilizationIterations}
              onChange={(value) => handleIntegrationParameterChange('maxStabilizationIterations', Math.round(value))}
              min={1}
              max={50}
              step={1}
              precision={0}
              className="w-20"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Interleave Resolution</Label>
            <Switch
              checked={physicsWorld.integrationParameters.interleaveRestitutionAndFrictionResolution}
              onCheckedChange={(checked) => handleIntegrationParameterChange('interleaveRestitutionAndFrictionResolution', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Min Island Size</Label>
            <DragInput
              value={physicsWorld.integrationParameters.minIslandSize}
              onChange={(value) => handleIntegrationParameterChange('minIslandSize', Math.round(value))}
              min={1}
              max={100}
              step={1}
              precision={0}
              className="w-20"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Max CCD Substeps</Label>
            <DragInput
              value={physicsWorld.integrationParameters.maxCcdSubsteps}
              onChange={(value) => handleIntegrationParameterChange('maxCcdSubsteps', Math.round(value))}
              min={1}
              max={20}
              step={1}
              precision={0}
              className="w-20"
            />
          </div>
        </div>
      </div>

      {/* Collision Detection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
          <Settings size={14} />
          Collision Detection
        </div>
        
        <div className="space-y-3 pl-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Prediction Distance</Label>
            <DragInput
              value={physicsWorld.collisionDetection.predictionDistance}
              onChange={(value) => handleCollisionDetectionChange('predictionDistance', value)}
              min={0.001}
              max={1.0}
              step={0.001}
              precision={3}
              className="w-20"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Linear Error</Label>
            <DragInput
              value={physicsWorld.collisionDetection.allowedLinearError}
              onChange={(value) => handleCollisionDetectionChange('allowedLinearError', value)}
              min={0.0001}
              max={0.1}
              step={0.0001}
              precision={4}
              className="w-20"
            />
          </div>
        </div>
      </div>

      {/* Debug Rendering */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
          <Bug size={14} />
          Debug Rendering
        </div>
        
        <div className="space-y-3 pl-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300">Enable Debug</Label>
            <Switch
              checked={physicsWorld.debugRender.enabled}
              onCheckedChange={(checked) => handleDebugRenderChange('enabled', checked)}
            />
          </div>

          {physicsWorld.debugRender.enabled && (
            <div className="space-y-2 pl-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-zinc-300">Render Bodies</Label>
                <Switch
                  checked={physicsWorld.debugRender.renderBodies}
                  onCheckedChange={(checked) => handleDebugRenderChange('renderBodies', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs text-zinc-300">Render Shapes</Label>
                <Switch
                  checked={physicsWorld.debugRender.renderShapes}
                  onCheckedChange={(checked) => handleDebugRenderChange('renderShapes', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs text-zinc-300">Render Joints</Label>
                <Switch
                  checked={physicsWorld.debugRender.renderJoints}
                  onCheckedChange={(checked) => handleDebugRenderChange('renderJoints', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs text-zinc-300">Render Multibody Joints</Label>
                <Switch
                  checked={physicsWorld.debugRender.renderMultibodyJoints}
                  onCheckedChange={(checked) => handleDebugRenderChange('renderMultibodyJoints', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs text-zinc-300">Render Contacts</Label>
                <Switch
                  checked={physicsWorld.debugRender.renderContacts}
                  onCheckedChange={(checked) => handleDebugRenderChange('renderContacts', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs text-zinc-300">Collision Events</Label>
                <Switch
                  checked={physicsWorld.debugRender.renderCollisionEvents}
                  onCheckedChange={(checked) => handleDebugRenderChange('renderCollisionEvents', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs text-zinc-300">Contact Point Length</Label>
                <DragInput
                  value={physicsWorld.debugRender.contactPointLength}
                  onChange={(value) => handleDebugRenderChange('contactPointLength', value)}
                  min={0.01}
                  max={1.0}
                  step={0.01}
                  precision={2}
                  className="w-20"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs text-zinc-300">Contact Normal Length</Label>
                <DragInput
                  value={physicsWorld.debugRender.contactNormalLength}
                  onChange={(value) => handleDebugRenderChange('contactNormalLength', value)}
                  min={0.01}
                  max={1.0}
                  step={0.01}
                  precision={2}
                  className="w-20"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 