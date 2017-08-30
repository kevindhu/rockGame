const entityConfig = require('../entityConfig');
var EntityFunctions = require('../EntityFunctions');
var Controller = require('./Controller');
var Queue = require('../../modules/Queue');
var Miner = require('../sensors/Miner');
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
    this.miners = [];
    this.rockQueue = new Queue(); //maximum length of 10

    this.x = entityConfig.WIDTH / 2;
    this.y = entityConfig.WIDTH / 2;

    this.preX = this.x;
    this.preY = this.y;

    this.mover = {
        x: 0,
        y: 0
    };

    this.kills = 0;

    this.theta = 0;

    this.resetLevels();
    this.init();
    //this.createCircle(4);
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
    if (this.dead) {
        this.body = B2Common.createBox(this.gameServer.box2d_world, this, this.x, this.y, 1, 1);
        this.dead = false;
    }
    if (this.realMover) {
        this.mover.x = lerp(this.mover.x, this.realMover.x, 0.1);
        this.mover.y = lerp(this.mover.y, this.realMover.y, 0.1);
    }
    this.move(this.mover.x, this.mover.y);

    this.x = this.body.GetPosition().x;
    this.y = this.body.GetPosition().y;

    this.packetHandler.updateControllersPackets(this);
};

Player.prototype.setMove = function (x, y) {
    this.realMover = {
        x: x,
        y: y
    }
};

Player.prototype.updateMiners = function () {
    var i, miner;
    for (i = 0; i < this.miners.length; i++) {
        miner = this.miners[i];
        miner.tick();
    }
};

Player.prototype.createCircle = function (radius) {
    if (!radius) {
        return;
    }
    this.circleRadius = radius;

    var delta = 2 * Math.PI / this.rocks.length;
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


Player.prototype.resetLevels = function () {
    this.level = 0;
    this.range = 1000;
    this.radius = 10;
    this.maxVel = 5;

    this.rockMaxLength = 10;
    this.food = 0;
    this.maxFood = 2;
};

Player.prototype.decreaseHealth = function (amount) {
    this.health -= amount;
    if (this.health <= 0) {
        this.onDeath();
    }
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
        this.createCircle(this.circleRadius);


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

        var v = rock.body.GetLinearVelocity();
        v.x = 1.2 * this.xVel; //1.25 is perfect lol
        v.y = 1.2 * this.yVel;
        rock.body.SetLinearVelocity(v);

    }
};


Player.prototype.resetRockQueue = function () { //idk why
    var rock;
    for (var i = 0; i < this.rocks.length; i++) {
        rock = this.rocks[i];
        rock.resetPathQueue();
    }
};


Player.prototype.addMiner = function (x, y) {
    var miner = new Miner(x, y, this);
    this.miners.push(miner);
};

Player.prototype.shootRock = function (x, y) {
    var rock = this.findClosestRock({x: x, y: y});
    if (!rock) return;

    this.removeRock(rock);
    rock.shoot(this, x, y);
};


Player.prototype.getTheta = function (target, origin) {
    this.theta = Math.atan2(target.y - origin.y, target.x - origin.x) % (2 * Math.PI);
};

Player.prototype.shootSelf = function (x, y) {
    var target = {
        x: x,
        y: y
    };

    var origin = {
        x: this.x,
        y: this.y
    };

    this.getTheta(target, origin);

    var v = this.body.GetLinearVelocity();
    v.x = 20 * Math.cos(this.theta);
    v.y = 20 * Math.sin(this.theta);
    this.body.SetLinearVelocity(v);
};


Player.prototype.findClosestRock = function (target) {
    var closest = this.rocks[0];
    var dist = function (rock, target) {
        var x = rock.body.GetPosition().x;
        var y = rock.body.GetPosition().y;
        return (x - target.x) * (x - target.x) + (y - target.y) * (y - target.y);
    };
    for (var i = 1; i < this.rocks.length; i++) {
        var rock = this.rocks[i];
        var dist1 = dist(closest, target);
        var dist2 = dist(rock, target);
        if (dist1 > dist2) {
            closest = rock;
        }
    }
    return closest;
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
};


Player.prototype.move = function (x, y) {
    function normal(x, y) {
        return Math.sqrt(x * x + y * y);
    }


    var normalVel = normal(x, y);
    if (normalVel < 1) {
        normalVel = 1;
    }

    var pos = this.body.GetPosition();
    pos.x += x / normalVel / 10;
    pos.y += y / normalVel / 10;

    this.body.SetPosition(pos);

};

Player.prototype.removeRock = function (rock) {
    var index = this.rocks.indexOf(rock);
    if (index !== -1) {
        this.rocks.splice(index, 1);
    }
    //this.createCircle(this.circleRadius);
};

Player.prototype.removeMiner = function (miner) {
    var index = this.miners.indexOf(miner);
    if (index !== -1) {
        this.miners.splice(index, 1);
    }
};


Player.prototype.updateMaxVelocities = function (amount) {
    this.maxVel += amount;
    this.setMaxVelocities();
};


Player.prototype.removeAllRocks = function () {
    var i;
    for (i = this.rocks.length - 1; i >= 0; i--) {
        var rock = this.rocks[i];
        this.removeRock(rock);
        rock.removeOwner();
    }
};

Player.prototype.onDeath = function () {
    this.reset();
};

Player.prototype.reset = function () { //should delete this eventually, or only use during debugging
    this.resetLevels();

    this.x = entityConfig.WIDTH / 2;
    this.y = entityConfig.WIDTH / 2;

    this.gameServer.box2d_world.DestroyBody(this.body);
    this.dead = true;
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
