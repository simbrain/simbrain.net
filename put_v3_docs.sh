#!/bin/sh
DOCDIR="/Users/jyoshimi/gitstuff/simbrain3/docs/"
rsync $DOCDIR -avz --delete --exclude=".*" -e ssh jyoshimi@jeffyoshimi.net:public_html/simbrain/Documentation/v3/