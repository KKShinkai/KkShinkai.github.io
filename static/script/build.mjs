let markdownOptions = {
    html: true,
    linkify: false,
};

import MarkdownIt from 'markdown-it';
let markdownIt = new MarkdownIt(markdownOptions);

import highlight from 'markdown-it-highlightjs';
import highlightLine from 'markdown-it-highlight-lines';
markdownIt.use(highlight, { auto: false, inline: true });
markdownIt.use(highlightLine);

import { readFile, writeFile } from 'fs';
readFile(process.argv[2], (err, data) => {
    if (err)
        return
    let html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<title>Kk Shinkai's Blog</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="apple-touch-icon" sizes="180x180" href="../apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="../favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="../favicon-16x16.png">
<link rel="manifest" href="../site.webmanifest">
<link rel="stylesheet" href="${ process.argv[2] == "index.md" ? "" : "."}./static/css/normalize-v8.0.1.css">
<link rel="stylesheet" href="${ process.argv[2] == "index.md" ? "" : "."}./static/css/kkshinkai-v9.0.0.css">
</head>
<body>
<main class="markdown-body">
${markdownIt.render(data.toString())}
</main>
</body>
</html>
`
    writeFile(process.argv[3], html, 'utf8', err => {
        if (err) return
    })
})

