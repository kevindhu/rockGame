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
    this.theta = 0;

    this.queuePosition = null;
    this.owner = null;

    this.init();
}

Rock.prototype.init = function () {
    this.setB2();
    this.chunk = EntityFunctions.findChunk(this.gameServer, this);
    this.gameServer.CHUNKS[this.chunk].ROCK_LIST[this.id] = this;
    this.gameServer.ROCK_LIST[this.id] = this;
    this.packetHandler.addRockPackets(this);
};

Rock.prototype.setB2 = function () {
    //this.body = B2Common.createBox(this.gameServer.box2d_world, this, this.x, this.y, 0.4, 0.4);

    var vertices = [];
    vertices[0] = [0,getRandom(1,2)];
    vertices[1] = [getRandom(1,2),1];
    vertices[2] = [1,getRandom(2,3)];
    vertices[3] = [0,getRandom(2,3)];


    this.vertices = vertices;


    this.body = B2Common.createRandomPolygon(this.gameServer.box2d_world, this, vertices, this.x, this.y);
    this.getRandomVelocity();
};


Rock.prototype.tick = function () {
    //this.decayVelocity();
    this.packetHandler.updateRockPackets(this);
    this.move();
};



Rock.prototype.move = function () {
    var x = this.body.GetPosition().x;
    var y = this.body.GetPosition().y;

    if (this.queuePosition) {
        var v = this.body.GetLinearVelocity();
        this.getTheta(this.queuePosition);

        if (this.owner.default) {
            if (inBounds(x, this.queuePosition.x, 0.5) &&
                inBounds(y, this.queuePosition.y, 0.5)) {
                //this.queuePosition = null;
            }
            else {
                v.x = 1.1 * (this.queuePosition.x - x);
                v.y = 1.1 * (this.queuePosition.y - y);
            }
        }
        else {
            if (inBounds(x, this.queuePosition.x, 0.3) &&
                inBounds(y, this.queuePosition.y, 0.3)) {
                //this.queuePosition = null;
            }
            else  {
                v.x = 2 * (this.queuePosition.x - x) + this.owner.xVel;
                v.y = 2 * (this.queuePosition.y - y) + this.owner.yVel;
            }
        }
        this.body.SetLinearVelocity(v);
        this.decayVelocity();
    }
};


function inBounds(x1, x2, range) {
    return Math.abs(x1 - x2) < range;
}


Rock.prototype.addOwner = function (owner) {
    this.owner = owner;
};

Rock.prototype.removeOwner = function () {
    this.owner = null;
    this.queuePosition = null;
};

Rock.prototype.getTheta = function (target, hard) {
    var x = this.body.GetPosition().x;
    var y = this.body.GetPosition().y;

    this.theta = Math.atan2(target.y - y, target.x - x) % (2 * Math.PI);
};

Rock.prototype.getRandomVelocity = function () {
    var v = this.body.GetLinearVelocity();
    v.Add(new B2.b2Vec2(getRandom(-0.4, 0.4), getRandom(-0.4,0.4)));
    this.body.SetLinearVelocity(v);
};

Rock.prototype.decayVelocity = function () {
    var b = this.body;
    var v = b.GetLinearVelocity();

    v.x = lerp(v.x, 0, 0.2);
    v.y = lerp(v.y, 0, 0.2);


    //set the new velocity
    b.SetLinearVelocity(v);
};


Rock.prototype.addShooting = function (owner, x, y) {
    this.queuePosition = null;
    this.shooting = true;
    this.shooter = owner;
    this.tempNeutral = owner;
    this.shootTimer = 60;

    this.getTheta({
        x: x,
        y: y
    }, true);

    this.targetPt = {
        x: x,
        y: y
    };


    var v = this.body.GetLinearVelocity();
    v.x = 20 * Math.cos(this.theta);
    v.y = 20 * Math.sin(this.theta);
    this.body.SetLinearVelocity(v);
};



function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

module.exports = Rock;
