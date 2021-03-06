var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;
var http = require('http');


function getJson(url, path){
  var options = {
  host: url,
  port: 80,
  path: path,
  method: 'POST'
};

http.request(options, function(res) {
  console.log('STATUS: ' + res.statusCode);
  console.log('HEADERS: ' + JSON.stringify(res.headers));
  res.setEncoding('utf8');
  res.on('data', function (chunk) {
    console.log('BODY: ' + chunk);
    var json = JSON.parse(chunk)
    FAKE_LOCK.ePort = json["ePort"];


    if (FAKE_LOCK.ePort[7] == '1')
    {
      // lock
      //   .getService(Service.LockMechanism)
      //   .setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.UNSECURED);
      FAKE_LOCK.locked = true;
    console.log("on!");

    }
    else
    {
      // lock
      //   .getService(Service.LockMechanism)
      //   .setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.SECURED);
      FAKE_LOCK.locked = false;
    console.log("off!");

    }

  });
}).end();
}


// here's a fake hardware device that we'll expose to HomeKit
var FAKE_LOCK = {
  locked: false,
  ePort: '11111111',
  lock: function() { 
    console.log("Locking the lock!");
    FAKE_LOCK.locked = true;

    getJson("10.0.0.28", '/ePort/')
    console.log('before ePort: ' + FAKE_LOCK.ePort);
    var tmp = FAKE_LOCK.ePort.substr(0,6) + '11'
    ePort = String(parseInt(tmp,2))
    getJson("10.0.0.28", '/eport/'+ePort+'/')
  },
  unlock: function() { 
    console.log("Unlocking the lock!");
    FAKE_LOCK.locked = false;
    getJson("10.0.0.28", '/ePort/')
    console.log('before ePort: ' + FAKE_LOCK.ePort);

    var tmp = FAKE_LOCK.ePort.substr(0,6) + '00'
    ePort = String(parseInt(tmp,2))
    getJson("10.0.0.28", '/eport/'+ePort+'/')
  },
  identify: function() {
    console.log("Identify the lock!");
  }
}




// Generate a consistent UUID for our Lock Accessory that will remain the same even when
// restarting our server. We use the `uuid.generate` helper function to create a deterministic
// UUID based on an arbitrary "namespace" and the word "lock".
var lockUUID = uuid.generate('hap-nodejs:accessories:insidelock');

// This is the Accessory that we'll return to HAP-NodeJS that represents our fake lock.
var lock = exports.accessory = new Accessory('Inside Lock', lockUUID);

getJson("10.0.0.28", '/eport/')


// Add properties for publishing (in case we're using Core.js and not BridgedCore.js)
lock.username = "C1:5D:3A:EE:5E:FB";
lock.pincode = "031-45-154";

// set some basic properties (these values are arbitrary and setting them is optional)
lock
  .getService(Service.AccessoryInformation)
  .setCharacteristic(Characteristic.Manufacturer, "Oltica")
  .setCharacteristic(Characteristic.Model, "Rev-1")
  .setCharacteristic(Characteristic.SerialNumber, "A1S2NASF88EW");

// listen for the "identify" event for this Accessory
lock.on('identify', function(paired, callback) {
  FAKE_LOCK.identify();
  callback(); // success
});

// Add the actual Door Lock Service and listen for change events from iOS.
// We can see the complete list of Services and Characteristics in `lib/gen/HomeKitTypes.js`
lock
  .addService(Service.LockMechanism, "Inside Speaker") // services exposed to the user should have "names" like "Fake Light" for us
  .getCharacteristic(Characteristic.LockTargetState)
  .on('set', function(value, callback) {
    
    if (value == Characteristic.LockTargetState.UNSECURED) {
      FAKE_LOCK.unlock();
      callback(); // Our fake Lock is synchronous - this value has been successfully set
      
      // now we want to set our lock's "actual state" to be unsecured so it shows as unlocked in iOS apps
      lock
        .getService(Service.LockMechanism)
        .setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.UNSECURED);
    }
    else if (value == Characteristic.LockTargetState.SECURED) {
      FAKE_LOCK.lock();
      callback(); // Our fake Lock is synchronous - this value has been successfully set
      
      // now we want to set our lock's "actual state" to be locked so it shows as open in iOS apps
      lock
        .getService(Service.LockMechanism)
        .setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.SECURED);
    }
  });

// We want to intercept requests for our current state so we can query the hardware itself instead of
// allowing HAP-NodeJS to return the cached Characteristic.value.
lock
  .getService(Service.LockMechanism)
  .getCharacteristic(Characteristic.LockCurrentState)
  .on('get', function(callback) {
    
    // this event is emitted when you ask Siri directly whether your lock is locked or not. you might query
    // the lock hardware itself to find this out, then call the callback. But if you take longer than a
    // few seconds to respond, Siri will give up.
    
    var err = null; // in case there were any problems
    
    if (FAKE_LOCK.locked) {
      console.log("Are we locked? Yes.");
      callback(err, Characteristic.LockCurrentState.SECURED);
    }
    else {
      console.log("Are we locked? No.");
      callback(err, Characteristic.LockCurrentState.UNSECURED);
    }
  });
