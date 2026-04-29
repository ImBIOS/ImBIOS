import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

interface BlogPost {
  title: string;
  date: string;
  slug: string;
  language: string;
}

const CDATA_REGEX = /<!\[CDATA\[(.*?)\]\]>/g;
const BLOG_POSTS_REGEX =
  /(?<=<!--START_SECTION:blog-posts-->\n)[\s\S]*(?=\n<!--END_SECTION:blog-posts-->)/;

const BLOG_DATA_DIR = "submodules/blog/data/blog";
const BLOG_BASE_URL = "https://blog.imbios.dev";
const MAX_POSTS = 5;

export const getLocalBlogPosts = (locale = "en"): BlogPost[] => {
  const localeDir = join(BLOG_DATA_DIR, locale);
  const posts: BlogPost[] = [];

  try {
    const years = readdirSync(localeDir);
    for (const year of years) {
      const yearDir = join(localeDir, year);
      const months = readdirSync(yearDir);
      for (const month of months) {
        const monthDir = join(yearDir, month);
        const days = readdirSync(monthDir);
        for (const day of days) {
          const dayDir = join(monthDir, day);
          const files = readdirSync(dayDir);
          for (const file of files) {
            if (!file.endsWith(".mdx")) continue;

            const filePath = join(dayDir, file);
            const content = readFileSync(filePath, "utf8");

            const titleMatch = content.match(/^title:\s*['"](.+?)['"]/m);
            const dateMatch = content.match(/^date:\s*['"](.+?)['"]/m);
            const langMatch = content.match(/^language:\s*(\w+)/m);

            if (!titleMatch || !dateMatch) continue;

            const title = titleMatch[1];
            const date = dateMatch[1];
            const slug = file.replace(/\.mdx$/, "");

            posts.push({
              title,
              date,
              slug,
              language: langMatch?.[1] ?? locale,
            });
          }
        }
      }
    }
  } catch {
    console.error(`Failed to read blog posts from ${localeDir}`);
    return [];
  }

  return posts;
};

export const sortPosts = (posts: BlogPost[]): BlogPost[] => {
  return [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const formatPost = (post: BlogPost): string => {
  const date = new Date(post.date);
  const dateStr = date.toISOString().split("T")[0];
  const url = `${BLOG_BASE_URL}/blog/${post.language}/${post.slug}?utm_source=GitHubProfile`;
  return `- ${dateStr} [${post.title}](${url})`;
};

export const formatPosts = (posts: BlogPost[]): string[] => {
  return posts.slice(0, MAX_POSTS).map(formatPost);
};

export const hasNewPosts = (readme: string, posts: string[]): boolean => {
  return !readme.includes(posts.join("\n"));
};

export const updateReadme = (readme: string, posts: string[]): string => {
  return readme.replace(BLOG_POSTS_REGEX, posts.join("\n")).replace(CDATA_REGEX, "$1");
};

const main = () => {
  const posts = getLocalBlogPosts("en");
  const sorted = sortPosts(posts);
  const formatted = formatPosts(sorted);

  const readme = readFileSync("README.md", "utf8");
  if (!hasNewPosts(readme, formatted)) {
    throw new Error("No new blog posts");
  }
  const updatedReadme = updateReadme(readme, formatted);
  writeFileSync("README.md", updatedReadme);
  console.log("Updated README.md with blog posts");
};

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
