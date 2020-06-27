src = $(wildcard */index.md)

all : $(src:.md=.html)

$(src:.md=.html) : %.html : %.md
	node ./script/run.js $< $@

clean :
	-rm $(src:.md=.html)