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

    this.active = true;

    this.slash = [];
    this.slash.theta = null;
    this.slashTimer = 0;

    this.range = 500;

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
    this.updateQueuePositions();
}


Player.prototype.switch = function () {
    this.active = !this.active;
}


Player.prototype.addSlash = function (pos) {
    if (this.slash.length >= 1) {
        this.slash = [];
    }
    this.slash.push(pos);
}


Player.prototype.onDelete = function () {
    this.removeAllAsteroids();
    Player.super_.prototype.onDelete.apply(this);
};


Player.prototype.getTheta = function (pos1, pos2) {
    var newTheta = Math.atan((pos2.y - pos1.y) / (pos2.x - pos1.x));

    if (pos2.y - pos1.y > 0 && pos2.x - pos1.x > 0 || pos2.y - pos1.y < 0 && pos2.x - pos1.x > 0) {
        newTheta += Math.PI;
    }
    return newTheta % (2 * Math.PI);
}

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

    if (this.slashTimer > 0) {
        this.slashTimer -=1;
    }


    if (square(this.x - this.preX) + square(this.y - this.preY) > 1000) {
        this.updateAsteroidChain();
        this.preX = this.x;
        this.preY = this.y;
    }

    if (this.slash && this.slash.length > 0) {
        this.slashAsteroid();
    }
};




Player.prototype.slashAsteroid = function () {
    var x = this.slash[0].x;
    var y = this.slash[0].y;
    var slashBound = {
        minx: x - 30,
        miny: y - 30,
        maxx: x + 30,
        maxy: y + 30
    };

    this.gameServer.asteroidTree.find(slashBound, function (asteroid) {
        if (asteroid.owner !== this && this.slashTimer <= 0) {
            asteroid.decreaseHealth(5);
            this.slashTimer = 5;
            this.packetHandler.addSlashAnimationPackets(this, x, y)
        }
    }.bind(this));
    this.slash = [];
}



Player.prototype.updateAsteroidChain = function () {
    this.asteroidChainPos.dequeue();
    this.asteroidChainPos.enqueue({
        x: this.x,
        y: this.y
    });
    this.updateQueuePositions();
};

Player.prototype.updateQueuePositions =function () {
    var asteroid;
    for (var i = 0; i<this.asteroids.length; i++)  {
        asteroid = this.asteroids[i];
        asteroid.queuePosition = this.asteroidChainPos.peek(9 - i);
    }
}



Player.prototype.decreaseHealth = function (amount) {
    var filteredAmount;

    if (this.asteroids.length > 0) {
        filteredAmount = amount / this.asteroids.length;
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
        minx: x - 40,
        miny: y - 40,
        maxx: x + 40,
        maxy: y + 40
    };


    if (this.asteroids.length < 10) {
        this.gameServer.asteroidTree.find(mouseBound, function (asteroid) {
            if (asteroid.owner !== this && 
                !asteroid.shooting &&
                asteroid.radius < 30 &&
                this.asteroids.length < 10) {
                this.asteroids.push(asteroid);
                asteroid.qIndex = this.asteroids.length - 1;
                asteroid.addOwner(this);
                this.populateAsteroidChain();
            }
        }.bind(this));
    }
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



Player.prototype.shootAsteroid = function (x,y) {
    var asteroid = this.asteroids[0];

    if (!asteroid) return;

    this.removeAsteroid(asteroid);
    asteroid.addShooting(this, x,y);
};


Player.prototype.removeAsteroid = function (asteroid) {
    var index = this.asteroids.indexOf(asteroid);
    if (index !== -1) {
        this.asteroids.splice(index,1);
        asteroid.removeOwner();
    }
    this.updateQueuePositions();
};





Player.prototype.removeAllAsteroids = function () {
    var i, asteroid;
    for (i = this.asteroids.length - 1; i >= 0; i--) {
        this.removeAsteroid(this.asteroids[i]);
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
