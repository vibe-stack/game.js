import React from "react";
import { DragInput } from "@/components/ui/drag-input";
import { TextureInput } from "../texture-input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/utils/tailwind";

interface StandardMaterialPropertiesProps {
  properties: any;
  onChange: (properties: any) => void;
}

export function StandardMaterialProperties({ properties, onChange }: StandardMaterialPropertiesProps) {
  const [expandedSections, setExpandedSections] = React.useState({
    basic: true,
    textures: true,
    pbr: true,
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
      // Remove texture property
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

            {/* Opacity */}
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

            {/* Transparent */}
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400">Transparent</label>
              <Switch
                checked={properties.transparent || false}
                onCheckedChange={(checked) => handlePropertyChange("transparent", checked)}
              />
            </div>

            {/* Wireframe */}
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

      {/* Textures */}
      <div>
        <SectionHeader title="Textures" section="textures" />
        {expandedSections.textures && (
          <div className="space-y-4 px-2 pb-3">
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