#!/bin/bash

printf "Creating the docker container"

docker build --rm -t fahdi/unfollowers .

printf "Done building the docker image!"

printf "Setting up the docker container"

docker run -d -p 5984:8000 fahdi/unfollowers

printf "Congrats, your docker app is running!"

printf "\n\n##############################\n\n"

printf "Browse: http://localhost:5984"

printf "\n\n##############################\n\n"
