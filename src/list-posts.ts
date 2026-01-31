import { readFileSync, writeFileSync } from "node:fs";
import Parser from "rss-parser";

interface RssJsonChannelItem {
  title: string | undefined;
  coverImage: unknown;
  creator: string | undefined;
  link: string | undefined;
  pubDate: string | undefined;
}

const CDATA_REGEX = /<!\[CDATA\[(.*?)\]\]>/g;
const BLOG_POSTS_REGEX =
  /(?<=<!--START_SECTION:blog-posts-->\n)[\s\S]*(?=\n<!--END_SECTION:blog-posts-->)/;

export const getRss = async (): Promise<RssJsonChannelItem[]> => {
  const parser: Parser = new Parser();
  const url = "https://blog.imbios.dev/rss.xml";
  try {
    const feed = await parser.parseURL(url);
    return feed.items.map((item) => ({
      title: item.title,
      coverImage: item.cover_image,
      creator: item.creator,
      link: item.link,
      pubDate: item.pubDate,
    }));
  } catch (error) {
    console.error("Failed to fetch RSS feed:", error);
    return [];
  }
};

export const sortJson = (json: RssJsonChannelItem[]): RssJsonChannelItem[] => {
  json.sort((a, b) => {
    if (a.pubDate && b.pubDate) {
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    }
    return 0;
  });
  return json;
};

getRss()
  .then((rss) => {
    const feeds = sortJson(rss);
    const posts = feeds.slice(0, 5).map((item) => {
      const date = new Date(item.pubDate ?? "");
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const slug = item.link?.replace("https://blog.imbios.dev/", "");
      const correctUrl = `https://blog.imbios.dev/blog/${year}/${month}/${day}/${slug}`;
      return `- ${date.toISOString().split("T")[0]} [${item.title}](${correctUrl}?utm_source=GitHubProfile)`;
    });

    const readme = readFileSync("README.md", "utf8");
    if (readme.includes(posts.join("\n"))) {
      throw new Error("No new blog posts");
    }
    const updatedReadme = readFileSync("README.md", "utf8")
      .replace(BLOG_POSTS_REGEX, posts.join("\n"))
      .replace(CDATA_REGEX, "$1");
    writeFileSync("README.md", updatedReadme);
    console.log("Updated README.md");
  })
  .catch((err) => console.error(err));
