# !/bin/bash
test -f .env && export $(egrep -v '^#' .env | xargs)
bash