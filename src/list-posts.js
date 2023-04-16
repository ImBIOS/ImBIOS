const { readFileSync, writeFileSync } = require('fs');

/**
 * Convert XML string to JSON
 * @param {string} xmlString
 * @returns {object} json
 */
const xmlToJson = (xmlString) => {
  const regex = /<(\w+)([^>]*)>([\s\S]*?)<\/\1>/gm;
  const matches = xmlString.matchAll(regex);
  const json = {};

  for (const match of matches) {
    const [, key, attributes, value] = match;
    const subMatches = value.matchAll(regex);
    const subJson = {};

    for (const subMatch of subMatches) {
      const [, subKey, subAttributes, subValue] = subMatch;

      if (subValue.match(regex)) {
        if (Array.isArray(subJson[subKey])) {
          subJson[subKey].push(
            xmlToJson(
              `<${subKey}${subAttributes}>${subValue}</${subKey}>`
            )[subKey]
          );
        } else if (subJson[subKey]) {
          subJson[subKey] = [
            subJson[subKey],
            xmlToJson(
              `<${subKey}${subAttributes}>${subValue}</${subKey}>`
            )[subKey],
          ];
        } else {
          subJson[subKey] = xmlToJson(
            `<${subKey}${subAttributes}>${subValue}</${subKey}>`
          )[subKey];
        }
      } else if (Array.isArray(subJson[subKey])) {
        subJson[subKey].push(subValue);
      } else if (subJson[subKey]) {
        subJson[subKey] = [subJson[subKey], subValue];
      } else {
        subJson[subKey] = subValue;
      }
    }

    if (json[key]) {
      if (Array.isArray(json[key])) {
        json[key].push(subJson);
      } else {
        json[key] = [json[key], subJson];
      }
    } else {
      json[key] = subJson;
    }
  }

  return json;
};

/**
 * Sort JSON by pubDate
 * @param {object} json
 * @returns {object} sortedJson
 */
const sortJson = (json) => {
  json.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  return json;
};

// Read XML file and convert to JSON
const xmlString = readFileSync('feed.xml', 'utf8');
const feeds = sortJson(xmlToJson(xmlString).rss.channel.item);

// Create Markdown list of posts
const posts = feeds
  .slice(0, 5)
  .map(
    (item) =>
      `- ${new Date(item.pubDate).toISOString().split('T')[0]} [${
        item.title
      }](${item.link}?utm_source=GitHubProfile)`
  );

// Update README.md if posts have changed,
// otherwise throw an error to remind me to write a blog post
const readme = readFileSync('README.md', 'utf8');
if (readme.includes(posts.join('\n'))) {
  throw new Error('No new blog posts');
} else {
  const updatedReadme = readFileSync('README.md', 'utf8').replace(
    /(?<=<!--START_SECTION:blog-posts-->\n)[\s\S]*(?=\n<!--END_SECTION:blog-posts-->)/,
    posts.join('\n')
  );
  writeFileSync('README.md', updatedReadme);

  console.log('Updated README.md');
}
