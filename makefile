.PHONY: usage, update, clean

src = $(wildcard ./**/*.md)

ANSI_NOTE=\033[1;34m
ANSI_CMD=\033[0;32m
ANSI_END=\033[0m

GIT_MSG=`date +"%Y.%m.%d %H:%M update"`
LOG_TIME=`date +"${ANSI_CMD}[%Y.%m.%d %H:%M]${ANSI_END}"`

PANDOC_ARGS=--filter mathjax-pandoc-filter --no-highlight --metadata title="Kk Shinkai's Blog"
INDEX_TEMP=--template="static/template/index.html"
POST_TEMP=--template="static/template/template.html"

usage:
	@echo "${ANSI_NOTE}note${ANSI_END}:" \
		  "try \`${ANSI_CMD}make build${ANSI_END}\`, " \
			"\`${ANSI_CMD}make rebuild${ANSI_END}\`, "\
		  "\`${ANSI_CMD}make clean${ANSI_END}\`, or" \
		  "\`${ANSI_CMD}make update${ANSI_END}\` command."

build: $(src:.md=.html)
	@echo "${LOG_TIME} generate 'index.html'"
	@pandoc ${PANDOC_ARGS} ${INDEX_TEMP} --standalone -o index.html index.md

$(src:.md=.html): %.html : %.md
	@echo "${LOG_TIME} generate '$@'"
	@pandoc ${PANDOC_ARGS} ${POST_TEMP} --standalone -o $@ $<

clean:
	@echo "${LOG_TIME} clean up all generated HTML"
	@-rm $(src:.md=.html)

rebuild: clean build

update: build
	@echo "${ANSI_NOTE}note${ANSI_END}: '${GIT_MSG}' updating ..."
	@git add -A .
	@git commit -m "${GIT_MSG}"
	@git push origin main
	@echo "${ANSI_CMD}success${ANSI_END}"
