import React from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder, Calendar, FileText, Package } from "lucide-react";
import useGameStudioStore from "@/stores/game-studio-store";

export default function ProjectInfoPanel() {
  const { currentProject } = useGameStudioStore();

  if (!currentProject) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-muted-foreground">No project loaded</div>
      </div>
    );
  }

  const serverInfo = (currentProject as any)?.devServerInfo;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Project Information</h2>
        <p className="text-sm text-muted-foreground">
          Overview of your project details and structure
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText size={16} />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Project Name</Label>
              <div className="font-medium">{currentProject.name}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Last Modified</Label>
              <div className="text-sm">{new Date(currentProject.lastModified).toLocaleString()}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Current Scene</Label>
              <div className="text-sm">{currentProject.currentScene || 'No scene selected'}</div>
            </div>
          </CardContent>
        </Card>

        {/* File Structure */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Folder size={16} />
              File Structure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Project Path</Label>
              <div className="text-sm font-mono break-all">{currentProject.path}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Available Scenes</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {currentProject.scenes?.map((scene: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {scene}
                  </Badge>
                )) || <span className="text-sm text-muted-foreground">No scenes found</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Development Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package size={16} />
              Development Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Server Status</Label>
              <div className="flex items-center gap-2">
                <Badge variant={currentProject.isRunning ? "default" : "secondary"}>
                  {currentProject.isRunning ? "Running" : "Stopped"}
                </Badge>
                {serverInfo?.url && (
                  <span className="text-xs text-muted-foreground">
                    Port {serverInfo.port}
                  </span>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Project Type</Label>
              <div className="text-sm">GameJS Project</div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar size={16} />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Scenes</Label>
                <div className="font-medium">{currentProject.scenes?.length || 0}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Project Age</Label>
                <div className="font-medium">
                  {Math.floor((Date.now() - new Date(currentProject.lastModified).getTime()) / (1000 * 60 * 60 * 24))} days
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Configuration Files */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between p-2 border rounded">
              <span className="font-mono">gamejs.config.json</span>
              <Badge variant="outline" className="text-xs">Config</Badge>
            </div>
            <div className="flex items-center justify-between p-2 border rounded">
              <span className="font-mono">package.json</span>
              <Badge variant="outline" className="text-xs">Package</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 