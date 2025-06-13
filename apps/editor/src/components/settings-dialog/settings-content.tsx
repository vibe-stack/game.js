import React from "react";
import { SettingsSection } from "./settings-dialog";
import GameJSConfigPanel from "./panels/gamejs-config-panel";
import PackageJsonPanel from "./panels/package-json-panel";
import ProjectInfoPanel from "./panels/project-info-panel";
import AdvancedPanel from "./panels/advanced-panel";

interface SettingsContentProps {
  activeSection: SettingsSection;
}

export default function SettingsContent({ activeSection }: SettingsContentProps) {
  const renderPanel = () => {
    switch (activeSection) {
      case 'gamejs-config':
        return <GameJSConfigPanel />;
      case 'package-json':
        return <PackageJsonPanel />;
      case 'project-info':
        return <ProjectInfoPanel />;
      case 'advanced':
        return <AdvancedPanel />;
      default:
        return <GameJSConfigPanel />;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {renderPanel()}
      </div>
    </div>
  );
} 