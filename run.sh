#!/bin/sh
docker run -ti -p 6612:6611 -v $HOME/.config/byteball-explorer-bot:/byteball --name byteball-explorer-bot byteball-explorer-bot
