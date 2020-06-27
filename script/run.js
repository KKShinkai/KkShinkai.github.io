let MarkdownIt = require('markdown-it')

let hljs = require('highlight.js')
let mdi = new MarkdownIt({
    html: true,
    linkify: false,
    highlight: (str, lang) => {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(lang, str).value
            } catch (err) {
                console.error(err)
            }
        }
        return ''
      }
}).use(require("@iktakahiro/markdown-it-katex"))

let template = ({title, date, author, body}) => `<!DOCTYPE html>
<html lang="zh">
<head>
    <meta http-equiv="content-type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1">
    <title>$title$ &middot; Kk Shinkai</title>
    <link rel="stylesheet" href="../static/kkshinkai-v1.css">
</head>
<body>
<h1>${title}</h1>
<div id="kkshinkai-header"><span id="kkshinkai-date">${date}</span> &middot; ${author}</div>
${body}
</body>
</html>`

let fm = require('front-matter')
let fs = require("fs")
fs.readFile(process.argv[2], (err, data) => {
    if (err) return

    let content = fm(data.toString())

    let html = template({
        ...content.attributes,
        body: mdi.render(content.body)
    });

    fs.writeFile(process.argv[3], html, 'utf8', err => {
        if (err) return
    })
})