import { beforeEach, describe, expect, mock, test } from "bun:test";
import { fetchProducts, formatProducts, hasNewProducts, updateReadme } from "./list-products";

// Mock global fetch
const mockFetch = mock(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  } as Response),
);

globalThis.fetch = mockFetch;

describe("fetchProducts", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  test("should fetch repos from GitHub API", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            name: "my-tool",
            description: "A useful tool",
            html_url: "https://github.com/ImBIOS/my-tool",
            homepage: "https://my-tool.dev",
            stargazers_count: 10,
            topics: ["tool"],
            fork: false,
            archived: false,
          },
        ]),
    } as Response);

    const products = await fetchProducts();

    expect(products.length).toBe(1);
    expect(products[0].name).toBe("my-tool");
    expect(products[0].category).toBe("tool");
  });

  test("should exclude forked repos", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            name: "forked-repo",
            description: "A fork",
            html_url: "https://github.com/ImBIOS/forked-repo",
            homepage: null,
            stargazers_count: 5,
            topics: ["tool"],
            fork: true,
            archived: false,
          },
        ]),
    } as Response);

    const products = await fetchProducts();

    expect(products.length).toBe(0);
  });

  test("should exclude archived repos", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            name: "old-repo",
            description: "An old repo",
            html_url: "https://github.com/ImBIOS/old-repo",
            homepage: null,
            stargazers_count: 5,
            topics: ["tool"],
            fork: false,
            archived: true,
          },
        ]),
    } as Response);

    const products = await fetchProducts();

    expect(products.length).toBe(0);
  });

  test("should exclude repos in EXCLUDED_REPOS", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            name: "ImBIOS",
            description: "Profile README",
            html_url: "https://github.com/ImBIOS/ImBIOS",
            homepage: null,
            stargazers_count: 5,
            topics: [],
            fork: false,
            archived: false,
          },
          {
            name: "environment",
            description: "Dotfiles",
            html_url: "https://github.com/ImBIOS/environment",
            homepage: null,
            stargazers_count: 5,
            topics: [],
            fork: false,
            archived: false,
          },
        ]),
    } as Response);

    const products = await fetchProducts();

    expect(products.length).toBe(0);
  });

  test("should categorize repos by topics", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            name: "my-app",
            description: "An app",
            html_url: "https://github.com/ImBIOS/my-app",
            homepage: null,
            stargazers_count: 5,
            topics: ["app"],
            fork: false,
            archived: false,
          },
          {
            name: "my-cli",
            description: "A CLI tool",
            html_url: "https://github.com/ImBIOS/my-cli",
            homepage: null,
            stargazers_count: 3,
            topics: ["cli"],
            fork: false,
            archived: false,
          },
        ]),
    } as Response);

    const products = await fetchProducts();

    expect(products.length).toBe(2);
    expect(products[0].category).toBe("app");
    expect(products[1].category).toBe("tool");
  });

  test("should sort products by stars descending", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            name: "low-stars",
            description: "Low",
            html_url: "https://github.com/ImBIOS/low-stars",
            homepage: null,
            stargazers_count: 1,
            topics: ["tool"],
            fork: false,
            archived: false,
          },
          {
            name: "high-stars",
            description: "High",
            html_url: "https://github.com/ImBIOS/high-stars",
            homepage: null,
            stargazers_count: 100,
            topics: ["tool"],
            fork: false,
            archived: false,
          },
        ]),
    } as Response);

    const products = await fetchProducts();

    expect(products[0].name).toBe("high-stars");
    expect(products[1].name).toBe("low-stars");
  });

  test("should use homepage URL when available", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            name: "my-tool",
            description: "A tool",
            html_url: "https://github.com/ImBIOS/my-tool",
            homepage: "https://my-tool.dev",
            stargazers_count: 5,
            topics: ["tool"],
            fork: false,
            archived: false,
          },
        ]),
    } as Response);

    const products = await fetchProducts();

    expect(products[0].url).toBe("https://my-tool.dev");
  });

  test("should fall back to html_url when no homepage", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            name: "my-tool",
            description: "A tool",
            html_url: "https://github.com/ImBIOS/my-tool",
            homepage: null,
            stargazers_count: 5,
            topics: ["tool"],
            fork: false,
            archived: false,
          },
        ]),
    } as Response);

    const products = await fetchProducts();

    expect(products[0].url).toBe("https://github.com/ImBIOS/my-tool");
  });

  test("should handle API errors gracefully", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve([]),
    } as Response);

    const products = await fetchProducts();

    expect(products).toEqual([]);
  });
});

describe("formatProducts", () => {
  test("should format apps and tools into markdown sections", () => {
    const products = [
      {
        name: "my-app",
        description: "An application",
        url: "https://my-app.dev",
        stars: 10,
        category: "app" as const,
      },
      {
        name: "my-tool",
        description: "A CLI tool",
        url: "https://github.com/ImBIOS/my-tool",
        stars: 5,
        category: "tool" as const,
      },
    ];

    const result = formatProducts(products);

    expect(result).toContain("### 💻 App Products");
    expect(result).toContain("- [my-app](https://my-app.dev), An application");
    expect(result).toContain("### 🛠️ Tool Products");
    expect(result).toContain("- [my-tool](https://github.com/ImBIOS/my-tool), A CLI tool");
    expect(result).toContain("More inactive or small projects...");
  });

  test("should only include app section when no tools", () => {
    const products = [
      {
        name: "my-app",
        description: "An application",
        url: "https://my-app.dev",
        stars: 10,
        category: "app" as const,
      },
    ];

    const result = formatProducts(products);

    expect(result).toContain("### 💻 App Products");
    expect(result).not.toContain("### 🛠️ Tool Products");
  });

  test("should handle empty products array", () => {
    const result = formatProducts([]);

    expect(result).toContain("More inactive or small projects...");
  });
});

describe("hasNewProducts", () => {
  test("should return true when README does not contain products", () => {
    const readme = "# My README";
    const formatted = "### 💻 App Products";

    const result = hasNewProducts(readme, formatted);

    expect(result).toBe(true);
  });

  test("should return false when README already contains products", () => {
    const readme = "# My README\n### 💻 App Products";
    const formatted = "### 💻 App Products";

    const result = hasNewProducts(readme, formatted);

    expect(result).toBe(false);
  });
});

describe("updateReadme", () => {
  test("should replace products section", () => {
    const readme =
      "# My README\n<!--START_SECTION:products-->\nold products\n<!--END_SECTION:products-->\nMore content";

    const formatted = "### 💻 App Products\n\n- [new-app](url)";
    const result = updateReadme(readme, formatted);

    expect(result).toContain("### 💻 App Products");
    expect(result).not.toContain("old products");
  });
});
