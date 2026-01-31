import { beforeEach, describe, expect, mock, test } from "bun:test";
import { getRss, type RssJsonChannelItem, sortJson } from "./list-posts";

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
