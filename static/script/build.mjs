import hljs from 'highlight.js';
let markdownOptions = {
    html: true,
    linkify: false,
    highlight: (code, lang) => {
        if (lang && hljs.getLanguage(lang))
            try {
                return hljs.highlight(lang, code).value;
            } catch {
                return '';
            }
        else
            return '';
    }
};

import MarkdownIt from 'markdown-it';
let markdownIt = new MarkdownIt(markdownOptions);

import { readFile, writeFile } from 'fs';
import fm from 'front-matter';
import template from './template.mjs';
readFile(process.argv[2], (err, data) => {
    if (err) return
    let content = fm(data.toString())

    let html = template({
        ...content.attributes,
        body: markdownIt.render(content.body)
    });

    writeFile(process.argv[3], html, 'utf8', err => {
        if (err) return
    })
})