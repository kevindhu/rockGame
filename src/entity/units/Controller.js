var B2 = require("../../modules/B2");
var B2Common = require("../../modules/B2Common");
const entityConfig = require('../entityConfig');
var EntityFunctions = require('../EntityFunctions');
const Arithmetic = require('../../modules/Arithmetic');

var lerp = require('lerp');

function Controller(id, gameServer) {
    this.id = id;
    this.gameServer = gameServer;
    this.packetHandler = gameServer.packetHandler;

    this.radius = 20;

    this.maxHealth = 5;
    this.health = 5;
    this.xVel = 0;
    this.yVel = 0;
    this.theta = 0;

    this.selected = false;
    this.pressingRight = false;
    this.pressingLeft = false;
    this.pressingUp = false;
    this.pressingDown = false;
}

Controller.prototype.init = function () {
    this.setMaxVelocities();
    this.initB2();
    this.gameServer.CONTROLLER_LIST[this.id] = this;
    this.chunk = EntityFunctions.findChunk(this.gameServer, this);
    this.gameServer.CHUNKS[this.chunk].CONTROLLER_LIST[this.id] = this;
    this.gameServer.packetHandler.addControllerPackets(this);
};

Controller.prototype.setMaxVelocities = function () {
    this.maxXVel = this.maxVel * Math.sin(Math.PI / 4);
    this.maxYVel = this.maxVel * Math.cos(Math.PI / 4);
};


Controller.prototype.initB2 = function () {
    this.body = B2Common.createBox(this.gameServer.box2d_world, this, this.x, this.y, 1, 1);


};

Controller.prototype.onDelete = function () {
    delete this.gameServer.CONTROLLER_LIST[this.id];
    delete this.gameServer.CHUNKS[this.chunk].CONTROLLER_LIST[this.id];
    this.packetHandler.deleteControllerPackets(this);
};


Controller.prototype.update = function () {
    this.updatePosition();
    this.updateChunk();

    this.packetHandler.updateControllersPackets(this);
};


Controller.prototype.updateChunk = function () {
    var newChunk = EntityFunctions.findChunk(this.gameServer, this);
    if (newChunk !== this.chunk) {
        delete this.gameServer.CHUNKS[this.chunk].CONTROLLER_LIST[this.id];
        this.chunk = newChunk;
        this.gameServer.CHUNKS[this.chunk].CONTROLLER_LIST[this.id] = this;
    }
};


Controller.prototype.ricochet = function (controller) {
    var xAdd = Math.abs(controller.x - this.x) / 20;
    var yAdd = Math.abs(controller.y - this.y) / 20;
    if (xAdd < 0) {
        xAdd = 4;
    }
    if (yAdd < 0) {
        yAdd = 4;
    }
    var xImpulse = (4 - xAdd) / 10;
    var yImpulse = (4 - yAdd) / 10;


    this.xVel += (controller.x > this.x) ? -xImpulse : xImpulse;
    this.yVel += (controller.y > this.y) ? -yImpulse : yImpulse;
};


Controller.prototype.increaseHealth = function (amount) {
    if (this.health <= 10) {
        this.health += amount;
    }
};
Controller.prototype.decreaseHealth = function (amount) {
    this.health -= amount;
    if (this.health <= 0) {
        this.onDeath();
    }
};

Controller.prototype.updatePosition = function () {
    if (this.pressingDown) {
        this.yVel = lerp(this.yVel, this.maxYVel, 0.3);
    }
    if (this.pressingUp) {
        this.yVel = lerp(this.yVel, -this.maxYVel, 0.3);
    }
    if (this.pressingLeft) {
        this.xVel = lerp(this.xVel, -this.maxXVel, 0.2);
    }
    if (this.pressingRight) {
        this.xVel = lerp(this.xVel, this.maxXVel, 0.2);
    }
    if (!this.pressingRight && !this.pressingLeft) { //decay x Vel
        this.xVel = lerp(this.xVel, 0, 0.2);
    }
    if (!this.pressingUp && !this.pressingDown) { //decay y Vel
        this.yVel = lerp(this.yVel, 0, 0.2);
    }
    if (onBoundary(this.x + this.xVel)) {
        this.xVel = 0;
    }
    if (onBoundary(this.y + this.yVel)) {
        this.yVel = 0;
    }

    var vel = this.body.GetLinearVelocity();
    vel.x = this.xVel;
    vel.y = this.yVel;

    this.body.SetLinearVelocity(vel);


    this.x = this.body.GetPosition().x;
    this.y = this.body.GetPosition().y;
};




function onBoundary(coord) {
    return coord <= entityConfig.BORDER_WIDTH ||
        coord >= entityConfig.WIDTH - entityConfig.BORDER_WIDTH;
}

function overBoundary(coord) {
    return coord < entityConfig.BORDER_WIDTH - 1 ||
        coord > entityConfig.WIDTH - entityConfig.BORDER_WIDTH + 1;
}

module.exports = Controller;
