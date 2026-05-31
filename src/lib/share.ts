import { srcFor, type Photo } from "./photos";

/** A link that reopens Time Skip on this exact photo. */
export function shareUrlFor(id: string): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.searchParams.set("view", "stack");
  url.searchParams.set("photo", id);
  return url.toString();
}

/** Copy text to the clipboard, with a legacy fallback. Resolves true on success. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

/** Share a photo via the native share sheet when available; otherwise copy the link. */
export async function sharePhoto(photo: Photo): Promise<"shared" | "copied" | "failed"> {
  const url = shareUrlFor(photo.id);
  const data = {
    title: `Time Skip — ${photo.title}`,
    text: `${photo.title} · ${photo.place} · ${photo.stamp}`,
    url,
  };
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(data);
      return "shared";
    } catch (err) {
      // User aborts shouldn't fall back to a copy.
      if (err instanceof DOMException && err.name === "AbortError") return "failed";
    }
  }
  return (await copyText(url)) ? "copied" : "failed";
}

/** Pull the full-resolution image down as a file. Falls back to opening it. */
export async function downloadPhoto(photo: Photo): Promise<boolean> {
  const url = srcFor(photo, 1600);
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("bad response");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `timeskip-${photo.id}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
    return true;
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
    return false;
  }
}
