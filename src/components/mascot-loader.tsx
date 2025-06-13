"use client";

import { Box } from "lucide-react";
import { Card } from "@/components/ui/card";

export function MascotLoader() {
  return (
    <div 
      className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-20"
      aria-live="polite" 
      aria-label="Waiting for opponent's turn"
    >
      <Card className="p-6 sm:p-8 shadow-xl flex flex-col items-center">
        <Box className="w-16 h-16 sm:w-20 sm:h-20 text-primary mb-4" strokeWidth={1.5} />
        <p className="text-lg sm:text-xl font-headline text-primary mb-3">Opponent is Thinking...</p>
        <div className="flex space-x-1.5 sm:space-x-2">
          <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 bg-primary rounded-full animate-dot-bounce"></span>
          <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 bg-primary rounded-full animate-dot-bounce animation-delay-200"></span>
          <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 bg-primary rounded-full animate-dot-bounce animation-delay-400"></span>
        </div>
      </Card>
    </div>
  );
}
