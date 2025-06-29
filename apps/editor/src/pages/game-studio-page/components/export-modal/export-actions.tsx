import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Download, AlertCircle } from 'lucide-react';
import { ExportType } from './types';

interface ExportActionsProps {
  exportType: ExportType;
  isExporting: boolean;
  onExport: () => void;
  onCancel: () => void;
  error?: string | null;
}

export function ExportActions({ exportType, isExporting, onExport, onCancel, error }: ExportActionsProps) {
  const getExportButtonText = () => {
    switch (exportType) {
      case 'gamejs':
        return 'Export GameJS Scene';
      case 'threejs':
        return 'Export Three.js Scene';
      case 'glb':
        return 'Export GLB File';
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="px-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/5">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isExporting}
        >
          Cancel
        </Button>
        <Button
          onClick={onExport}
          disabled={isExporting}
          className="gap-2"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              {getExportButtonText()}
            </>
          )}
        </Button>
      </div>
    </div>
  );
} 