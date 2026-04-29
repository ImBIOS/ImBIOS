import { beforeEach, describe, expect, mock, test } from "bun:test";
import {
  formatPost,
  formatPosts,
  getLocalBlogPosts,
  hasNewPosts,
  type BlogPost,
  sortPosts,
  updateReadme,
} from "./list-posts";

// Mock node:fs
const mockReaddirSync = mock(() => []);
const mockReadFileSync = mock(() => "");

mock.module("node:fs", () => ({
  readFileSync: mockReadFileSync,
  readdirSync: mockReaddirSync,
  writeFileSync: mock(() => {}),
}));

mock.module("node:path", () => ({
  join: (...args: string[]) => args.join("/"),
}));

describe("getLocalBlogPosts", () => {
  beforeEach(() => {
    mockReaddirSync.mockClear();
    mockReadFileSync.mockClear();
  });

  test("should parse MDX files and extract blog posts", () => {
    mockReaddirSync.mockImplementation((dir: string) => {
      if (dir === "submodules/blog/data/blog/en") return ["2024"];
      if (dir === "submodules/blog/data/blog/en/2024") return ["02"];
      if (dir === "submodules/blog/data/blog/en/2024/02") return ["05"];
      if (dir === "submodules/blog/data/blog/en/2024/02/05") return ["my-test-post.mdx"];
      return [];
    });

    mockReadFileSync.mockReturnValue(
      `---\ntitle: 'My Test Post'\ndate: '2024-02-05'\nlanguage: en\n---\n\nContent here`,
    );

    const posts = getLocalBlogPosts("en");

    expect(posts).toEqual([
      {
        title: "My Test Post",
        date: "2024-02-05",
        slug: "my-test-post",
        language: "en",
      },
    ]);
  });

  test("should skip files without title or date", () => {
    mockReaddirSync.mockImplementation((dir: string) => {
      if (dir === "submodules/blog/data/blog/en") return ["2024"];
      if (dir === "submodules/blog/data/blog/en/2024") return ["01"];
      if (dir === "submodules/blog/data/blog/en/2024/01") return ["01"];
      if (dir === "submodules/blog/data/blog/en/2024/01/01") return ["no-frontmatter.mdx"];
      return [];
    });

    mockReadFileSync.mockReturnValue("Just content, no frontmatter");

    const posts = getLocalBlogPosts("en");

    expect(posts).toEqual([]);
  });

  test("should handle empty directory", () => {
    mockReaddirSync.mockImplementation((dir: string) => {
      if (dir === "submodules/blog/data/blog/en") return [];
      return [];
    });

    const posts = getLocalBlogPosts("en");

    expect(posts).toEqual([]);
  });

  test("should handle errors gracefully", () => {
    mockReaddirSync.mockImplementation(() => {
      throw new Error("Directory not found");
    });

    const posts = getLocalBlogPosts("en");

    expect(posts).toEqual([]);
  });

  test("should default language to locale when not in frontmatter", () => {
    mockReaddirSync.mockImplementation((dir: string) => {
      if (dir === "submodules/blog/data/blog/en") return ["2023"];
      if (dir === "submodules/blog/data/blog/en/2023") return ["04"];
      if (dir === "submodules/blog/data/blog/en/2023/04") return ["13"];
      if (dir === "submodules/blog/data/blog/en/2023/04/13") return ["scalable-nextjs.mdx"];
      return [];
    });

    mockReadFileSync.mockReturnValue(
      `---\ntitle: 'Scalable Next.js'\ndate: '2023-04-13'\n---\n\nContent`,
    );

    const posts = getLocalBlogPosts("en");

    expect(posts[0].language).toBe("en");
  });

  test("should read language from frontmatter", () => {
    mockReaddirSync.mockImplementation((dir: string) => {
      if (dir === "submodules/blog/data/blog/en") return ["2023"];
      if (dir === "submodules/blog/data/blog/en/2023") return ["04"];
      if (dir === "submodules/blog/data/blog/en/2023/04") return ["13"];
      if (dir === "submodules/blog/data/blog/en/2023/04/13") return ["scalable-nextjs.mdx"];
      return [];
    });

    mockReadFileSync.mockReturnValue(
      `---\ntitle: 'Scalable Next.js'\ndate: '2023-04-13'\nlanguage: id\n---\n\nContent`,
    );

    const posts = getLocalBlogPosts("en");

    expect(posts[0].language).toBe("id");
  });
});

describe("sortPosts", () => {
  test("should sort posts by date descending", () => {
    const posts: BlogPost[] = [
      { title: "Post 1", date: "2024-01-01", slug: "post-1", language: "en" },
      { title: "Post 2", date: "2024-12-01", slug: "post-2", language: "en" },
      { title: "Post 3", date: "2024-06-01", slug: "post-3", language: "en" },
    ];

    const sorted = sortPosts(posts);

    expect(sorted[0].title).toBe("Post 2");
    expect(sorted[1].title).toBe("Post 3");
    expect(sorted[2].title).toBe("Post 1");
  });

  test("should not mutate the original array", () => {
    const posts: BlogPost[] = [
      { title: "Post 1", date: "2024-01-01", slug: "post-1", language: "en" },
      { title: "Post 2", date: "2024-12-01", slug: "post-2", language: "en" },
    ];

    sortPosts(posts);

    expect(posts[0].title).toBe("Post 1");
  });

  test("should handle empty array", () => {
    const sorted = sortPosts([]);

    expect(sorted).toEqual([]);
  });
});

describe("formatPost", () => {
  test("should format a blog post correctly", () => {
    const post: BlogPost = {
      title: "My Test Post",
      date: "2024-02-05",
      slug: "my-test-post",
      language: "en",
    };

    const result = formatPost(post);

    expect(result).toBe(
      "- 2024-02-05 [My Test Post](https://blog.imbios.dev/blog/en/my-test-post?utm_source=GitHubProfile)",
    );
  });

  test("should include language in URL", () => {
    const post: BlogPost = {
      title: "Test",
      date: "2023-04-13",
      slug: "scalable-nextjs",
      language: "id",
    };

    const result = formatPost(post);

    expect(result).toContain("/blog/id/scalable-nextjs");
  });
});

describe("formatPosts", () => {
  test("should format multiple posts", () => {
    const posts: BlogPost[] = [
      {
        title: "Post 1",
        date: "2024-12-01",
        slug: "post-1",
        language: "en",
      },
      {
        title: "Post 2",
        date: "2024-12-02",
        slug: "post-2",
        language: "en",
      },
    ];

    const result = formatPosts(posts);

    expect(result.length).toBe(2);
    expect(result[0]).toContain("Post 1");
    expect(result[1]).toContain("Post 2");
  });

  test("should limit to 5 posts", () => {
    const posts: BlogPost[] = Array.from({ length: 10 }, (_, i) => ({
      title: `Post ${i}`,
      date: `2024-12-${String(i + 1).padStart(2, "0")}`,
      slug: `post-${i}`,
      language: "en",
    }));

    const result = formatPosts(posts);

    expect(result.length).toBe(5);
  });

  test("should handle empty array", () => {
    const result = formatPosts([]);

    expect(result).toEqual([]);
  });
});

describe("hasNewPosts", () => {
  test("should return true when README does not contain posts", () => {
    const readme = "# My README\nSome content";
    const posts = ["- 2024-12-15 [Post 1](url)"];

    const result = hasNewPosts(readme, posts);

    expect(result).toBe(true);
  });

  test("should return false when README already contains posts", () => {
    const readme = "# My README\n- 2024-12-15 [Post 1](url)";
    const posts = ["- 2024-12-15 [Post 1](url)"];

    const result = hasNewPosts(readme, posts);

    expect(result).toBe(false);
  });
});

describe("updateReadme", () => {
  test("should replace blog-posts section with new posts", () => {
    const readme =
      "# My README\n<!--START_SECTION:blog-posts-->\nold content\n<!--END_SECTION:blog-posts-->\nMore content";

    const posts = ["- 2024-12-15 [Post 1](url1)"];
    const result = updateReadme(readme, posts);

    expect(result).toContain("- 2024-12-15 [Post 1](url1)");
    expect(result).not.toContain("old content");
  });

  test("should remove CDATA wrapper if present", () => {
    const readme =
      "# My README\n<!--START_SECTION:blog-posts-->\n<![CDATA[\nold content\n]]>\n<!--END_SECTION:blog-posts-->";

    const posts = ["- 2024-12-15 [Post 1](url1)"];
    const result = updateReadme(readme, posts);

    expect(result).toContain("- 2024-12-15 [Post 1](url1)");
  });
});
