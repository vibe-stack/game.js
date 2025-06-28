import React from "react";
import {
  Camera,
  PerspectiveCamera,
  OrthographicCamera,
} from "@/models/primitives/camera";
import { DragInput } from "@/components/ui/drag-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Vector3Input } from "./vector3-input";
import { useEntityState } from "@/hooks/use-entity-state";
import { Vector3 } from "three";
import { GameWorldService } from "../../../services/game-world-service";

interface CameraPropertiesProps {
  entity: Camera;
  gameWorldService: React.RefObject<GameWorldService | null>;
}

export function CameraProperties({ entity, gameWorldService }: CameraPropertiesProps) {
  useEntityState(entity);

  const handleTargetChange = (target: { x: number; y: number; z: number }) => {
    entity.setTarget(new Vector3(target.x, target.y, target.z));
  };

  const handleActiveToggle = (checked: boolean) => {
    entity.setActive(checked);
    
    // If setting this camera as active, switch the CameraManager to use it
    if (checked && gameWorldService.current) {
      gameWorldService.current.switchToCamera(entity.entityId);
    }
  };

  const renderPerspectiveProperties = (camera: PerspectiveCamera) => (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-gray-400">Field of View (FOV)</Label>
        <DragInput
          value={camera.getFov()}
          onChange={(fov) => camera.setFov(fov)}
          min={1}
          max={179}
          step={1}
          className="text-xs"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Aspect Ratio</Label>
        <DragInput
          value={camera.getAspect()}
          onChange={(aspect) => camera.setAspect(aspect)}
          min={0.1}
          max={10}
          step={0.1}
          className="text-xs"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Near Clipping Plane</Label>
        <DragInput
          value={camera.getNear()}
          onChange={(near) => camera.setNear(near)}
          min={0.01}
          max={1000}
          step={0.01}
          className="text-xs"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Far Clipping Plane</Label>
        <DragInput
          value={camera.getFar()}
          onChange={(far) => camera.setFar(far)}
          min={1}
          max={10000}
          step={1}
          className="text-xs"
        />
      </div>
    </div>
  );

  const renderOrthographicProperties = (camera: OrthographicCamera) => (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-gray-400">Left</Label>
        <DragInput
          value={camera.getLeft()}
          onChange={(left) => camera.setLeft(left)}
          min={-1000}
          max={1000}
          step={0.1}
          className="text-xs"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Right</Label>
        <DragInput
          value={camera.getRight()}
          onChange={(right) => camera.setRight(right)}
          min={-1000}
          max={1000}
          step={0.1}
          className="text-xs"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Top</Label>
        <DragInput
          value={camera.getTop()}
          onChange={(top) => camera.setTop(top)}
          min={-1000}
          max={1000}
          step={0.1}
          className="text-xs"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Bottom</Label>
        <DragInput
          value={camera.getBottom()}
          onChange={(bottom) => camera.setBottom(bottom)}
          min={-1000}
          max={1000}
          step={0.1}
          className="text-xs"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Near Clipping Plane</Label>
        <DragInput
          value={camera.getNear()}
          onChange={(near) => camera.setNear(near)}
          min={0.01}
          max={1000}
          step={0.01}
          className="text-xs"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Far Clipping Plane</Label>
        <DragInput
          value={camera.getFar()}
          onChange={(far) => camera.setFar(far)}
          min={1}
          max={10000}
          step={1}
          className="text-xs"
        />
      </div>
    </div>
  );

  const renderProperties = () => {
    if (entity instanceof PerspectiveCamera) {
      return renderPerspectiveProperties(entity);
    } else if (entity instanceof OrthographicCamera) {
      return renderOrthographicProperties(entity);
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <h3 className="border-b border-white/10 pb-1 text-sm font-medium text-blue-300">
        {entity.cameraType.charAt(0).toUpperCase() + entity.cameraType.slice(1)}{" "}
        Camera Properties
      </h3>

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-gray-400">Target Position</Label>
          <Vector3Input
            value={entity.getTarget()}
            onChange={handleTargetChange}
            label="Target Position"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={entity.isActive}
            onCheckedChange={handleActiveToggle}
          />
          <Label className="text-xs text-gray-400">Active Camera</Label>
        </div>
      </div>

      {renderProperties()}
    </div>
  );
} 