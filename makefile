src = $(wildcard ./index.md ./**/*.md)

all : $(src:.md=.html)

$(src:.md=.html) : %.html : %.md
	node --no-warnings ./static/script/build.mjs $< $@

clean :
	-rm $(src:.md=.html)