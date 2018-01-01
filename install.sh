#!/bin/bash


printf "\n\nInstalling the project dependencies via pip\n\n"

pip install -r requirements.txt

printf "\n\nStarting the app\n\n"

python app.py -p 8900
