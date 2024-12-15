import { jest, mock } from "bun:test";

// Mock fs and rss-parser
mock.module("fs", () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

mock.module("rss-parser", () => {
  const parseURLMock = jest.fn().mockResolvedValue({
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

  return {
    default: jest.fn().mockImplementation(() => ({
      parseURL: parseURLMock, // Directly mocking the instance method
    })),
  };
});
