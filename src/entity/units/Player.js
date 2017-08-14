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
    this.maxVel = 20;

    this.setMaxVelocities();

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

    this.theta = 0;

    this.resetLevels();

    this.init();
}

EntityFunctions.inherits(Player, Controller);


Player.prototype.populateAsteroidChain = function () {
    this.asteroidChainPos = new Queue();
    var theta = this.theta;
    var x, y;
    for (var i = 0; i < 10; i++) { //10 possible nodes in the queue
        x = this.x + 10 * i * Math.cos(theta);
        y = this.y + 10 * i * Math.sin(theta);
        this.asteroidChainPos.enqueue(
            {
                x: x,
                y: y
            });
    }
    this.updateQueuePositions();
};


Player.prototype.switch = function () {
    this.active = !this.active;
};


Player.prototype.addSlash = function (slashInfo) {
    this.slash = slashInfo;
    this.slashAsteroid();
};


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
};


Player.prototype.updateAsteroidFeed = function () {
    //add more asteroid glow if starting to be consumed
    var i, asteroid;

    for (i = 0; i < this.asteroids.length; i++) {
        asteroid = this.asteroids[i];
        asteroid.addFeed();
    }
};


Player.prototype.update = function () {
    Player.super_.prototype.update.apply(this);

    if (this.slashTimer > 0) {
        this.slashTimer -= 1;
    }

    if (this.gameServer.timeStamp % 50 === 0 && this.active) { //update slowly
        this.updateAsteroidFeed();
    }


    if (square(this.x - this.preX) + square(this.y - this.preY) > 1000) {
        this.updateAsteroidChain();
        this.preX = this.x;
        this.preY = this.y;
    }
};


Player.prototype.slashAsteroid = function () {
    var x = this.slash.x;
    var y = this.slash.y;
    var id = this.slash.slashId;
    var slashBound = {
        minx: x - 30,
        miny: y - 30,
        maxx: x + 30,
        maxy: y + 30
    };

    this.gameServer.asteroidTree.find(slashBound, function (asteroid) {
        if (asteroid.owner !== this && this.slashTimer <= 0) {
            asteroid.decreaseHealth(20);
            this.slashTimer = 5;
            this.packetHandler.addSlashAnimationPackets(this, x, y, id);
        }
    }.bind(this));
    this.slash = [];

};


Player.prototype.updateAsteroidChain = function () {
    this.asteroidChainPos.dequeue();
    this.asteroidChainPos.enqueue({
        x: this.x,
        y: this.y
    });
    this.updateQueuePositions();
};

Player.prototype.updateQueuePositions = function () {
    var asteroid;
    for (var i = 0; i < this.asteroids.length; i++) {
        asteroid = this.asteroids[i];
        asteroid.queuePosition = this.asteroidChainPos.peek(9 - i);
    }
};


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


Player.prototype.resetLevels = function () {
    this.level = 0;
    this.range = 500;
    this.radius = 10;
    this.maxVel = 10;
    this.maxGrabRadius = 50;
    this.power = 0; //power determines max size of things you can hold


    this.asteroidLength = 10;
    this.food = 0;
    this.maxFood = 2;
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
    var mouseBound = {
        minx: x - 40,
        miny: y - 40,
        maxx: x + 40,
        maxy: y + 40
    };


    if (this.asteroids.length < this.asteroidLength) {
        this.gameServer.asteroidTree.find(mouseBound, function (asteroid) {
            if (!asteroid.owner &&
                !asteroid.shooting &&
                asteroid.radius < this.maxGrabRadius) {
                this.asteroids.push(asteroid);
                asteroid.addOwner(this);
                this.populateAsteroidChain();
            }
        }.bind(this));
    }
};

Player.prototype.resetAsteroidQueues = function () {
    var asteroid;
    for (var i = 0; i < this.asteroids.length; i++) {
        asteroid = this.asteroids[i];
        asteroid.resetPathQueue();
    }
};

Player.prototype.moveAsteroids = function (x, y) {
    var asteroid;
    for (var i = 0; i < this.asteroids.length; i++) {
        asteroid = this.asteroids[i];
        asteroid.addPath(x, y);
    }
};

Player.prototype.shootAsteroid = function (x, y) {
    var asteroid = this.asteroids[0];

    if (!asteroid) return;

    this.removeAsteroid(asteroid);
    asteroid.addShooting(this, x, y);
};

Player.prototype.removeAsteroid = function (asteroid) {
    var index = this.asteroids.indexOf(asteroid);
    if (index !== -1) {
        this.asteroids.splice(index, 1);
        asteroid.removeOwner();
    }
    this.updateQueuePositions();
};

Player.prototype.consumeAsteroid = function (asteroid) {
    this.eat(asteroid.feed);

    this.removeAsteroid(asteroid);
    asteroid.onDelete();
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
    this.asteroidLength += 2;
    this.food = 0;
    this.maxFood++;

    console.log("LEVEL UP: " + this.radius);
};


Player.prototype.setMaxVelocities = function () {
    this.maxXVel = this.maxVel * Math.sin(Math.PI/4);
    this.maxYVel = this.maxVel * Math.cos(Math.PI/4);
};

Player.prototype.updateMaxVelocities = function (amount) {
    this.maxVel += amount;
    this.setMaxVelocities();
};


Player.prototype.removeAllAsteroids = function () {
    var i;
    for (i = this.asteroids.length - 1; i >= 0; i--) {
        this.removeAsteroid(this.asteroids[i]);
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


function getName(name) {
    if (name === "") {
        return "unnamed friend";
    }
    return name;
}

function square(x) {
    return x * x;
}

module.exports = Player;
