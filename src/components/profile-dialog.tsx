
"use client";

import type React from 'react';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PlayerProfile } from '@/types';

interface ProfileDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentProfile: Partial<PlayerProfile>;
  onSaveProfile: (username: string, avatarUrl: string) => void;
}

const avatarOptions = [
  { id: 'avatar1', url: 'https://placehold.co/100x100/E91E63/FFFFFF.png?text=P1', name: 'Pink P1' },
  { id: 'avatar2', url: 'https://placehold.co/100x100/2196F3/FFFFFF.png?text=P2', name: 'Blue P2' },
  { id: 'avatar3', url: 'https://placehold.co/100x100/4CAF50/FFFFFF.png?text=P3', name: 'Green P3' },
  { id: 'avatar4', url: 'https://placehold.co/100x100/FFC107/000000.png?text=P4', name: 'Yellow P4' },
];

export function ProfileDialog({ isOpen, onOpenChange, currentProfile, onSaveProfile }: ProfileDialogProps) {
  const [username, setUsername] = useState(currentProfile.username || '');
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState(currentProfile.avatarUrl || avatarOptions[0].url);

  const handleSubmit = () => {
    if (username.trim() && selectedAvatarUrl) {
      onSaveProfile(username.trim(), selectedAvatarUrl);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Set Your Profile</DialogTitle>
          <DialogDescription>
            Choose a username and an avatar to represent you in the game.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">
              Username
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="col-span-3"
              maxLength={20}
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Avatar</Label>
            <RadioGroup
              value={selectedAvatarUrl}
              onValueChange={setSelectedAvatarUrl}
              className="col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-2"
            >
              {avatarOptions.map((avatar) => (
                <Label
                  key={avatar.id}
                  htmlFor={avatar.id}
                  className="flex flex-col items-center gap-1 p-2 border rounded-md cursor-pointer hover:bg-accent [&:has([data-state=checked])]:bg-accent [&:has([data-state=checked])]:ring-2 [&:has([data-state=checked])]:ring-primary"
                >
                  <RadioGroupItem value={avatar.url} id={avatar.id} className="sr-only" />
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={avatar.url} alt={avatar.name} data-ai-hint="abstract avatar" />
                    <AvatarFallback>{avatar.name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-center">{avatar.name}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!username.trim()}>Save Profile</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
