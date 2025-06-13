import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SettingsSidebar from "./settings-sidebar";
import SettingsContent from "./settings-content";

export type SettingsSection = 
  | 'gamejs-config' 
  | 'package-json' 
  | 'project-info'
  | 'advanced';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('gamejs-config');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-5xl h-[80vh] p-0 bg-background/70 backdrop-blur-lg">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Project Settings</DialogTitle>
        </DialogHeader>
        
        <div className="flex h-full overflow-hidden">
          <SettingsSidebar 
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
          <SettingsContent 
            activeSection={activeSection}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
} 