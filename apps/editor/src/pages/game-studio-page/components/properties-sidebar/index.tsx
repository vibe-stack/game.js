import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings, MessageSquare, Zap, EarthIcon } from "lucide-react";
import { Inspector } from "./inspector";
import { Chat } from "./chat";
import { Behaviors } from "./behaviors";
import { WorldSettings } from "./world-settings";
import { GameWorldService } from "../../services/game-world-service";
import { motion } from "motion/react";
import useGameStudioStore from "@/stores/game-studio-store";

interface PropertiesSidebarProps {
  gameWorldService: React.RefObject<GameWorldService | null>;
  onOpenCodeEditor?: (scriptPath: string) => void;
}

export default function PropertiesSidebar({
  gameWorldService,
  onOpenCodeEditor,
}: PropertiesSidebarProps) {
  const [activeTab, setActiveTab] = useState("inspector");
  const { gameState } = useGameStudioStore();

  return (
    <motion.div
      initial={{ x: 100, opacity: 1 }}
      animate={{
        x: gameState === "playing" ? 300 : 0,
        opacity: gameState === "playing" ? 0 : 1,
      }}
      transition={{ duration: 0.5 }}
      className="fixed top-32 right-4 bottom-32 z-40 w-120 overflow-hidden rounded-lg border border-white/10 bg-black/60 backdrop-blur-md"
    >
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex h-full flex-col"
      >
        <div className="w-full px-2 pt-2">
        <TabsList className="h-12 grid w-full grid-cols-4 bg-white/5">
          <TabsTrigger
            value="inspector"
            className="flex items-center gap-2 text-white data-[state=active]:bg-lime-500/20 data-[state=active]:text-lime-300"
          >
            <Settings className="h-4 w-4" />
            Inspect
          </TabsTrigger>
          <TabsTrigger
            value="behaviors"
            className="flex items-center gap-2 text-white data-[state=active]:bg-lime-500/20 data-[state=active]:text-lime-300"
          >
            <Zap className="h-4 w-4" />
            Behavior
          </TabsTrigger>
          <TabsTrigger
            value="world"
            className="flex items-center gap-2 text-white data-[state=active]:bg-lime-500/20 data-[state=active]:text-lime-300"
          >
            <EarthIcon className="h-4 w-4" />
            World
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="flex items-center gap-2 text-white data-[state=active]:bg-lime-500/20 data-[state=active]:text-lime-300"
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </TabsTrigger>
        </TabsList>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <TabsContent
            value="inspector"
            className="m-2 flex min-h-0 flex-1 flex-col overflow-y-auto"
          >
            <Inspector gameWorldService={gameWorldService} />
          </TabsContent>

          <TabsContent
            value="behaviors"
            className="m-2 flex min-h-0 flex-1 flex-col overflow-y-auto"
          >
            <Behaviors 
              gameWorldService={gameWorldService} 
              onOpenCodeEditor={onOpenCodeEditor}
            />
          </TabsContent>

          <TabsContent
            value="world"
            className="m-2 flex min-h-0 flex-1 flex-col overflow-y-auto"
          >
            <WorldSettings gameWorldService={gameWorldService} />
          </TabsContent>

          <TabsContent
            value="chat"
            className="m-2 flex min-h-0 flex-1 flex-col"
          >
            <Chat />
          </TabsContent>
        </div>
      </Tabs>
    </motion.div>
  );
}
