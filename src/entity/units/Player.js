const entityConfig = require('../entityConfig');
const Arithmetic = require('../../modules/Arithmetic');
var EntityFunctions = require('../EntityFunctions');
var Controller = require('./Controller');
var lerp = require('lerp');

function Player(id, name, gameServer) {
    Player.super_.call(this, id, gameServer);
    this.name = getName(name);
    this.type = "Player";
    this.radius = 10;
    this.maxSpeed = 10;

    this.asteroids = {};
    this.heldAstroid = null;

    this.x = entityConfig.WIDTH / 2;
    this.y = entityConfig.WIDTH / 2;

    this.init();
}

EntityFunctions.inherits(Player, Controller);


Player.prototype.addView = function (home) {
    this.viewing = home.id;
};

Player.prototype.removeView = function () {
    this.viewing = null;
};

Player.prototype.onDelete = function () {
    this.dropAllAsteroids();
    var home = this.gameServer.HOME_LIST[this.viewing];
    if (home) {
        home.removeViewer(this);
    }
    Player.super_.prototype.onDelete.apply(this);
};


Player.prototype.createBoundary = function (boundary) {
    var playerBoundary = {};
    playerBoundary.minx = this.x + boundary.minX;
    playerBoundary.miny = this.y + boundary.minY;
    playerBoundary.maxx = this.x + boundary.maxX;
    playerBoundary.maxy = this.y + boundary.maxY;
    playerBoundary.player = this.id;
    return playerBoundary;
};

Player.prototype.update = function () {
    var tile = this.gameServer.getEntityTile(this);
    Player.super_.prototype.update.apply(this);
};


Player.prototype.updateMaxSpeed = function () { //resets to 10, change this
    this.maxXSpeed = this.maxSpeed;
    this.maxYSpeed = this.maxSpeed;
};



Player.prototype.decreaseHealth = function (amount) {
    if (this.shards.length > 0) {
        var filteredAmount = amount / this.shards.length;
    }
    else {
        filteredAmount = amount;
    }
    this.health -= filteredAmount;
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
    var delta = {};
    for (var id in chunks1) {
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
    var mouseBound = {
        minx: x - 20,
        miny: y - 20,
        maxx: x + 20,
        maxy: y + 20
    };


    this.gameServer.asteroidTree.find(mouseBound, function (asteroid) {
        this.asteroids[asteroid.id] = asteroid;
    }.bind(this))
};


Player.prototype.moveAsteroids = function (x,y) {
    var asteroid;
    for (var id in this.asteroids) {
        asteroid = this.asteroids[id];
        asteroid.teleport(x,y);
    }
}


Player.prototype.dropAsteroid = function (x,y) {
    var astroid = this.heldAstroid;
    astroid.teleport(x,y);
    this.heldAstroid = null;
};

Player.prototype.dropAllAsteroids = function () {
    for (var i = this.shards.length - 1; i >= 0; i--) {
        var shard = this.gameServer.PLAYER_SHARD_LIST[this.shards[i]];
        this.dropShard(shard);
    }
};

Player.prototype.onDeath = function () {
    this.reset();
};


Player.prototype.reset = function () { //should delete this eventually, x`or only use during debuggging
    this.x = entityConfig.WIDTH / 2;
    this.y = entityConfig.WIDTH / 2;

    this.maxSpeed = 10;
    this.xSpeed = 0;
    this.ySpeed = 0;
    this.health = 5;
    this.stationary = false;
    this.updateQuadItem();
};


function getName(name) {
    if (name === "") {
        return "unnamed friend";
    }
    return name;
}

Player.prototype.addHomePrompt = function () {
    this.homePrompt = true;
    this.packetHandler.addPromptMsgPackets(this, "press Space for Home Info");
};
Player.prototype.removeHomePrompt = function () {
    if (this.homePrompt) {
        this.packetHandler.deletePromptMsgPackets(this, "home prompt");
        this.homePrompt = false;
    }
};


Player.prototype.addSentinelPrompt = function () {
    this.sentinelPrompt = true;
    this.packetHandler.addPromptMsgPackets(this, "press N to place Barracks");
};
Player.prototype.removeSentinelPrompt = function () {
    if (this.sentinelPrompt) {
        this.sentinelPrompt = false;
        this.packetHandler.deletePromptMsgPackets(this, "sentinel prompt");
        this.packetHandler.deleteBracketPackets(this);
    }
};


module.exports = Player;
