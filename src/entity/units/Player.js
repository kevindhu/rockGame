const entityConfig = require('../entityConfig');
var EntityFunctions = require('../EntityFunctions');
var Controller = require('./Controller');
var Queue = require('../../modules/Queue');
var lerp = require('lerp');

function Player(id, name, gameServer) {
    Player.super_.call(this, id, gameServer);
    this.name = getName(name);
    this.type = "Player";
    this.radius = 10;
    this.maxVel = 10;

    this.asteroids = [];
    this.asteroidChainPos = new Queue(); //maximum length of 10

    this.x = entityConfig.WIDTH / 2;
    this.y = entityConfig.WIDTH / 2;

    this.preX = this.x;
    this.preY = this.y;

    this.theta = 0;
    this.init();
}

EntityFunctions.inherits(Player, Controller);



Player.prototype.populateAsteroidChain = function () {
    this.asteroidChainPos = new Queue();
    var theta = this.theta;
    var x,y;
    for (var i = 0; i< 10; i++) { //10 possible nodes in the queue
        x = this.x + 10 * i * Math.cos(theta);
        y = this.y + 10 * i * Math.sin(theta);
        this.asteroidChainPos.enqueue(
            {
                x: x,
                y: y
            });
    }
}


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
    Player.super_.prototype.update.apply(this);

    if (square(this.x - this.preX) + square(this.y - this.preY) > 1000) {
        this.updateChainPositions();
        this.preX = this.x;
        this.preY = this.y;
    }
};


Player.prototype.updateChainPositions = function () {
    console.log(this.asteroidChainPos.length());
    this.asteroidChainPos.dequeue();
    console.log(this.asteroidChainPos.length());
    this.asteroidChainPos.enqueue({
        x: this.x,
        y: this.y
    });

    console.log("PEEKING");
    console.log(this.asteroidChainPos.peek(9));

}



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


    if (this.asteroids.length < 10) {
        this.gameServer.asteroidTree.find(mouseBound, function (asteroid) {
            if (!this.hasAsteroid(asteroid)) {
                this.asteroids.push(asteroid);
                asteroid.qIndex = this.asteroids.length - 1;
                asteroid.addOwner(this);
                this.populateAsteroidChain();
            }
        }.bind(this));
    }
};


Player.prototype.hasAsteroid = function (asteroid) {
    for (var i = 0; i<this.asteroids.length; i++) {
        if (asteroid === this.asteroids[i]) {
            return true;
        }
    }
    return false;
};






Player.prototype.resetAsteroidQueues = function () {
    var asteroid;
    for (var i = 0; i<this.asteroids.length; i++) {
        asteroid = this.asteroids[i];
        asteroid.resetPathQueue();
    }
};


Player.prototype.moveAsteroids = function (x,y) {
    var asteroid;
    for (var i = 0; i<this.asteroids.length; i++) {
        asteroid = this.asteroids[i];
        asteroid.addPath(x,y);
    }
};


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


Player.prototype.reset = function () { //should delete this eventually, or only use during debugging
    this.x = entityConfig.WIDTH / 2;
    this.y = entityConfig.WIDTH / 2;

    this.maxVel = 10;
    this.xVel = 0;
    this.yVel = 0;
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


function square(x) {
    return x*x;
}

module.exports = Player;
