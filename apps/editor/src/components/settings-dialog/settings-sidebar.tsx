import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Settings, 
  Package, 
  Info, 
  Code 
} from "lucide-react";
import { SettingsSection } from "./settings-dialog";

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

const sidebarItems = [
  {
    id: 'gamejs-config' as SettingsSection,
    label: 'GameJS Config',
    icon: Settings,
    description: 'Game configuration settings'
  },
  {
    id: 'package-json' as SettingsSection,
    label: 'Dependencies',
    icon: Package,
    description: 'Manage project dependencies'
  },
  {
    id: 'project-info' as SettingsSection,
    label: 'Project Info',
    icon: Info,
    description: 'Project metadata and details'
  },
  {
    id: 'advanced' as SettingsSection,
    label: 'Advanced',
    icon: Code,
    description: 'Raw JSON configuration'
  }
];

export default function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  return (
    <div className="w-64 bg-muted/30 border-r flex flex-col">
      <div className="p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          SETTINGS
        </h3>
        <div className="space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={activeSection === item.id ? "secondary" : "ghost"}
                className="w-full justify-start h-auto p-3 flex-col items-start"
                onClick={() => onSectionChange(item.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={16} />
                  <span className="font-medium">{item.label}</span>
                </div>
                <span className="text-xs text-muted-foreground text-left">
                  {item.description}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
} 