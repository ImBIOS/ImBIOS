import { beforeEach, describe, expect, mock, test } from "bun:test";
import {
  formatPost,
  formatPosts,
  getRss,
  hasNewPosts,
  type RssJsonChannelItem,
  sortJson,
  updateReadme,
} from "./list-posts";

// Create a mock function for parseURL
const mockParseURL = mock(() => ({ items: [] }));

// Mock rss-parser module
mock.module("rss-parser", () => {
  return {
    default: class Parser {
      parseURL = mockParseURL;
    },
  };
});

describe("sortJson", () => {
  test("should sort RSS items by pubDate in descending order", () => {
    const unsortedJson: RssJsonChannelItem[] = [
      {
        title: "Post 1",
        coverImage: "image1.jpg",
        creator: "Author 1",
        link: "https://example.com/1",
        pubDate: "2024-12-01T00:00:00Z",
      },
      {
        title: "Post 2",
        coverImage: "image2.jpg",
        creator: "Author 2",
        link: "https://example.com/2",
        pubDate: "2024-12-02T00:00:00Z",
      },
    ];

    const sortedJson = sortJson(unsortedJson);

    expect(sortedJson[0].title).toBe("Post 2");
    expect(sortedJson[1].title).toBe("Post 1");
  });

  test("should handle undefined pubDate for both items", () => {
    const json: RssJsonChannelItem[] = [
      {
        title: "Post 1",
        coverImage: undefined,
        creator: undefined,
        link: undefined,
        pubDate: undefined,
      },
      {
        title: "Post 2",
        coverImage: undefined,
        creator: undefined,
        link: undefined,
        pubDate: undefined,
      },
    ];

    const sorted = sortJson(json);
    expect(sorted[0].title).toBe("Post 1");
    expect(sorted[1].title).toBe("Post 2");
  });

  test("should handle undefined pubDate for first item only", () => {
    const json: RssJsonChannelItem[] = [
      {
        title: "Post 1",
        coverImage: undefined,
        creator: undefined,
        link: undefined,
        pubDate: undefined,
      },
      {
        title: "Post 2",
        coverImage: undefined,
        creator: undefined,
        link: undefined,
        pubDate: "2024-12-02T00:00:00Z",
      },
    ];

    const sorted = sortJson(json);
    expect(sorted[0].title).toBe("Post 1");
  });

  test("should handle undefined pubDate for second item only", () => {
    const json: RssJsonChannelItem[] = [
      {
        title: "Post 1",
        coverImage: undefined,
        creator: undefined,
        link: undefined,
        pubDate: "2024-12-01T00:00:00Z",
      },
      {
        title: "Post 2",
        coverImage: undefined,
        creator: undefined,
        link: undefined,
        pubDate: undefined,
      },
    ];

    const sorted = sortJson(json);
    expect(sorted[0].title).toBe("Post 1");
  });

  test("should return the same array reference", () => {
    const json: RssJsonChannelItem[] = [
      {
        title: "Post 1",
        coverImage: undefined,
        creator: undefined,
        link: undefined,
        pubDate: "2024-12-01T00:00:00Z",
      },
    ];

    const sorted = sortJson(json);
    expect(sorted).toBe(json);
  });

  test("should handle single item array", () => {
    const json: RssJsonChannelItem[] = [
      {
        title: "Post 1",
        coverImage: undefined,
        creator: undefined,
        link: undefined,
        pubDate: "2024-12-01T00:00:00Z",
      },
    ];

    const sorted = sortJson(json);
    expect(sorted.length).toBe(1);
    expect(sorted[0].title).toBe("Post 1");
  });

  test("should handle empty array", () => {
    const json: RssJsonChannelItem[] = [];

    const sorted = sortJson(json);
    expect(sorted.length).toBe(0);
  });
});

describe("getRss", () => {
  beforeEach(() => {
    mockParseURL.mockClear();
  });

  test("should fetch and parse RSS feed correctly", async () => {
    mockParseURL.mockResolvedValue({
      items: [
        {
          title: "Post 1",
          cover_image: "image1.jpg",
          creator: "Author 1",
          link: "https://example.com/1",
          pubDate: "2024-12-01T00:00:00Z",
        },
        {
          title: "Post 2",
          cover_image: "image2.jpg",
          creator: "Author 2",
          link: "https://example.com/2",
          pubDate: "2024-12-02T00:00:00Z",
        },
      ],
    });

    const posts = await getRss();

    expect(posts).toEqual([
      {
        title: "Post 1",
        coverImage: "image1.jpg",
        creator: "Author 1",
        link: "https://example.com/1",
        pubDate: "2024-12-01T00:00:00Z",
      },
      {
        title: "Post 2",
        coverImage: "image2.jpg",
        creator: "Author 2",
        link: "https://example.com/2",
        pubDate: "2024-12-02T00:00:00Z",
      },
    ]);
  });

  test("should handle RSS feed with missing optional fields", async () => {
    mockParseURL.mockResolvedValue({
      items: [
        {
          title: undefined,
          cover_image: undefined,
          creator: undefined,
          link: undefined,
          pubDate: undefined,
        },
      ],
    });

    const posts = await getRss();

    expect(posts).toEqual([
      {
        title: undefined,
        coverImage: undefined,
        creator: undefined,
        link: undefined,
        pubDate: undefined,
      },
    ]);
  });

  test("should handle empty RSS feed", async () => {
    mockParseURL.mockResolvedValue({
      items: [],
    });

    const posts = await getRss();

    expect(posts).toEqual([]);
  });

  test("should call parseURL with correct URL", async () => {
    mockParseURL.mockResolvedValue({ items: [] });

    await getRss();

    expect(mockParseURL).toHaveBeenCalledWith(
      "https://blog.imbios.dev/rss.xml"
    );
  });
});

describe("formatPost", () => {
  test("should format RSS item with valid pubDate and link", () => {
    const item: RssJsonChannelItem = {
      title: "Test Post",
      coverImage: undefined,
      creator: "Test Author",
      link: "https://blog.imbios.dev/my-test-post",
      pubDate: "2024-12-15T10:30:00Z",
    };

    const result = formatPost(item);

    expect(result).toBe(
      "- 2024-12-15 [Test Post](https://blog.imbios.dev/blog/2024/12/15/my-test-post?utm_source=GitHubProfile)"
    );
  });

  test("should handle item with undefined link", () => {
    const item: RssJsonChannelItem = {
      title: "Test Post",
      coverImage: undefined,
      creator: undefined,
      link: undefined,
      pubDate: "2024-12-15T10:30:00Z",
    };

    const result = formatPost(item);

    expect(result).toBe(
      "- 2024-12-15 [Test Post](https://blog.imbios.dev/blog/2024/12/15/undefined?utm_source=GitHubProfile)"
    );
  });
});

describe("formatPosts", () => {
  test("should format multiple RSS items", () => {
    const feeds: RssJsonChannelItem[] = [
      {
        title: "Post 1",
        coverImage: undefined,
        creator: undefined,
        link: "https://blog.imbios.dev/post-1",
        pubDate: "2024-12-01T00:00:00Z",
      },
      {
        title: "Post 2",
        coverImage: undefined,
        creator: undefined,
        link: "https://blog.imbios.dev/post-2",
        pubDate: "2024-12-02T00:00:00Z",
      },
    ];

    const result = formatPosts(feeds);

    expect(result.length).toBe(2);
    expect(result[0]).toContain("Post 1");
    expect(result[1]).toContain("Post 2");
  });

  test("should limit to 5 posts", () => {
    const feeds: RssJsonChannelItem[] = Array.from({ length: 10 }, (_, i) => ({
      title: `Post ${i}`,
      coverImage: undefined,
      creator: undefined,
      link: `https://blog.imbios.dev/post-${i}`,
      pubDate: `2024-12-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
    }));

    const result = formatPosts(feeds);

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

  test("should return true for multiple new posts", () => {
    const readme = "# My README";
    const posts = [
      "- 2024-12-15 [Post 1](url1)",
      "- 2024-12-14 [Post 2](url2)",
    ];

    const result = hasNewPosts(readme, posts);

    expect(result).toBe(true);
  });

  test("should return false when README contains all posts", () => {
    const readme =
      "# My README\n- 2024-12-15 [Post 1](url1)\n- 2024-12-14 [Post 2](url2)";
    const posts = [
      "- 2024-12-15 [Post 1](url1)",
      "- 2024-12-14 [Post 2](url2)",
    ];

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

  test("should handle empty posts array", () => {
    const readme =
      "# My README\n<!--START_SECTION:blog-posts-->\nold content\n<!--END_SECTION:blog-posts-->\nMore content";

    const posts: string[] = [];
    const result = updateReadme(readme, posts);

    expect(result).toContain("More content");
  });
});
