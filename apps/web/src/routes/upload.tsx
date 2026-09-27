import { createFileRoute, redirect } from "@tanstack/react-router";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { useMutation, usePaginatedQuery } from "convex/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, ImageIcon } from "lucide-react";

const MAX_SIZE = 5 * 1024 * 1024; // 1MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload — Toma Stack" },
      {
        name: "description",
        content: "Upload images to your R2 storage bucket.",
      },
    ],
  }),
  beforeLoad: async ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: "/sign-in" });
    }
  },
  component: UploadPage,
});

function UploadPage() {
  const generateUploadUrl = useMutation(api.r2.generateUserUploadUrl);
  const syncMetadata = useMutation(api.r2.syncMetadata);
  const imageInput = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const {
    results: images,
    status,
    loadMore,
  } = usePaginatedQuery(api.r2.listMetadata, {}, { initialNumItems: 20 });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > MAX_SIZE) {
      toast.error("File too large. Maximum size is 5 MB.");
      if (imageInput.current) imageInput.current.value = "";
      return;
    }
    if (file && !ALLOWED_TYPES.includes(file.type)) {
      toast.error("Unsupported file type. Please use JPG, PNG, or WebP.");
      if (imageInput.current) imageInput.current.value = "";
      return;
    }
    setSelectedImage(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }

  function clearSelection() {
    setSelectedImage(null);
    setPreview(null);
    if (imageInput.current) {
      imageInput.current.value = "";
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedImage) return;
    if (selectedImage.size > MAX_SIZE) {
      toast.error("Image must be smaller than 5MB.");
      return;
    }
    if (!ALLOWED_TYPES.includes(selectedImage.type)) {
      toast.error("Unsupported file type. Please use JPG, PNG, or WebP.");
      return;
    }

    setIsUploading(true);
    try {
      const { key, url } = await generateUploadUrl();
      await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": selectedImage.type },
        body: selectedImage,
      });
      await syncMetadata({ key });
      toast.success("Image uploaded successfully.");
      clearSelection();
    } catch {
      toast.error("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="flex flex-col gap-1 pb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Upload</h1>
        <p className="text-muted-foreground text-sm">
          Upload images to your storage bucket.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Image</CardTitle>
          <CardDescription>
            Select an image file to upload. Supported formats: JPG, PNG, GIF,
            WebP.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="flex flex-col gap-4">
            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-64 w-full rounded-lg border object-contain"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="absolute top-2 right-2 hover:cursor-pointer bg-background/80 backdrop-blur-sm"
                  onClick={clearSelection}
                >
                  <X className="size-3" />
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 transition-colors hover:bg-muted/50">
                <ImageIcon className="text-muted-foreground size-8" />
                <span className="text-muted-foreground text-sm">
                  Click to select an image
                </span>
                <input
                  type="file"
                  accept="image/*"
                  ref={imageInput}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}

            <Button
              type="submit"
              disabled={!selectedImage || isUploading}
              className="hover:cursor-pointer"
            >
              {isUploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Upload className="size-4" />
                  Upload
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {images.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Uploaded Images</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {images
              .filter((image) => image.key.startsWith("uploads/"))
              .map((image) => (
                <div
                  key={image.key}
                  className="overflow-hidden rounded-lg border bg-muted/30"
                >
                  <img
                    src={image.url}
                    alt={image.key}
                    className="aspect-square w-full object-cover"
                  />
                </div>
              ))}
          </div>
          {status === "CanLoadMore" && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={() => loadMore(20)}
                className="hover:cursor-pointer"
              >
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
