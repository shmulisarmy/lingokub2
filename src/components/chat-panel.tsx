
"use client";

import type React from 'react';
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Send, MessageCircle } from "lucide-react";
import type { ChatMessageData, PlayerProfile } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  messages: ChatMessageData[];
  onSendMessage: (messageText: string) => void;
  currentPlayerId: string;
  playerProfiles: Record<string, PlayerProfile>;
}

export function ChatPanel({ messages, onSendMessage, currentPlayerId, playerProfiles }: ChatPanelProps) {
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage("");
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollableViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollableViewport) {
        scrollableViewport.scrollTop = scrollableViewport.scrollHeight;
      }
    }
  }, [messages]);

  const getSenderProfile = (senderId: string): PlayerProfile | null => {
    return playerProfiles[senderId] || null;
  }

  return (
    <div className="flex flex-col h-full bg-card rounded-lg shadow">
      <div className="p-3 border-b flex items-center gap-2">
        <MessageCircle className="h-6 w-6 text-primary" />
        <h2 className="text-lg font-headline text-primary">Game Chat</h2>
      </div>
      
      <ScrollArea className="flex-1 p-3" ref={scrollAreaRef}>
        <div className="space-y-3">
          {messages.map((msg) => {
            const profile = msg.sender === "system" ? null : getSenderProfile(msg.sender);
            const displayName = profile?.username || msg.sender;
            const avatarUrl = profile?.avatarUrl;
            const isCurrentUser = msg.sender === currentPlayerId;

            if (msg.sender === "system") {
              return (
                <div key={msg.id} className="text-center my-2">
                  <p className="text-xs text-muted-foreground italic bg-muted/50 px-2 py-1 rounded-md inline-block">
                    {msg.text}
                  </p>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex items-start gap-2.5 text-sm",
                  isCurrentUser ? "justify-end" : "justify-start"
                )}
              >
                {!isCurrentUser && (
                  <Avatar className="h-9 w-9">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} data-ai-hint="abstract avatar" />}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {displayName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={cn("flex flex-col w-fit max-w-[75%]")}>
                  {!isCurrentUser && (
                     <span className="text-xs text-muted-foreground ml-2 mb-0.5">{displayName}</span>
                  )}
                  <div 
                    className={cn(
                      "rounded-lg px-3 py-2",
                      isCurrentUser
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-accent text-accent-foreground rounded-bl-none",
                    )}
                  >
                    <p className="break-words">{msg.text}</p>
                  </div>
                  <p className={cn(
                       "text-xs opacity-70 mt-1",
                        isCurrentUser ? "text-right mr-1" : "text-left ml-1"
                      )}>
                       {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {isCurrentUser && (
                   <Avatar className="h-9 w-9">
                     {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} data-ai-hint="abstract avatar"/>}
                     <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                       {displayName.substring(0, 2).toUpperCase()}
                     </AvatarFallback>
                   </Avatar>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <Separator />
      <form onSubmit={handleSubmit} className="p-3 flex gap-2 items-center border-t">
        <Input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1"
          aria-label="Chat message input"
        />
        <Button type="submit" size="icon" aria-label="Send message">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
