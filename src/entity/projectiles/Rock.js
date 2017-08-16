const B2 = require("../../modules/B2");
const B2Common = require("../../modules/B2Common");
var EntityFunctions = require('../EntityFunctions');
var lerp = require('lerp');

function Rock(x, y, gameServer) {
    this.id = Math.random();
    this.x = x;
    this.y = y;

    this.gameServer = gameServer;
    this.body = B2Common.createBox(this.gameServer.box2d_world, this.x, this.y, this.width, this.height);
}


Rock.prototype.init = function () {
    this.chunk = EntityFunctions.findChunk(this.gameServer, this);
    this.gameServer.CHUNKS[this.chunk].ROCK_LIST[this.id] = this;
    this.gameServer.ROCK_LIST[this.id] = this;
    this.packetHandler.addRockPackets(this);

};



Rock.prototype.tick = function () {
    this.decayVelocity();
};


Rock.prototype.decayVelocity = function () {
    var b = this.body;
    var v = b.GetLinearVelocity();

    v.x = lerp(v.x, 0, 0.05);
    v.y = lerp(v.y, 0, 0.05);

    //set the new velocity
    b.SetLinearVelocity(v);
};

