# !/bin/bash
test -f config-data/secrets.env && export $(egrep -v '^#' config-data/secrets.env | xargs)
bash
