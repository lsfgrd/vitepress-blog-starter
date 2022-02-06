const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { createMarkdownRenderer } = require('vitepress');

const md = createMarkdownRenderer(process.cwd());

function* walkSync(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    if (file.isDirectory()) {
      yield* walkSync(path.join(dir, file.name));
    } else {
      yield path.join(dir, file.name);
    }
  }
}

module.exports = {
  watch: '../posts/**/*.md',
  load(asFeed = false) {
    const postDir = path.resolve(__dirname, '../posts');
    const posts = [];

    for (const path of walkSync(postDir)) {
      const post = getPost(path, asFeed);
      posts.push(post);
    }

    return posts
      .sort((a, b) => b.date.time - a.date.time);
  }
};

const cache = new Map();

function getPost(fullPath, asFeed = false) {
  const timestamp = fs.statSync(fullPath).mtimeMs;

  const cached = cache.get(fullPath);
  if (cached && timestamp === cached.timestamp) {
    return cached.post;
  }

  const src = fs.readFileSync(fullPath, 'utf-8');
  const { data, excerpt } = matter(src, { excerpt: true });

  const post = {
    title: data.title,
    href: fullPath.replace(/.+?(?=\/posts)/, '').replace(/\.md$/, '.html'),
    date: formatDate(data.date),
    excerpt: md.render(excerpt)
  };
  if (asFeed) {
    // only attach these when building the RSS feed to avoid bloating the
    // client bundle size
    post.data = data;
  }

  cache.set(fullPath, {
    timestamp,
    post
  });
  return post;
}

function formatDate(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  date.setUTCHours(12);
  return {
    time: +date,
    string: date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  };
}
