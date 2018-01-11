/*jslint node: true */
"use strict";
var util = require('util');
var db = require('byteballcore/db.js');
var eventBus = require('byteballcore/event_bus.js');
var addressUtil = require('byteball-explorer/controllers/address.js');
var unitUtil = require('byteball-explorer/controllers/units.js');
var validationUtils = require('byteballcore/validation_utils.js');
var moment = require('moment');

var UNIT_REGEX = /\b([A-Za-z0-9+/]{43}=)(?:\b|$)/g;
var ADDR_REGEX = /\b([2-7A-Z]{32})(?:\b|$)/g;
var welcomeText = "Explorer Bot: chatbot interface for the Byteball DAG\n\n" +
                  "available commands:\n" +
                  "\t- [help](command:help): this page\n" +
                  "\t- [unit]: select any highlighted unit for info\n" +
                  "\t- [address]: select any highlighted address for info\n" +
                  "\t- [last](command:last): show last unit received\n" +
                  "\t- [status](command:status): show wallet syncing status\n\n" +
                  "Upcomming Features:\n" +
                  "- Support for more than message payload types\n" +
                  "- Streaming units\n" +
                  "- Query syntax\n\n" +
                  "More information:\n" +
                  "https://github.com/afxok/byteball-explorer-bot\n" +
                  "Slack: #afxok";

var catchupStatus = {
        balls: -1,
        startTime: 0,
        percentComplete: "0%",
        lastUnitTimestamp: "",
        eta: ""
    };
var sessions = {};

function getUnitCommand(unit) {
    var cmd = '[' + unit.substr(0,12) + '...' + unit.substr(37) + '](command:' + unit +')';
    return cmd;
}

function formatUnitResponse(u) {
    var formats = [];
    formats.push("Unit: %s");
    formats.push("\tReceived: %s");
    formats.push("");
    formats.push("Authors:");
    formats.push("%s");
    formats.push("Children:");
    formats.push("%s");
    formats.push("Parents:");
    formats.push("%s");
    formats.push("Messages:");
    formats.push("%s");
    // formats.push("Data feed:");
    // formats.push("  Timestamp:");
    // formats.push("");
    // formats.push("Payment in bytes:");
    // formats.push("  Inputs:");
    // formats.push("  Outputs:");
    // formats.push("");

    formats.push("Witnesses:");
    formats.push("%s");
    formats.push("Technical information:");
    formats.push("\tFees: %s (%s headers, %s payload)");
    formats.push("\tLevel: %s");
    formats.push("\tWitnessed level: %s");
    formats.push("\tLast ball unit: %s");
    formats.push("\tMain chain index: %s");
    formats.push("\tLatest included mc index: %s");
    formats.push("\tIs stable: %s");
    var format = formats.join('\n');

    var authorsToken = "";
    for(var i = 0; i < u.authors.length; i++) {
        var addr = u.authors[i].address;
        // the byteball wallet currently is hardcoded to look for addresses
        // and present a popup menu for pay/offer contract. We don't really
        // want that for the explorer so we wrap the address in quotes to get
        // past the regex that it uses.
        authorsToken = '\t' + authorsToken + '["' + addr + '"](command:"' + addr +'")\n';
    }

    var childrenToken = "";
    for(var i = 0; i < u.child.length; i++) {
        childrenToken = childrenToken + '\t' + getUnitCommand(u.child[i]) + '\n';
    }

    var parentsToken = "";
    for(var i = 0; i < u.parents.length; i++) {
        parentsToken = parentsToken + '\t' + getUnitCommand(u.parents[i]) + '\n';
    }

    var witnessesToken = "";
    for(var i = 0; i < u.witnesses.length; i++) {
        witnessesToken = witnessesToken + '\t["' + u.witnesses[i] + '"](command:"' + u.witnesses[i] + '")\n';
    }

    var messagesToken = "";
    for(var i = 0; i < u.messages.length; i++) {
        var message = u.messages[i];
        var messageFormat = "Payment Info:\nInputs\n%sOutputs\n%s";
        if (message.payload) {
            var asset = message.payload.asset || 'null';
            switch(message.app) {
                case 'payment':
                    var inputsToken = "";
                    for (var i = 0; i < message.payload.inputs.length; i ++) {
                        var input = message.payload.inputs[i];
                        // if (input.type && input.type == 'issue') {
                        var headersCommission = 0;
                        var witnessCommission = 0;
                        if (input.output_index !== undefined) {
                            var key = input.unit + '_' + input.output_index + '_' + (asset);
                            inputsToken = inputsToken + '\t' + u.transfersInfo[key].amount + ' from ' + getUnitCommand(u.transfersInfo[key].unit) + '\n';
                        } else if (input.type && input.type === 'headers_commission' ) {
                            var key = input.from_main_chain_index + '_' + input.to_main_chain_index;
                            headersCommission = u.assocCommissions['headers'][key].sum;
                        } else if (input.type && input.type === 'witnessing' ) {
                            var key = input.from_main_chain_index + '_' + input.to_main_chain_index;
                            witnessCommission = u.assocCommissions['witnessing'][key].sum;
                        }
                        inputsToken = util.format(inputsToken + "\theader commission: %s bytes\n\twitness commission:%s bytes\n",headersCommission,witnessCommission);
                    }

                    var outputsToken = "";
                    for (var i = 0; i < u.outputsUnit[asset].length; i ++) {
                        var output = u.outputsUnit[asset][i];
                        // outputsToken = output.amount + ' to ' + output.address + '\n(spent in ' + output.spent + ')\n';
                        outputsToken = outputsToken + '\t' + output.amount + ' to ["' + output.address + '"](command:"' + output.address + '")\n';
                    }
                    var messageToken = [messageFormat,inputsToken,outputsToken];
                    messagesToken = util.format.apply(null,messageToken) + '\n';
                    break;
                case 'text':
                    break;
                default:
                    break;
            }
        }
    }

    var tokens = [format,getUnitCommand(u.unit),u.date,authorsToken,childrenToken,parentsToken,messagesToken,witnessesToken,
        u.headers_commission+u.payload_commission,u.headers_commission,u.payload_commission,
        u.level,u.witnessed_level,getUnitCommand(u.last_ball_unit),u.main_chain_index,
        u.latest_included_mc_index,u.is_stable];

    var resp = util.format.apply(null,tokens) + '\n';

    return resp;
}

function formatAddressResponse(a,allUnspent) {
    var formats = [];
    formats.push('Address: ["%s"](command:"%s")\n');
    formats.push('Definition:');
    formats.push("%s\n");
    formats.push('Unspent:');
    formats.push("%s\n");
    formats.push('Transactions:');
    formats.push("%s\n");
    formats.push('Balance: %s bytes');
    var format = formats.join('\n');

    var definitionToken = JSON.stringify(JSON.parse(a.definition),null,"\t");

    var unspent = "";
    if (a.unspent !== undefined) {
        var maxUnspent = (allUnspent && allUnspent === true) ? a.unspent.length : 10;
        var numUnspent = Math.min(a.unspent.length,maxUnspent);
        for (var i = 0; i < numUnspent; i++) {
    	    unspent = unspent + '\t' + getUnitCommand(a.unspent[i].unit) + ' (' + a.unspent[i].amount + ' bytes)\n';
        }
        if (numUnspent < a.unspent.length) {
            unspent = unspent + '\t[(...show all unspent)](command:"' + a.address + '" showAllUnspent) l:' + a.unspent.length + ' mu:' + maxUnspent + ' nu:' + numUnspent + '\n';
        }
    }

    var trans = "";
    if (a.transactions !== undefined) {
        for (var k in a.transactions) {
            var tran = a.transactions[k];
            trans = trans + getUnitCommand(tran.unit) + " (" + moment(tran.date).format('DD.MM.YYYY HH:mm:ss') + ")\n";
	    /*
            tran.from.forEach(function(from) {
            });
            for (var kk in tran.to) {
            }
	    */
        }
    }

    var bytes = (a.balance !== undefined) ? a.balance.bytes : "";
    var tokens = [format,a.address,a.address,definitionToken,unspent,trans,bytes];

    var resp = util.format.apply(null,tokens) + '\n';

    return resp;
}


function setSyncProgress() {
    db.query("SELECT COUNT(1) AS count_left FROM catchup_chain_balls", function(rows){
    	var count_left = rows[0].count_left;
    	if (count_left === 0) {
    	    catchupStatus.percentComplete = "0%";
  	    return;
	}
    	if (catchupStatus.balls === -1)
    	    catchupStatus.balls = count_left;

    	var percent = ((catchupStatus.balls  - count_left) / catchupStatus.balls  * 100).toFixed(3);
    	catchupStatus.percentComplete = (percent+'%');

        var elapsedTime = Date.now() - catchupStatus.startTime;
	var bpm = ((catchupStatus.balls - count_left) / (elapsedTime / 1000 / 60));
	var rem_time = (count_left / bpm);
	catchupStatus.eta = moment().add(rem_time, 'minutes').format("ddd, hA");

	db.query("SELECT datetime(int_value/1000,'unixepoch') AS ld FROM unit_authors JOIN data_feeds USING(unit) \n\
                  WHERE address='I2ADHGP4HL6J37NQAD73J7E5SKFIXJOT' AND feed_name='timestamp' \n\
                  ORDER BY unit_authors.rowid DESC LIMIT 1;", function(rs) {
	    if (rs.length === 1) {
                var at = moment(rs[0].ld);
                catchupStatus.lastUnitTimestamp = at.format('YYYY-MM-DD');
	    }
	});
    });
}


function handlePairing(fromAddress,pairingSecret){
	var device = require('byteballcore/device.js');
        sessions[fromAddress] = {};
	device.sendMessageToDevice(fromAddress, 'text', welcomeText);
}


function handleText(fromAddress, text){
	
	text = text.trim();
	var fields = text.split(/ /);
	var command = fields[0].trim().toLowerCase();
	var params =['',''];
	if (fields.length > 1) params[0] = fields[1].trim();
	if (fields.length > 2) params[1] = fields[2].trim();

	var device = require('byteballcore/device.js');
	switch(true){
		case UNIT_REGEX.test(text):
                        var u = text.match(UNIT_REGEX)[0];
			unitUtil.getInfoOnUnit(u, function(oi) {
			    var msg = (oi) ? formatUnitResponse(oi) : 'No info for ' + u;
			    device.sendMessageToDevice(fromAddress, 'text', msg);
			});
			break;
		case ADDR_REGEX.test(text):
			var addr = text.match(ADDR_REGEX)[0];
			addressUtil.getAddressInfo(addr, function(trans,us,b,end,def,lastInputsRowId,lastOutpusRowId) {
                            var ai = {
				address: addr,
                                definition: def,
                                unspent: us,
                                balance: b,
                                transactions: trans
                            };
                            var showAllUnspent = (params[0] && params[0] === 'showAllUnspent');
			    var msg = (ai) ? formatAddressResponse(ai,showAllUnspent) : 'No info for ' + addr;
			    device.sendMessageToDevice(fromAddress, 'text', msg);
			});
			break;
/*
		case /^first$/.test(command):
			db.query("SELECT unit FROM units ORDER BY rowid ASC LIMIT 1", function(rows) {
			    if (rows.length === 1) {
				unitUtil.getInfoOnUnit(rows[0].unit, function(oi) {
				    var msg = (oi) ? formatUnitResponse(oi) : 'No info for ' + rows[0].unit;
                                    device.sendMessageToDevice(fromAddress, 'text', msg);
				});
			    };
			});
			break;
*/
		case /^last$/.test(command):
			db.query("SELECT unit FROM units ORDER BY rowid DESC LIMIT 1", function(rows) {
			    if (rows.length === 1) {
				unitUtil.getInfoOnUnit(rows[0].unit, function(oi) {
				    var msg = (oi) ? formatUnitResponse(oi) : 'No info for ' + rows[0].unit;
                                    device.sendMessageToDevice(fromAddress, 'text', msg);
				});
			    };
			});
			break;
		case /^status$/.test(command):
			setSyncProgress();
			device.sendMessageToDevice(fromAddress, 'text',
			    "Status:\n" + 
                            "\tComplete: " + catchupStatus.percentComplete + "\n" +
                            "\tLast unit: " + catchupStatus.lastUnitTimestamp + "\n" +
                            "\tETA: " + catchupStatus.eta + "\n");
			break;
		case /^help$/.test(command):
			device.sendMessageToDevice(fromAddress, 'text', welcomeText);
			break;
		default:
			device.sendMessageToDevice(fromAddress, 'text', "unrecognized command: " + text);
	}
}

function setupChatEventHandlers(listenOnText) {
	eventBus.on('catching_up_started', function(){
	    catchupStatus.startTime = Date.now();
	    setSyncProgress();
	});
	eventBus.on('catchup_next_hash_tree', function(){
	    setSyncProgress();
	});
	eventBus.on('paired', function(fromAddress){
            console.log('paired '+fromAddress);
	    handlePairing(fromAddress);
	});

        if (listenOnText) {
	    eventBus.on('text', function(fromAddress, text){
	        handleText(fromAddress, text);
	    });
	}
}

// ----------------------------------------------------------------

exports.setupChatEventHandlers = setupChatEventHandlers;
exports.handleText = handleText;

if (require.main === module) {
    var headlessWallet = require('headless-byteball');
    headlessWallet.setupChatEventHandlers();
    setupChatEventHandlers(true);
}




