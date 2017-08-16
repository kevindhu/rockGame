var B2 = require("../../modules/B2");
var B2Common = require("../../modules/B2Common");
var EntityFunctions = require('../EntityFunctions');
var lerp = require('lerp');

function Rock(x, y, gameServer) {
    this.gameServer = gameServer;
    this.packetHandler = gameServer.packetHandler;

    this.id = Math.random();
    this.x = x;
    this.y = y;


    this.body = B2Common.createBox(this.gameServer.box2d_world, this.x, this.y, 50, 50);

    this.getRandomVelocity();
    this.init();
}




Rock.prototype.init = function () {
    this.chunk = EntityFunctions.findChunk(this.gameServer, this);
    this.gameServer.CHUNKS[this.chunk].ROCK_LIST[this.id] = this;
    this.gameServer.ROCK_LIST[this.id] = this;
    this.packetHandler.addRockPackets(this);
};



Rock.prototype.tick = function () {
    //this.decayVelocity();
    this.packetHandler.updateRockPackets(this);
};


Rock.prototype.getRandomVelocity = function () {
    var v = this.body.GetLinearVelocity();
    v.Add(new B2.b2Vec2(getRandom(-100, 100), getRandom(-100,100)));
    this.body.SetLinearVelocity(v);
};

Rock.prototype.decayVelocity = function () {
    var b = this.body;
    var v = b.GetLinearVelocity();

    v.x = lerp(v.x, 0, 0.05);
    v.y = lerp(v.y, 0, 0.05);

    //set the new velocity
    b.SetLinearVelocity(v);
};


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

module.exports = Rock;
