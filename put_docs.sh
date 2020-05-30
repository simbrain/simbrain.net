#!/bin/sh
DOCDIR="/Users/jyoshimi/gitstuff/simbrain/docs"
rsync $DOCDIR -avz --exclude=".*" -e ssh jyoshimi@jeffyoshimi.net:public_html/simbrain/Documentation