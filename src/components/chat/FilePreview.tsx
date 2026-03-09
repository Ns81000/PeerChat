import { useState } from "react";

interface FilePreviewProps {
  mimeType: string;
  objectUrl: string;
  fileName: string;
}

const FilePreview = ({ mimeType, objectUrl, fileName }: FilePreviewProps) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (mimeType.startsWith("image/")) {
    if (imgError) {
      return (
        <div className="flex h-32 w-full items-center justify-center rounded-lg bg-elevated text-xs text-muted-foreground">
          Failed to load image
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-lg">
        {!imgLoaded && (
          <div className="flex h-48 w-full animate-pulse items-center justify-center rounded-lg bg-elevated">
            <svg
              className="h-10 w-10 text-muted-foreground/20"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
          </div>
        )}
        <img
          src={objectUrl}
          alt={fileName}
          className={`max-h-64 w-full rounded-lg object-contain transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0 absolute"}`}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  if (mimeType.startsWith("video/")) {
    return (
      <video
        src={objectUrl}
        controls
        className="max-h-64 w-full rounded-lg"
        preload="metadata"
      />
    );
  }

  if (mimeType.startsWith("audio/")) {
    return (
      <audio
        src={objectUrl}
        controls
        className="w-full rounded-lg"
        preload="metadata"
      />
    );
  }

  return null;
};

export default FilePreview;
