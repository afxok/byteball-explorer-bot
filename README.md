# Byteball Explorer Bot

This bot is a Byteball DAG explorer for the chatbot interface.

## Install

Install node.js, clone the repository, then say
```sh
npm install
```

## Run
```sh
node start.js
```

## Bot commands

You can remotely control your wallet via chat interface from devices listed in `control_addresses`.  When the wallet starts, it prints out its pairing code.  Copy it, open your GUI wallet, menu button, paired devices, add a new device, accept invitation, paste the code.  Now your GUI wallet is paired to your wallet and you can find it in the list of correspondents (menu, paired devices) to start a chat.  There are three commands you can give:

* `status`: to request the current status of the wallet the bot runs on. This is convenient during the catchup phase to view the percent complete;
* `last`: to show details of the last unit written to the DAG.

