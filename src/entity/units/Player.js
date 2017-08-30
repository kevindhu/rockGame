const entityConfig = require('../entityConfig');
var EntityFunctions = require('../EntityFunctions');
var Queue = require('../../modules/Queue');
const PlayerSensor = require('../sensors/PlayerSensor');

var B2 = require('../../modules/B2');
var B2Common = require('../../modules/B2Common');
var lerp = require('lerp');

function Player(id, name, gameServer) {
    this.gameServer = gameServer;
    this.packetHandler = gameServer.packetHandler;
    this.id = id;

    this.radius = 20;
    this.theta = 0;

    this.name = getName(name);
    this.type = "Player";

    this.x = entityConfig.WIDTH / 2;
    this.y = entityConfig.WIDTH / 2;
    this.shooting = false;
    this.mover = {
        x: 0,
        y: 0
    };

    this.rocks = [];

    this.resetLevels();
    this.init();
}


Player.prototype.init = function () {
    this.initB2();
    this.gameServer.PLAYER_LIST[this.id] = this;
    this.chunk = EntityFunctions.findChunk(this.gameServer, this);
    this.gameServer.CHUNKS[this.chunk].PLAYER_LIST[this.id] = this;
    this.gameServer.packetHandler.addPlayerPackets(this);
};

Player.prototype.initB2 = function () {
    this.body = B2Common.createBox(this.gameServer.box2d_world, this, this.x, this.y, 2, 2);
    this.sensor = new PlayerSensor(this);
};

Player.prototype.onDelete = function () {
    delete this.gameServer.PLAYER_LIST[this.id];
    delete this.gameServer.CHUNKS[this.chunk].PLAYER_LIST[this.id];
    this.packetHandler.deletePlayerPackets(this);
};


Player.prototype.updateChunk = function () {
    var newChunk = EntityFunctions.findChunk(this.gameServer, this);
    if (newChunk !== this.chunk) {
        delete this.gameServer.CHUNKS[this.chunk].PLAYER_LIST[this.id];
        this.chunk = newChunk;
        this.gameServer.CHUNKS[this.chunk].PLAYER_LIST[this.id] = this;
    }
};


module.exports = Player;


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


    if (this.boosting) {
        this.boostTimer -= 1;
        if (this.boostTimer <= 0) {
            this.boosting = false;
            this.boostVelocity();
        }
    }
    if (this.shooting) {
        this.shootTimer -= 1;
        if (this.shootTimer <= 0) {
            this.shooting = false;
        }
    }

    this.increaseHealth(0.1);


    if (this.realMover) {
        this.mover.x = lerp(this.mover.x, this.realMover.x, 0.1);
        this.mover.y = lerp(this.mover.y, this.realMover.y, 0.1);
    }
    this.move(this.mover.x, this.mover.y);

    this.x = this.body.GetPosition().x;
    this.y = this.body.GetPosition().y;

    this.packetHandler.updatePlayersPackets(this);
};

Player.prototype.setMove = function (x, y) {
    this.realMover = {
        x: x,
        y: y
    };
};

Player.prototype.resetLevels = function () {
    this.maxHealth = 100;
    this.health = this.maxHealth;

    this.level = 0;
    this.range = 1000;
    this.radius = 20;
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
    if (this.health <= this.maxHealth) {
        this.health += amount;
    }
};

Player.prototype.updateChunk = function () {
    var oldChunks = this.findNeighboringChunks();
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
    v.x = 30 * Math.cos(this.theta);
    v.y = 30 * Math.sin(this.theta);
    this.body.SetLinearVelocity(v);

    this.shooting = true;
    this.shootTimer = 15;
};


Player.prototype.addRock = function (rock) {
    if (!this.containsRock(rock) &&
        this.rocks.length <= this.rockMaxLength) {

        this.rocks.push(rock);
        rock.addOwner(this);
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

Player.prototype.removeRock = function (rock) {
    var index = this.rocks.indexOf(rock);
    if (index !== -1) {
        this.rocks.splice(index, 1);
    }
};


Player.prototype.stallVelocity = function () {
    var v = this.body.GetLinearVelocity();
    v.x = 0;
    v.y = 0;

    this.body.SetLinearVelocity(v);
};

Player.prototype.boostVelocity = function () {
    var v = this.body.GetLinearVelocity();
    v.x *= 5;
    v.y *= 5;

    this.body.SetLinearVelocity(v);
};



Player.prototype.addRock = function (rock) {
    this.rocks.push(rock);
    rock.addOwner(this);
};

Player.prototype.consumeRock = function (rock) {
    this.eat(10);
    rock.dead = true;
};

Player.prototype.eat = function (amount) {
    if (amount > 0) {
        this.food++;
        this.increaseHealth(amount);
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
    this.updateMaxVelocities(-0.5);


    this.grabRadius += 1; //the range of rocks that will come to you for eating
    this.power += 10; //power determines max size of things you can hold


    this.food = 0;
    this.maxFood++;
};


Player.prototype.move = function (x, y) {
    var normalVel = normal(x, y);
    if (normalVel < 1) {
        normalVel = 1;
    }

    var pos = this.body.GetPosition();
    pos.x += x / normalVel / 4;
    pos.y += y / normalVel / 4;

    this.body.SetPosition(pos);

};


Player.prototype.updateMaxVelocities = function (amount) {
    this.maxVel += amount;
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


function getName(name) {
    if (name === "") {
        return "unnamed friend";
    }
    return name;
}

function normal(x, y) {
    return Math.sqrt(x * x + y * y);
}


function onBoundary(coord) {
    return coord <= entityConfig.BORDER_WIDTH ||
        coord >= entityConfig.WIDTH - entityConfig.BORDER_WIDTH;
}

function overBoundary(coord) {
    return coord < entityConfig.BORDER_WIDTH - 1 ||
        coord > entityConfig.WIDTH - entityConfig.BORDER_WIDTH + 1;
}

module.exports = Player;
