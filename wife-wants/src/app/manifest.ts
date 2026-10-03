import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wife Wants",
    short_name: "Wife Wants",
    description:
      "Tell your partner what you actually want. Right now, for your birthday, or in a perfect world.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff7ec",
    theme_color: "#ff2d87",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
