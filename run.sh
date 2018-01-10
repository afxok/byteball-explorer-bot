#!/bin/sh
docker run -ti -p 6611:6611 -v $HOME/.config/byteball-explorer-bot:/byteball --name byteball-explorer-bot byteball-explorer-bot
