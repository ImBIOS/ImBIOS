import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

interface GitHubRepo {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  topics: string[];
  fork: boolean;
  archived: boolean;
}

interface Product {
  name: string;
  description: string;
  url: string;
  stars: number;
  category: "app" | "tool";
}

const PRODUCTS_REGEX =
  /(?<=<!--START_SECTION:products-->\n)[\s\S]*(?=\n<!--END_SECTION:products-->)/;

const GITHUB_USERNAME = "ImBIOS";
const GITHUB_API_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated&type=owner`;

// Topics that indicate a repo is a product (not just a project/website)
const APP_TOPICS = ["app", "application", "web-app", "mobile-app", "pwa"];
const TOOL_TOPICS = [
  "tool",
  "cli",
  "github-action",
  "library",
  "sdk",
  "codemod",
  "docker",
  "template",
  "plugin",
  "utility",
  "bot",
];

// Repos to exclude from the products list
const EXCLUDED_REPOS = new Set([
  "ImBIOS",
  "ImBIOS-private",
  "notes",
  "blog-imbios-dev",
  "www-imbios-dev",
  "environment",
]);

const categorizeRepo = (repo: GitHubRepo): Product["category"] | null => {
  if (repo.fork || repo.archived) return null;
  if (EXCLUDED_REPOS.has(repo.name)) return null;

  const topics = repo.topics.map((t) => t.toLowerCase());

  if (topics.some((t) => APP_TOPICS.includes(t))) return "app";
  if (topics.some((t) => TOOL_TOPICS.includes(t))) return "tool";

  // Heuristic: repos with a homepage are likely products
  if (repo.homepage && repo.stargazers_count >= 1) return "tool";

  return null;
};

export const fetchProducts = async (): Promise<Product[]> => {
  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "ImBIOS-profile-bot",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const repos: GitHubRepo[] = await response.json();

    const products: Product[] = [];
    for (const repo of repos) {
      const category = categorizeRepo(repo);
      if (!category) continue;

      products.push({
        name: repo.name,
        description: repo.description ?? "",
        url: repo.homepage || repo.html_url,
        stars: repo.stargazers_count,
        category,
      });
    }

    // Sort by stars descending, then by name
    products.sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name));

    return products;
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return [];
  }
};

export const formatProducts = (products: Product[]): string => {
  const apps = products.filter((p) => p.category === "app");
  const tools = products.filter((p) => p.category === "tool");

  const lines: string[] = [];

  if (apps.length > 0) {
    lines.push("### 💻 App Products");
    lines.push("");
    for (const app of apps) {
      lines.push(`- [${app.name}](${app.url}), ${app.description}`);
    }
    lines.push("");
  }

  if (tools.length > 0) {
    lines.push("### 🛠️ Tool Products");
    lines.push("");
    for (const tool of tools) {
      lines.push(`- [${tool.name}](${tool.url}), ${tool.description}`);
    }
    lines.push("");
  }

  lines.push(
    `[More inactive or small projects...](https://github.com/${GITHUB_USERNAME}?tab=repositories&q=&type=public&language=&sort=stargazers)`,
  );

  return lines.join("\n");
};

export const hasNewProducts = (readme: string, formatted: string): boolean => {
  return !readme.includes(formatted);
};

export const updateReadme = (readme: string, formatted: string): string => {
  return readme.replace(PRODUCTS_REGEX, formatted);
};

const main = async () => {
  const products = await fetchProducts();
  const formatted = formatProducts(products);

  const readme = readFileSync("README.md", "utf8");
  if (!hasNewProducts(readme, formatted)) {
    throw new Error("No new products");
  }
  const updatedReadme = updateReadme(readme, formatted);
  writeFileSync("README.md", updatedReadme);
  console.log("Updated README.md with products");
};

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
