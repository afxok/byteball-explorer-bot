/*jslint node: true */
"use strict";

exports.port = null;
exports.bServeAsHub = false;
exports.bLight = false;
exports.bIgnoreUnpairRequests = true;
exports.bSingleAddress = false;

exports.storage = 'sqlite';

exports.hub = 'byteball.org/bb';
exports.deviceName = 'Explorer Bot';
exports.permanent_pairing_secret = '0000';
exports.control_addresses = [];
exports.payout_address = 'WHERE THE MONEY CAN BE SENT TO';
exports.KEYS_FILENAME = 'keys.json';

// where logs are written to (absolute path).  Default is log.txt in app data directory
//exports.LOG_FILENAME = '/dev/null';

// consolidate unspent outputs when there are too many of them.  Value of 0 means do not try to consolidate
exports.MAX_UNSPENT_OUTPUTS = 0;
exports.CONSOLIDATION_INTERVAL = 3600*1000;

console.log('finished node conf');
