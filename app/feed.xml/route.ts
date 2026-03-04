import { getAllBlogPostsAsync } from "@/lib/content/blog"
import { getAllGuides } from "@/lib/content/guides"

export async function GET() {
  const posts = await getAllBlogPostsAsync()
  const guides = getAllGuides()
  const siteUrl = "https://pearlie.org"

  const blogItems = posts
    .map(
      (post) => `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${siteUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${siteUrl}/blog/${post.slug}</guid>
      <description><![CDATA[${post.description}]]></description>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <category>${post.category}</category>
      <author>editorial@pearlie.org (${post.author})</author>
    </item>`
    )
    .join("\n")

  const guideItems = guides
    .map(
      (guide) => `    <item>
      <title><![CDATA[${guide.title}]]></title>
      <link>${siteUrl}/guides/${guide.slug}</link>
      <guid isPermaLink="true">${siteUrl}/guides/${guide.slug}</guid>
      <description><![CDATA[${guide.description}]]></description>
      <pubDate>${new Date(guide.publishedAt).toUTCString()}</pubDate>
      <category>guide</category>
      <author>editorial@pearlie.org (${guide.author})</author>
    </item>`
    )
    .join("\n")

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Pearlie - Dental Guides, Costs &amp; Expert Advice</title>
    <link>${siteUrl}/blog</link>
    <description>Expert dental guides, treatment cost breakdowns, and tips for finding the right dentist in the UK.</description>
    <language>en-gb</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${siteUrl}/apple-icon.jpg</url>
      <title>Pearlie</title>
      <link>${siteUrl}</link>
    </image>
${blogItems}
${guideItems}
  </channel>
</rss>`

  return new Response(feed, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}
