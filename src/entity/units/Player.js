const entityConfig = require('../entityConfig');
var EntityFunctions = require('../EntityFunctions');
var Controller = require('./Controller');
var Queue = require('../../modules/Queue');
var B2 = require('../../modules/B2');
var B2Common = require('../../modules/B2Common');
var lerp = require('lerp');

function Player(id, name, gameServer) {
    Player.super_.call(this, id, gameServer);
    this.name = getName(name);
    this.type = "Player";
    this.radius = 10;

    this.setMaxVelocities();

    this.rocks = [];
    this.rockQueue = new Queue(); //maximum length of 10

    this.x = entityConfig.WIDTH / 2;
    this.y = entityConfig.WIDTH / 2;

    this.preX = this.x;
    this.preY = this.y;

    this.slash = [];
    this.slash.theta = null;
    this.slashTimer = 0;

    this.kills = 0;

    this.theta = 0;

    this.resetLevels();
    this.dPopulateRockQueue();
    this.init();
    this.createCircle(4);
}

EntityFunctions.inherits(Player, Controller);

Player.prototype.onDelete = function () {
    this.removeAllRocks();
    Player.super_.prototype.onDelete.apply(this);
};

Player.prototype.getTheta = function (pos1, pos2) {
    var newTheta = Math.atan((pos2.y - pos1.y) / (pos2.x - pos1.x));

    if (pos2.y - pos1.y > 0 && pos2.x - pos1.x > 0 || pos2.y - pos1.y < 0 && pos2.x - pos1.x > 0) {
        newTheta += Math.PI;
    }
    return newTheta % (2 * Math.PI);
};

Player.prototype.update = function () {
    Player.super_.prototype.update.apply(this);


    if (this.slashTimer > 0) {
        this.slashTimer -= 1;
    }

    if (!this.default) {
        //console.log(this.xVel, this.yVel);
        this.translateQueuePositions();
    }


    if (this.default) {
        if (square(this.x - this.preX) + square(this.y - this.preY) > 1) {
            this.dUpdateRockQueue();
            this.preX = this.x;
            this.preY = this.y;
        }
    }
    else {
        //TODO: update queue positions based on speed of player
    }
};

Player.prototype.createCircle = function (radius) {
    if (!radius) {
        return;
    }
    this.default = false;
    this.circleRadius = radius;

    var delta = 2 * Math.PI / this.rocks.length;
    console.log(delta);
    var theta, rock;

    for (var i = 0; i < this.rocks.length; i++) {
        theta = delta * i;
        rock = this.rocks[i];
        rock.queuePosition = {
            x: this.x + radius * Math.cos(theta),
            y: this.y + radius * Math.sin(theta)
        };
    }

    this.pX = this.x;
    this.pY = this.y;
};

Player.prototype.createDefault = function () {
    this.default = true;
    this.dPopulateRockQueue();
    this.circleRadius = null;
};

Player.prototype.resetLevels = function () {
    this.level = 0;
    this.range = 500;
    this.radius = 10;
    this.maxVel = 5;
    this.maxGrabRadius = 50;
    this.power = 0; //power determines max size of things you can hold


    this.rockMaxLength = 10;
    this.food = 0;
    this.maxFood = 2;
    this.default = true;
};

Player.prototype.decreaseHealth = function (amount) {
    if (this.health <= 0) {
        this.reset();
    }
    this.packetHandler.updateControllersPackets(this);
};

Player.prototype.increaseHealth = function (amount) {
    if (this.health <= 10) {
        this.health += amount;
    }
};

Player.prototype.updateChunk = function () {
    var oldChunks = this.findNeighboringChunks();
    Player.super_.prototype.updateChunk.apply(this);
    var newChunks = this.findNeighboringChunks();
    this.chunkAdd = this.findChunkDifference(newChunks, oldChunks);
    this.chunkDelete = this.findChunkDifference(oldChunks, newChunks);
};
Player.prototype.findChunkDifference = function (chunks1, chunks2) {
    var id;
    var delta = {};
    for (id in chunks1) {
        if (chunks2[id] === undefined) {
            delta[id] = id;
        }
    }
    return delta;
};
Player.prototype.findNeighboringChunks = function () {
    var rowLength = Math.sqrt(entityConfig.CHUNKS);
    var chunks = {};

    for (var i = 0; i < 9; i++) {
        var chunk = this.chunk;
        var xIndex = i % 3 - 1;
        var yIndex = Math.floor(i / 3) - 1;

        while (!(chunk % rowLength + xIndex).between(0, rowLength - 1) ||
        !(Math.floor(chunk / rowLength) + yIndex).between(0, rowLength - 1)) {
            i++;
            if (i > 8) {
                return chunks;
            }
            xIndex = i % 3 - 1;
            yIndex = Math.floor(i / 3) - 1;
        }
        chunk += xIndex + rowLength * yIndex;
        chunks[chunk] = chunk;
    }
    return chunks;
};


Player.prototype.selectAsteroid = function (x, y) {
    return new Selector(x, y, this);
};


Player.prototype.addRock = function (rock) {
    if (!this.containsRock(rock) &&
        this.rocks.length <= this.rockMaxLength) {

        this.rocks.push(rock);
        rock.addOwner(this);
        if (this.default) {
            this.updateQueuePositions();
        }
        else {
            this.createCircle(this.circleRadius);
        }

    }



};


Player.prototype.containsRock = function (rock) {
    for (var i = 0; i < this.rocks.length; i++) {
        if (this.rocks[i] === rock) {
            return true;
        }
    }
    return false;
};


Player.prototype.dPopulateRockQueue = function () { //default populate rock queue
    this.rockQueue = new Queue();
    var theta = this.theta;
    var x, y;
    for (var i = 0; i < this.rockMaxLength; i++) { //10 possible nodes in the queue
        x = this.x + 0.3 * i * Math.cos(theta);
        y = this.y + 0.3 * i * Math.sin(theta);
        this.rockQueue.enqueue(
            {
                x: x,
                y: y
            });
    }
    this.updateQueuePositions();
};

Player.prototype.dUpdateRockQueue = function () { //default update
    this.rockQueue.dequeue();
    this.rockQueue.enqueue({
        x: this.x,
        y: this.y
    });
    this.updateQueuePositions();
};



Player.prototype.endNewTail = function () {
    this.newLength = 0;
    this.clicked = false;
};


Player.prototype.mAttemptEnqueue = function (x, y) {
    if (!this.preXQ) {
        this.preXQ = x;
        this.preYQ = y;
    }
    else if (normal(x - this.preXQ, y - this.preYQ) > 0.5) {
        if (this.newLength < this.rockMaxLength) {
            this.newLength++;
        }
        else {
            this.endNewTail();
            return;
        }
        this.mAddToRockQueueConstruct(x, y);
        this.preXQ = x;
        this.preYQ = y;
    }
};


Player.prototype.updateQueuePositions = function () {
    var rock;
    for (var i = 0; i < this.rocks.length; i++) {
        rock = this.rocks[i];
        rock.queuePosition = this.rockQueue.peek(this.rockMaxLength - 1 - i);
    }
};

Player.prototype.translateQueuePositions = function () {
    var rock;
    var x = this.x - this.pX;
    var y = this.y - this.pY;

    this.pX = this.x;
    this.pY = this.y;

    for (var i = 0; i < this.rocks.length; i++) {
        rock = this.rocks[i];

        if (rock.queuePosition) {
            rock.queuePosition.x += x;
            rock.queuePosition.y += y;
        }

        //var v = rock.body.GetLinearVelocity();
        //v.x += 0.5 * this.xVel; //1.25 is perfect lol
        //v.y += 0.5 * this.yVel;
        //rock.body.SetLinearVelocity(v);

    }
};


Player.prototype.resetRockQueue = function () { //idk why
    var rock;
    for (var i = 0; i < this.rocks.length; i++) {
        rock = this.rocks[i];
        rock.resetPathQueue();
    }
};


Player.prototype.shootRock = function (x, y) {
    var rock = this.rocks[0];
    if (!rock) return;

    this.removeRock(rock);
    rock.shoot(this, x, y);

    this.createCircle(this.circleRadius);
};


Player.prototype.consumeRock = function (rock) {
    this.eat(rock.feed);
    this.removeRock(rock);
    rock.onDelete();
};
Player.prototype.eat = function (amount) {
    if (amount > 0) {
        this.food++;
    }
    if (this.food > this.maxFood) {
        this.levelUp();
    }
};
Player.prototype.levelUp = function () {
    //increase health
    //decrease speed
    //update character model
    //reset food and maxFood
    //level up length of asteroids
    //level up animation

    this.level++;
    this.range += 100;
    this.radius += 10;
    this.maxGrabRadius += 100;
    this.updateMaxVelocities(-0.5);
    this.power += 10; //power determines max size of things you can hold
    this.rockMaxLength += 2;
    this.food = 0;
    this.maxFood++;

    console.log("LEVEL UP: " + this.radius);
};


Player.prototype.removeRock = function (rock) {
    var index = this.rocks.indexOf(rock);
    if (index !== -1) {
        this.rocks.splice(index, 1);
        rock.removeOwner();
    }
    //this.updateQueuePositions();
};


Player.prototype.updateMaxVelocities = function (amount) {
    this.maxVel += amount;
    this.setMaxVelocities();
};


Player.prototype.removeAllRocks = function () {
    var i;
    for (i = this.rocks.length - 1; i >= 0; i--) {
        this.removeRock(this.rocks[i]);
    }
};

Player.prototype.onDeath = function () {
    this.reset();
};

Player.prototype.reset = function () { //should delete this eventually, or only use during debugging
    this.resetLevels();

    this.x = entityConfig.WIDTH / 2;
    this.y = entityConfig.WIDTH / 2;

    this.xVel = 0;
    this.yVel = 0;

    this.stationary = false;
    this.updateQuadItem();
};


function Selector(x, y, parent) {
    this.id = Math.random();
    this.x = x;
    this.y = y;
    this.chunk = parent.chunk;
    this.parent = parent;
    this.body = B2Common.createBox(this.parent.gameServer.box2d_world, this.parent, x, y, 0.2, 0.2);
    //this.parent.packetHandler.addRockPackets(this);
}


function square(x) {
    return x * x;
}

function getName(name) {
    if (name === "") {
        return "unnamed friend";
    }
    return name;
}

function normal(x, y) {
    return Math.sqrt(x * x + y * y);
}

module.exports = Player;
