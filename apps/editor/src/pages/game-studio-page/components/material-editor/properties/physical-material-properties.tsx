import React from "react";
import { DragInput } from "@/components/ui/drag-input";
import { TextureInput } from "../texture-input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/utils/tailwind";

interface PhysicalMaterialPropertiesProps {
  properties: any;
  onChange: (properties: any) => void;
}

export function PhysicalMaterialProperties({ properties, onChange }: PhysicalMaterialPropertiesProps) {
  const [expandedSections, setExpandedSections] = React.useState({
    basic: true,
    textures: false,
    pbr: true,
    physical: true,
    effects: false,
    advanced: false
  });

  const handlePropertyChange = (key: string, value: any) => {
    onChange({
      ...properties,
      [key]: value
    });
  };

  const handleTextureChange = (textureType: string, assetPath: string | undefined) => {
    if (assetPath === undefined) {
      const newProps = { ...properties };
      delete newProps[textureType];
      delete newProps[`${textureType}Props`];
      onChange(newProps);
    } else {
      handlePropertyChange(textureType, assetPath);
    }
  };

  const handleTextureUVChange = (textureType: string, uvData: any) => {
    const propsKey = `${textureType}Props`;
    handlePropertyChange(propsKey, {
      ...properties[propsKey],
      ...uvData
    });
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const SectionHeader = ({ title, section }: { title: string; section: keyof typeof expandedSections }) => (
    <button
      className="flex items-center justify-between w-full py-2 text-left hover:bg-gray-800/30 rounded px-2 transition-colors"
      onClick={() => toggleSection(section)}
    >
      <span className="text-sm font-medium text-gray-200">{title}</span>
      {expandedSections[section] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
    </button>
  );

  return (
    <div className="space-y-1">
      {/* Basic Properties */}
      <div>
        <SectionHeader title="Basic Properties" section="basic" />
        {expandedSections.basic && (
          <div className="space-y-3 px-2 pb-3">
            {/* Color */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-400 w-20">Color</label>
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="color"
                  value={properties.color || "#ffffff"}
                  onChange={(e) => handlePropertyChange("color", e.target.value)}
                  className="w-12 h-8 rounded border border-gray-600 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={properties.color || "#ffffff"}
                  onChange={(e) => handlePropertyChange("color", e.target.value)}
                  className="flex-1 h-8 px-2 text-xs bg-black/20 border border-gray-700 rounded focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <DragInput
              label="Opacity"
              value={properties.opacity || 1}
              onChange={(value) => handlePropertyChange("opacity", value)}
              step={0.01}
              precision={2}
              min={0}
              max={1}
              compact
            />

            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400">Transparent</label>
              <Switch
                checked={properties.transparent || false}
                onCheckedChange={(checked) => handlePropertyChange("transparent", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400">Wireframe</label>
              <Switch
                checked={properties.wireframe || false}
                onCheckedChange={(checked) => handlePropertyChange("wireframe", checked)}
              />
            </div>
          </div>
        )}
      </div>

      <Separator className="bg-gray-800" />

      {/* PBR Properties */}
      <div>
        <SectionHeader title="PBR Properties" section="pbr" />
        {expandedSections.pbr && (
          <div className="space-y-3 px-2 pb-3">
            <DragInput
              label="Metalness"
              value={properties.metalness || 0}
              onChange={(value) => handlePropertyChange("metalness", value)}
              step={0.01}
              precision={2}
              min={0}
              max={1}
              compact
            />

            <DragInput
              label="Roughness"
              value={properties.roughness || 1}
              onChange={(value) => handlePropertyChange("roughness", value)}
              step={0.01}
              precision={2}
              min={0}
              max={1}
              compact
            />

            <DragInput
              label="Env Intensity"
              value={properties.envMapIntensity || 1}
              onChange={(value) => handlePropertyChange("envMapIntensity", value)}
              step={0.1}
              precision={1}
              min={0}
              max={3}
              compact
            />
          </div>
        )}
      </div>

      <Separator className="bg-gray-800" />

      {/* Physical Properties */}
      <div>
        <SectionHeader title="Physical Properties" section="physical" />
        {expandedSections.physical && (
          <div className="space-y-3 px-2 pb-3">
            {/* Clearcoat */}
            <DragInput
              label="Clearcoat"
              value={properties.clearcoat || 0}
              onChange={(value) => handlePropertyChange("clearcoat", value)}
              step={0.01}
              precision={2}
              min={0}
              max={1}
              compact
            />

            <DragInput
              label="Clearcoat Roughness"
              value={properties.clearcoatRoughness || 0}
              onChange={(value) => handlePropertyChange("clearcoatRoughness", value)}
              step={0.01}
              precision={2}
              min={0}
              max={1}
              compact
            />

            {/* IOR */}
            <DragInput
              label="IOR"
              value={properties.ior || 1.5}
              onChange={(value) => handlePropertyChange("ior", value)}
              step={0.01}
              precision={2}
              min={1}
              max={3}
              compact
            />

            {/* Transmission */}
            <DragInput
              label="Transmission"
              value={properties.transmission || 0}
              onChange={(value) => handlePropertyChange("transmission", value)}
              step={0.01}
              precision={2}
              min={0}
              max={1}
              compact
            />

            <DragInput
              label="Thickness"
              value={properties.thickness || 0}
              onChange={(value) => handlePropertyChange("thickness", value)}
              step={0.01}
              precision={2}
              min={0}
              max={10}
              compact
            />

            {/* Iridescence */}
            <DragInput
              label="Iridescence"
              value={properties.iridescence || 0}
              onChange={(value) => handlePropertyChange("iridescence", value)}
              step={0.01}
              precision={2}
              min={0}
              max={1}
              compact
            />

            <DragInput
              label="Iridescence IOR"
              value={properties.iridescenceIOR || 1.3}
              onChange={(value) => handlePropertyChange("iridescenceIOR", value)}
              step={0.01}
              precision={2}
              min={1}
              max={3}
              compact
            />

            {/* Sheen */}
            <DragInput
              label="Sheen"
              value={properties.sheen || 0}
              onChange={(value) => handlePropertyChange("sheen", value)}
              step={0.01}
              precision={2}
              min={0}
              max={1}
              compact
            />

            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-400 w-20">Sheen Color</label>
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="color"
                  value={properties.sheenColor || "#ffffff"}
                  onChange={(e) => handlePropertyChange("sheenColor", e.target.value)}
                  className="w-12 h-8 rounded border border-gray-600 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={properties.sheenColor || "#ffffff"}
                  onChange={(e) => handlePropertyChange("sheenColor", e.target.value)}
                  className="flex-1 h-8 px-2 text-xs bg-black/20 border border-gray-700 rounded focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <DragInput
              label="Sheen Roughness"
              value={properties.sheenRoughness || 1}
              onChange={(value) => handlePropertyChange("sheenRoughness", value)}
              step={0.01}
              precision={2}
              min={0}
              max={1}
              compact
            />
          </div>
        )}
      </div>

      <Separator className="bg-gray-800" />

      {/* Textures */}
      <div>
        <SectionHeader title="Textures" section="textures" />
        {expandedSections.textures && (
          <div className="space-y-4 px-2 pb-3">
            {/* Standard textures */}
            <TextureInput
              label="Base Color"
              value={properties.map}
              uvScale={properties.mapProps?.repeat || { x: 1, y: 1 }}
              uvOffset={properties.mapProps?.offset || { x: 0, y: 0 }}
              uvRotation={properties.mapProps?.rotation || 0}
              onChange={(path) => handleTextureChange("map", path)}
              onUVChange={(uv) => handleTextureUVChange("map", uv)}
            />

            <TextureInput
              label="Normal Map"
              value={properties.normalMap}
              uvScale={properties.normalMapProps?.repeat || { x: 1, y: 1 }}
              uvOffset={properties.normalMapProps?.offset || { x: 0, y: 0 }}
              uvRotation={properties.normalMapProps?.rotation || 0}
              onChange={(path) => handleTextureChange("normalMap", path)}
              onUVChange={(uv) => handleTextureUVChange("normalMap", uv)}
            />

            {properties.normalMap && (
              <DragInput
                label="Normal Scale"
                value={properties.normalScale || 1}
                onChange={(value) => handlePropertyChange("normalScale", value)}
                step={0.01}
                precision={2}
                min={0}
                max={2}
                compact
              />
            )}

            <TextureInput
              label="Roughness Map"
              value={properties.roughnessMap}
              uvScale={properties.roughnessMapProps?.repeat || { x: 1, y: 1 }}
              uvOffset={properties.roughnessMapProps?.offset || { x: 0, y: 0 }}
              uvRotation={properties.roughnessMapProps?.rotation || 0}
              onChange={(path) => handleTextureChange("roughnessMap", path)}
              onUVChange={(uv) => handleTextureUVChange("roughnessMap", uv)}
            />

            <TextureInput
              label="Metalness Map"
              value={properties.metalnessMap}
              uvScale={properties.metalnessMapProps?.repeat || { x: 1, y: 1 }}
              uvOffset={properties.metalnessMapProps?.offset || { x: 0, y: 0 }}
              uvRotation={properties.metalnessMapProps?.rotation || 0}
              onChange={(path) => handleTextureChange("metalnessMap", path)}
              onUVChange={(uv) => handleTextureUVChange("metalnessMap", uv)}
            />

            {/* Physical material specific textures */}
            <TextureInput
              label="Clearcoat Map"
              value={properties.clearcoatMap}
              uvScale={properties.clearcoatMapProps?.repeat || { x: 1, y: 1 }}
              uvOffset={properties.clearcoatMapProps?.offset || { x: 0, y: 0 }}
              uvRotation={properties.clearcoatMapProps?.rotation || 0}
              onChange={(path) => handleTextureChange("clearcoatMap", path)}
              onUVChange={(uv) => handleTextureUVChange("clearcoatMap", uv)}
            />

            <TextureInput
              label="Clearcoat Roughness Map"
              value={properties.clearcoatRoughnessMap}
              uvScale={properties.clearcoatRoughnessMapProps?.repeat || { x: 1, y: 1 }}
              uvOffset={properties.clearcoatRoughnessMapProps?.offset || { x: 0, y: 0 }}
              uvRotation={properties.clearcoatRoughnessMapProps?.rotation || 0}
              onChange={(path) => handleTextureChange("clearcoatRoughnessMap", path)}
              onUVChange={(uv) => handleTextureUVChange("clearcoatRoughnessMap", uv)}
            />

            <TextureInput
              label="Clearcoat Normal Map"
              value={properties.clearcoatNormalMap}
              uvScale={properties.clearcoatNormalMapProps?.repeat || { x: 1, y: 1 }}
              uvOffset={properties.clearcoatNormalMapProps?.offset || { x: 0, y: 0 }}
              uvRotation={properties.clearcoatNormalMapProps?.rotation || 0}
              onChange={(path) => handleTextureChange("clearcoatNormalMap", path)}
              onUVChange={(uv) => handleTextureUVChange("clearcoatNormalMap", uv)}
            />

            {properties.clearcoatNormalMap && (
              <DragInput
                label="Clearcoat Normal Scale"
                value={properties.clearcoatNormalScale || 1}
                onChange={(value) => handlePropertyChange("clearcoatNormalScale", value)}
                step={0.01}
                precision={2}
                min={0}
                max={2}
                compact
              />
            )}

            <TextureInput
              label="Transmission Map"
              value={properties.transmissionMap}
              uvScale={properties.transmissionMapProps?.repeat || { x: 1, y: 1 }}
              uvOffset={properties.transmissionMapProps?.offset || { x: 0, y: 0 }}
              uvRotation={properties.transmissionMapProps?.rotation || 0}
              onChange={(path) => handleTextureChange("transmissionMap", path)}
              onUVChange={(uv) => handleTextureUVChange("transmissionMap", uv)}
            />

            <TextureInput
              label="Thickness Map"
              value={properties.thicknessMap}
              uvScale={properties.thicknessMapProps?.repeat || { x: 1, y: 1 }}
              uvOffset={properties.thicknessMapProps?.offset || { x: 0, y: 0 }}
              uvRotation={properties.thicknessMapProps?.rotation || 0}
              onChange={(path) => handleTextureChange("thicknessMap", path)}
              onUVChange={(uv) => handleTextureUVChange("thicknessMap", uv)}
            />

            <TextureInput
              label="Iridescence Map"
              value={properties.iridescenceMap}
              uvScale={properties.iridescenceMapProps?.repeat || { x: 1, y: 1 }}
              uvOffset={properties.iridescenceMapProps?.offset || { x: 0, y: 0 }}
              uvRotation={properties.iridescenceMapProps?.rotation || 0}
              onChange={(path) => handleTextureChange("iridescenceMap", path)}
              onUVChange={(uv) => handleTextureUVChange("iridescenceMap", uv)}
            />

            <TextureInput
              label="Iridescence Thickness Map"
              value={properties.iridescenceThicknessMap}
              uvScale={properties.iridescenceThicknessMapProps?.repeat || { x: 1, y: 1 }}
              uvOffset={properties.iridescenceThicknessMapProps?.offset || { x: 0, y: 0 }}
              uvRotation={properties.iridescenceThicknessMapProps?.rotation || 0}
              onChange={(path) => handleTextureChange("iridescenceThicknessMap", path)}
              onUVChange={(uv) => handleTextureUVChange("iridescenceThicknessMap", uv)}
            />

            <TextureInput
              label="Sheen Color Map"
              value={properties.sheenColorMap}
              uvScale={properties.sheenColorMapProps?.repeat || { x: 1, y: 1 }}
              uvOffset={properties.sheenColorMapProps?.offset || { x: 0, y: 0 }}
              uvRotation={properties.sheenColorMapProps?.rotation || 0}
              onChange={(path) => handleTextureChange("sheenColorMap", path)}
              onUVChange={(uv) => handleTextureUVChange("sheenColorMap", uv)}
            />

            <TextureInput
              label="Sheen Roughness Map"
              value={properties.sheenRoughnessMap}
              uvScale={properties.sheenRoughnessMapProps?.repeat || { x: 1, y: 1 }}
              uvOffset={properties.sheenRoughnessMapProps?.offset || { x: 0, y: 0 }}
              uvRotation={properties.sheenRoughnessMapProps?.rotation || 0}
              onChange={(path) => handleTextureChange("sheenRoughnessMap", path)}
              onUVChange={(uv) => handleTextureUVChange("sheenRoughnessMap", uv)}
            />

            <TextureInput
              label="AO Map"
              value={properties.aoMap}
              uvScale={properties.aoMapProps?.repeat || { x: 1, y: 1 }}
              uvOffset={properties.aoMapProps?.offset || { x: 0, y: 0 }}
              uvRotation={properties.aoMapProps?.rotation || 0}
              onChange={(path) => handleTextureChange("aoMap", path)}
              onUVChange={(uv) => handleTextureUVChange("aoMap", uv)}
            />

            {properties.aoMap && (
              <DragInput
                label="AO Intensity"
                value={properties.aoMapIntensity || 1}
                onChange={(value) => handlePropertyChange("aoMapIntensity", value)}
                step={0.1}
                precision={1}
                min={0}
                max={2}
                compact
              />
            )}
          </div>
        )}
      </div>

      <Separator className="bg-gray-800" />

      {/* Effects */}
      <div>
        <SectionHeader title="Effects" section="effects" />
        {expandedSections.effects && (
          <div className="space-y-3 px-2 pb-3">
            {/* Emissive Color */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-400 w-20">Emissive</label>
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="color"
                  value={properties.emissive || "#000000"}
                  onChange={(e) => handlePropertyChange("emissive", e.target.value)}
                  className="w-12 h-8 rounded border border-gray-600 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={properties.emissive || "#000000"}
                  onChange={(e) => handlePropertyChange("emissive", e.target.value)}
                  className="flex-1 h-8 px-2 text-xs bg-black/20 border border-gray-700 rounded focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <DragInput
              label="Emissive Intensity"
              value={properties.emissiveIntensity || 0}
              onChange={(value) => handlePropertyChange("emissiveIntensity", value)}
              step={0.1}
              precision={1}
              min={0}
              max={10}
              compact
            />

            <TextureInput
              label="Emissive Map"
              value={properties.emissiveMap}
              uvScale={properties.emissiveMapProps?.repeat || { x: 1, y: 1 }}
              uvOffset={properties.emissiveMapProps?.offset || { x: 0, y: 0 }}
              uvRotation={properties.emissiveMapProps?.rotation || 0}
              onChange={(path) => handleTextureChange("emissiveMap", path)}
              onUVChange={(uv) => handleTextureUVChange("emissiveMap", uv)}
            />
          </div>
        )}
      </div>
    </div>
  );
} 