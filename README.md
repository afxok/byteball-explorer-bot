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

## Pairing

Byteball Wallet QR Code:

![Explorer_Bot_QR_Code](explorer-bot-qr-code.png)

Pairing Code Link:

byteball:AgCIAZy32lWRc/OQZRiVg4hSmw0sw4ga3P6qkBv/nAPo@byteball.org/bb#0000

## Bot commands

You can remotely control your wallet via chat interface from devices listed in `control_addresses`.  When the wallet starts, it prints out its pairing code.  Copy it, open your GUI wallet, menu button, paired devices, add a new device, accept invitation, paste the code.  Now your GUI wallet is paired to your wallet and you can find it in the list of correspondents (menu, paired devices) to start a chat.  There are three commands you can give:

* `[unit]`: to show unit info
* `[address]`: to show address info
* `status`: to request the current status of the wallet the bot runs on. This is convenient during the catchup phase to view the percent complete;
* `last`: to show details of the last unit written to the DAG.

## Module

The Explorer Bot can also be integrated as module into other bots such as a headless wallet to monitor syncing status and other information. First include the module in your package dependencies:

```sh
  "dependencies": {
    "byteball-explorer-bot": "git+https://github.com/afxok/byteball-explorer-bot.git",
    ...
```

Then require the module in your bot:

```sh
var explorerBot = require('byteball-explorer-bot/explorer-bot');
```

The module exports two functions `setupChatEventHandlers()` and `handleText()`. The first function can be called to allow the module to handle all event bus messages on it's own. The second function can be used as a callback function in a chain of event bus message handlers. For example

```sh
handleText(from_address, text, explorerBot.handleText);
```

