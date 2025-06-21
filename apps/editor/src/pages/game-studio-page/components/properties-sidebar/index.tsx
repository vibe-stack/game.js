import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings, MessageSquare } from "lucide-react";
import { Inspector } from "./inspector";
import { Chat } from "./chat";
import { GameWorldService } from "../../services/game-world-service";

interface PropertiesSidebarProps {
  gameWorldService: React.RefObject<GameWorldService | null>;
}

export default function PropertiesSidebar({ gameWorldService }: PropertiesSidebarProps) {
  const [activeTab, setActiveTab] = useState("inspector");

  return (
    <div className="fixed right-4 top-32 bottom-32 w-80 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden z-40">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2 bg-white/5 m-2 mb-0">
          <TabsTrigger value="inspector" className="flex items-center gap-2 text-white data-[state=active]:bg-lime-500/20 data-[state=active]:text-lime-300">
            <Settings className="w-4 h-4" />
            Inspector
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2 text-white data-[state=active]:bg-lime-500/20 data-[state=active]:text-lime-300">
            <MessageSquare className="w-4 h-4" />
            Chat
          </TabsTrigger>
        </TabsList>
        
        <div className="flex-1 flex flex-col min-h-0">
          <TabsContent value="inspector" className="flex-1 flex flex-col min-h-0 m-2">
            <ScrollArea className="flex-1">
              <Inspector gameWorldService={gameWorldService} />
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 m-2">
            <Chat />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
} 