export type ProductMediaItem = { kind: "video"; id: string } | { kind: "image"; path: string };

export function buildProductMediaSequence(images: string[] = [], youtubeVideoId?: string | null): ProductMediaItem[] {
  return [
    ...(youtubeVideoId ? [{ kind: "video" as const, id: youtubeVideoId }] : []),
    ...images.filter(Boolean).map((path) => ({ kind: "image" as const, path })),
  ];
}
