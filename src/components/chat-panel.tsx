"use client";

import type React from 'react';
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Send, MessageCircle } from "lucide-react";
import type { ChatMessageData } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  messages: ChatMessageData[];
  onSendMessage: (messageText: string) => void;
  currentPlayerId: string; // To identify user's own messages
}

export function ChatPanel({ messages, onSendMessage, currentPlayerId }: ChatPanelProps) {
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
    // Auto-scroll to bottom
    if (scrollAreaRef.current) {
      const scrollableViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollableViewport) {
        scrollableViewport.scrollTop = scrollableViewport.scrollHeight;
      }
    }
  }, [messages]);

  const getSenderInitial = (sender: string) => {
    if (sender.toLowerCase() === 'system') return 'S';
    return sender.charAt(0).toUpperCase();
  }

  return (
    <div className="flex flex-col h-full bg-card rounded-lg shadow">
      <div className="p-3 border-b flex items-center gap-2">
        <MessageCircle className="h-6 w-6 text-primary" />
        <h2 className="text-lg font-headline text-primary">Game Chat</h2>
      </div>
      
      <ScrollArea className="flex-1 p-3" ref={scrollAreaRef}>
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex items-start gap-2 text-sm",
                msg.sender === currentPlayerId ? "justify-end" : "justify-start"
              )}
            >
              {msg.sender !== currentPlayerId && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getSenderInitial(msg.sender)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div 
                className={cn(
                  "max-w-[75%] rounded-lg px-3 py-2",
                  msg.sender === currentPlayerId
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground",
                  msg.sender === "system" && "bg-muted text-muted-foreground italic w-full text-center"
                )}
              >
                <p>{msg.text}</p>
                {msg.sender !== "system" && (
                   <p className={cn(
                     "text-xs opacity-70 mt-0.5",
                      msg.sender === currentPlayerId ? "text-right" : "text-left"
                    )}>
                     {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </p>
                )}
              </div>
              {msg.sender === currentPlayerId && (
                 <Avatar className="h-8 w-8">
                   <AvatarFallback className="bg-secondary text-secondary-foreground">
                     {getSenderInitial(msg.sender)}
                   </AvatarFallback>
                 </Avatar>
              )}
            </div>
          ))}
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
