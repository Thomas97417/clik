import { useCallback, useRef, useState } from "react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Loader2, Camera, User } from "lucide-react";

import { authClient } from "@/lib/auth-client";

import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardFooter,
  SettingsCardHeader,
} from "./settings-card";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export default function ProfileImageCard({
  image,
}: {
  image: string | undefined;
}) {
  const generateAvatarUploadUrl = useMutation(api.r2.generateAvatarUploadUrl);
  const syncMetadata = useMutation(api.r2.syncMetadata);
  const fileInput = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const metadata = useQuery(
    api.r2.getMetadata,
    image ? { key: image } : "skip",
  );

  const imageUrl = preview ?? metadata?.url;

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error("Image must be smaller than 5 MB.");
        return;
      }

      const localUrl = URL.createObjectURL(file);
      setPreview(localUrl);
      setIsUploading(true);

      try {
        const { key, url } = await generateAvatarUploadUrl();
        await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        await syncMetadata({ key });
        await authClient.updateUser(
          { image: key },
          {
            onSuccess: () => {
              toast.success("Profile image updated.");
            },
            onError: (error) => {
              toast.error(error.error.message);
              setPreview(null);
            },
          },
        );
      } catch {
        toast.error("Failed to upload image.");
        setPreview(null);
      } finally {
        setIsUploading(false);
        if (fileInput.current) {
          fileInput.current.value = "";
        }
      }
    },
    [generateAvatarUploadUrl, syncMetadata],
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  return (
    <SettingsCard>
      <SettingsCardContent>
        <SettingsCardHeader
          title="Profile Image"
          description="Click on the avatar to upload a new image."
        />
        <div className="flex items-center gap-5">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInput.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className="group relative size-20 shrink-0 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none"
          >
            <div
              className={`size-full overflow-hidden rounded-full border-2 transition-colors ${
                isDragging
                  ? "border-primary"
                  : "border-border group-hover:border-primary/50"
              }`}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Profile"
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-muted">
                  <User className="size-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              {isUploading ? (
                <Loader2 className="size-5 animate-spin text-white" />
              ) : (
                <Camera className="size-5 text-white" />
              )}
            </div>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">
              Click or drag & drop to change your avatar.
            </p>
            <p className="text-xs text-muted-foreground/70">
              JPG, PNG, GIF or WebP. 4 MB max.
            </p>
          </div>
        </div>
      </SettingsCardContent>
      <SettingsCardFooter>
        <p className="text-sm text-muted-foreground">
          Your avatar is visible to other users.
        </p>
      </SettingsCardFooter>
    </SettingsCard>
  );
}
