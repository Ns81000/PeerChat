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
      <img
        src={objectUrl}
        alt={fileName}
        className={`max-h-64 w-full rounded-lg object-contain transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
        loading="lazy"
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgError(true)}
      />
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
