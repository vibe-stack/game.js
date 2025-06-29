import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExportTypeSelector } from './export-type-selector';
import { ExportOptions } from './export-options';
import { ExportActions } from './export-actions';
import { ExportType } from './types';
import useGameStudioStore from '@/stores/game-studio-store';

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportModal({ open, onOpenChange }: ExportModalProps) {
  const [selectedType, setSelectedType] = React.useState<ExportType>('gamejs');
  const [options, setOptions] = React.useState({
    includeAssets: true,
    includeScripts: true,
    includeTextures: true,
    includeMaterials: true,
    includeDebugElements: false,
    includeHelpers: false,
  });
  const [isExporting, setIsExporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const { exportScene } = await import('@/services/export-service');
      await exportScene(selectedType, options);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'Failed to export scene');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full !max-w-6xl h-[80vh] p-0 bg-background/40 backdrop-blur-sm">
        <div className="flex h-full">
          {/* Left side - Export type selector */}
          <div className="w-64 border-r bg-muted/10">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle>Export Scene</DialogTitle>
            </DialogHeader>
            <ExportTypeSelector
              selectedType={selectedType}
              onTypeChange={setSelectedType}
            />
          </div>

          {/* Right side - Options and actions */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <ExportOptions
                exportType={selectedType}
                options={options}
                onOptionsChange={setOptions}
              />
            </div>
            <ExportActions
              exportType={selectedType}
              isExporting={isExporting}
              onExport={handleExport}
              onCancel={() => onOpenChange(false)}
              error={error}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 