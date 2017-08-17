const entityConfig = require('../entityConfig');
var EntityFunctions = require('../EntityFunctions');
const Arithmetic = require('../../modules/Arithmetic');

var lerp = require('lerp');

function Controller(id, gameServer) {
    this.id = id;
    this.gameServer = gameServer;
    this.packetHandler = gameServer.packetHandler;

    this.radius = 20;

    this.stationary = true;
    this.maxHealth = 5;
    this.health = 5;
    this.maxVel = 1;
    this.maxXVel = 10;
    this.maxYVel = 10;
    this.timer = 0;
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
    this.addQuadItem();
    this.gameServer.CONTROLLER_LIST[this.id] = this;
    this.chunk = EntityFunctions.findChunk(this.gameServer, this);
    this.gameServer.CHUNKS[this.chunk].CONTROLLER_LIST[this.id] = this;
    this.gameServer.packetHandler.addControllerPackets(this);
};


Controller.prototype.onDelete = function () {
    this.gameServer.controllerTree.remove(this.quadItem);

    delete this.gameServer.CONTROLLER_LIST[this.id];
    delete this.gameServer.CHUNKS[this.chunk].CONTROLLER_LIST[this.id];
    this.packetHandler.deleteControllerPackets(this);
};


Controller.prototype.update = function () {
    this.updatePosition();
    this.updateQuadItem();
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
    var xImpulse = (4 - xAdd)/10;
    var yImpulse = (4 - yAdd)/10;


    this.xVel += (controller.x > this.x) ? -xImpulse: xImpulse;
    this.yVel += (controller.y > this.y) ? -yImpulse: yImpulse;
};


Controller.prototype.addQuadItem = function () {
    this.quadItem = {
        cell: this,
        bound: {
            minx: this.x - this.radius,
            miny: this.y - this.radius,
            maxx: this.x + this.radius,
            maxy: this.y + this.radius
        }
    };
    this.gameServer.controllerTree.insert(this.quadItem);
};

Controller.prototype.updateQuadItem = function () {
    if (!this.stationary) { //also maybe add a timer so it doesn't update every frame
        this.quadItem.bound = {
            minx: this.x - this.radius,
            miny: this.y - this.radius,
            maxx: this.x + this.radius,
            maxy: this.y + this.radius
        };
        this.gameServer.controllerTree.remove(this.quadItem);
        this.gameServer.controllerTree.insert(this.quadItem);
    }
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
    this.checkStationary();
    this.checkStuck();
    this.y += this.yVel;
    this.x += this.xVel;
};



Controller.prototype.checkStationary = function () {
    if (Math.abs(this.yVel) <= 0.05 && Math.abs(this.xVel) <= 0.05) {
        this.yVel = 0;
        this.xVel = 0;
        this.stationary = true;
    }
    else {
        this.stationary = false;
    }
};


Controller.prototype.checkStuck = function () {
    var resolveStuck = function (coord) {
        var newCoord;
        if (overBoundary(coord)) {
            if (coord < entityConfig.WIDTH / 2) {
                newCoord = entityConfig.BORDER_WIDTH + 100;
                return newCoord;
            }
            else {
                newCoord = entityConfig.WIDTH - entityConfig.BORDER_WIDTH - 100;
                return newCoord;
            }
        }
        return coord;
    };

    this.x = resolveStuck(this.x);
    this.y = resolveStuck(this.y);
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
