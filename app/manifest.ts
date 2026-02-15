import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pearlie - Find the Right Dental Clinic",
    short_name: "Pearlie",
    description: "Connect with trusted dental clinics in your area",
    start_url: "/",
    display: "standalone",
    background_color: "#FEFEFE",
    theme_color: "#907EFF",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.jpg", sizes: "180x180", type: "image/jpeg" },
    ],
  }
}
