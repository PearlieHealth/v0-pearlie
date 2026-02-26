export function HomepageJsonLd() {
  const videoObjectSchema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: "Pearlie — Find the Right Dentist",
    description:
      "A short clip showcasing Pearlie, the dental clinic matching platform that helps you find the right dentist in London and the UK.",
    thumbnailUrl: "https://pearlie.org/apple-icon.jpg",
    uploadDate: "2025-01-01",
    contentUrl: "https://pearlie.org/images/Short%20Clip%20Smile%20Pearlie.mp4",
    embedUrl: "https://pearlie.org",
    publisher: {
      "@type": "Organization",
      name: "Pearlie",
      logo: {
        "@type": "ImageObject",
        url: "https://pearlie.org/apple-icon.jpg",
      },
    },
  }

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Find the Right Dental Clinic with Pearlie",
    description:
      "Use Pearlie to find a trusted dental clinic in London and across the UK in three simple steps.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Tell us what you're looking for",
        text: "Answer a few simple questions about your treatment, budget, location, and preferences. It only takes a minute.",
        url: "https://pearlie.org/#how-it-works",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "We match you with the right clinics",
        text: "Based on your answers, we suggest carefully reviewed clinics in London that meet our standards for quality and transparency.",
        url: "https://pearlie.org/#how-it-works",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Compare. Chat. Book.",
        text: "Compare clinics side-by-side, chat directly with them, and book online when you're ready. All in one place.",
        url: "https://pearlie.org/#how-it-works",
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoObjectSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
    </>
  )
}
