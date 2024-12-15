import { readFileSync, writeFileSync } from "fs";
import Parser from "rss-parser";

type RssJsonChannelItem = {
  title: string | undefined;
  coverImage: any;
  creator: string | undefined;
  link: string | undefined;
  pubDate: string | undefined;
};

export const getRss = async (): Promise<RssJsonChannelItem[]> => {
  const parser: Parser = new Parser();
  const url = "https://blog.imbios.dev/rss.xml";
  const feed = await parser.parseURL(url);
  return feed.items.map((item) => {
    return {
      title: item["title"],
      coverImage: item["cover_image"],
      creator: item["creator"],
      link: item["link"],
      pubDate: item["pubDate"],
    };
  });
};

/**
 * Sort JSON by pubDate
 * @param {object} json
 * @returns {object} sortedJson
 */
export const sortJson = (json: RssJsonChannelItem[]): RssJsonChannelItem[] => {
  json.sort((a, b) => {
    if (a.pubDate && b.pubDate) {
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    }

    return 0;
  });
  return json;
};

// Read XML file and convert to JSON
getRss()
  .then((rss) => {
    const feeds = sortJson(rss);

    // Create Markdown list of posts
    const posts = feeds
      .slice(0, 5)
      .map(
        (item) =>
          `- ${new Date(item.pubDate ?? "").toISOString().split("T")[0]} [${
            item.title
          }](${item.link}?utm_source=GitHubProfile)`
      );

    // Update README.md if posts have changed,
    // otherwise throw an error to remind me to write a blog post
    const readme = readFileSync("README.md", "utf8");
    if (readme.includes(posts.join("\n"))) {
      throw new Error("No new blog posts");
    } else {
      const updatedReadme = readFileSync("README.md", "utf8")
        .replace(
          /(?<=<!--START_SECTION:blog-posts-->\n)[\s\S]*(?=\n<!--END_SECTION:blog-posts-->)/,
          posts.join("\n")
        )
        .replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1");
      writeFileSync("README.md", updatedReadme);

      console.log("Updated README.md");
    }
  })
  .catch((err) => console.error(err));
