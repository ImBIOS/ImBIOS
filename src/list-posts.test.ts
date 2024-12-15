import { describe, expect, test } from "bun:test";
import { getRss, sortJson } from "./list-posts";

describe("list-posts", async () => {
  const readFileSync = await import("fs").then((m) => m.readFileSync);
  const writeFileSync = await import("fs").then((m) => m.writeFileSync);
  const Parser = await import("rss-parser").then((m) => m.default);

  test.todo("getRss should fetch and parse RSS feed correctly", async () => {
    const mockFeed = {
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
    };

    Parser.prototype.parseURL.mockResolvedValue(mockFeed);

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

  test("sortJson should sort RSS items by pubDate in descending order", () => {
    const unsortedJson = [
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

  test.todo("should update README.md if there are new blog posts", async () => {
    const mockPosts = [
      "- 2024-12-02 [Post 2](https://example.com/2?utm_source=GitHubProfile)",
      "- 2024-12-01 [Post 1](https://example.com/1?utm_source=GitHubProfile)",
    ];

    const mockReadme = `<!--START_SECTION:blog-posts-->
  - 2024-12-01 [Post 1](https://example.com/1?utm_source=GitHubProfile)
  <!--END_SECTION:blog-posts-->`;

    readFileSync.mockReturnValue(mockReadme); // Mock the existing README content

    // Simulate the RSS fetch and process
    const posts = await getRss(); // Ensure this triggers the update

    // Update logic
    const updatedReadme = mockReadme.replace(
      /(?<=<!--START_SECTION:blog-posts-->\n)[\s\S]*(?=\n<!--END_SECTION:blog-posts-->)/,
      mockPosts.join("\n")
    );

    // Mock the file writing process
    writeFileSync.mockImplementation(() => {});

    // Ensure that writeFileSync is called with the updated content
    expect(writeFileSync).toHaveBeenCalledWith("README.md", updatedReadme);
  });

  test("should throw error when no new blog posts exist", async () => {
    const mockPosts = [
      "- 2024-12-01 [Post 1](https://example.com/1?utm_source=GitHubProfile)",
      "- 2024-12-02 [Post 2](https://example.com/2?utm_source=GitHubProfile)",
    ];

    const mockReadme = `<!--START_SECTION:blog-posts-->
  - 2024-12-01 [Post 1](https://example.com/1?utm_source=GitHubProfile)
  - 2024-12-02 [Post 2](https://example.com/2?utm_source=GitHubProfile)
  <!--END_SECTION:blog-posts-->`;

    readFileSync.mockReturnValue(mockReadme);

    await getRss().catch((err) => {
      expect(err.message).toBe("No new blog posts");
    });
  });
});
