.PHONY: usage, update, clean

src = $(wildcard ./**/*.md)

ANSI_NOTE=\033[1;34m
ANSI_CMD=\033[0;32m
ANSI_END=\033[0m

MESSAGE=`date +"%Y.%m.%d %H:%M update"`

usage:
	@echo "${ANSI_NOTE}note${ANSI_END}:" \
		  "try \`${ANSI_CMD}make build${ANSI_END}\`, " \
		  "\`${ANSI_CMD}make clean${ANSI_END}\`, or" \
		  "\`${ANSI_CMD}make update${ANSI_END}\` command."

build: $(src:.md=.html)
	pandoc --filter mathjax-pandoc-filter \
		   --metadata title="Kk Shinkai's Journal" \
		   --template="static/template/index.html" \
			 --highlight-style=pygments \
		   --standalone -o index.html index.md

$(src:.md=.html): %.html : %.md
	pandoc --filter mathjax-pandoc-filter \
		   --metadata title="Kk Shinkai's Journal" \
		   --template="static/template/template.html" \
		   --standalone -o $@ $<

clean:
	-rm $(src:.md=.html)

update: build
	@echo "${ANSI_NOTE}note${ANSI_END}: ${MESSAGE} updating ..."
	@git add -A .
	@git commit -m "${MESSAGE}"
	@git push origin main
	@echo "${ANSI_CMD}success${ANSI_END}"
