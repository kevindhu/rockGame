const entityConfig = require('../entityConfig');
var EntityFunctions = require('../EntityFunctions');
var lerp = require('lerp');

function Asteroid(x, y, gameServer) {
    this.gameServer = gameServer;
    this.packetHandler = gameServer.packetHandler;

    this.id = Math.random();

    this.x = x;
    this.y = y;


    this.type = "static";
    this.supply = 5;
    this.owner = null;

    this.xVel = 0;
    this.yVel = 0;

    this.value = 0;
    this.timer = 0;
    this.theta = 0;

    this.radius = 40; //change to entityConfig!!!


    this.init();
}


Asteroid.prototype.init = function () {
    this.addQuadItem();
    this.gameServer.asteroidTree.insert(this.quadItem);
    this.chunk = EntityFunctions.findChunk(this.gameServer, this);
    this.gameServer.CHUNKS[this.chunk].ASTEROID_LIST[this.id] = this;
    this.gameServer.ASTEROID_LIST[this.id] = this;
    this.packetHandler.addAsteroidPackets(this);
};


Asteroid.prototype.limbo = function () {
    this.removeOwner();

    delete this.gameServer.CHUNKS[this.chunk].ASTEROID_LIST[this.id];
    delete this.gameServer.ASTEROID_LIST[this.id];
};



Asteroid.prototype.setOwner = function (owner) {
    var faction = this.gameServer.FACTION_LIST[owner.faction];
    this.owner = owner.id;
    this.setFaction(faction);
};


Asteroid.prototype.removeOwner = function () {
    this.owner = null;
    this.faction = null;
};



Asteroid.prototype.becomeStatic = function () {
    this.limbo();
    this.type = "static";
};

Asteroid.prototype.becomeShooting = function (xVel, yVel, temp) {
    this.limbo();
    this.type = "shooting";
    
    this.addVelocity(xVel, yVel);
};


Asteroid.prototype.becomePlayer = function (player) {
    this.limbo();
    this.type = "player";
    this.setOwner(player);
};



Asteroid.prototype.updatePosition = function () {
    if (this.timer > 0) {
        this.timer -= 1;
    }
    this.updateChunk();
    this.updateQuadItem();

    switch (this.type) {
        case "shooting":
            this.move();
            break;
        case "player":
            var player = this.gameServer.CONTROLLER_LIST[this.owner];
            this.follow(player);
            break;
    }
    this.packetHandler.updateAsteroidsPackets(this);
};



Asteroid.prototype.updateChunk = function () {
    var newChunk = EntityFunctions.findChunk(this.gameServer, this);
    if (newChunk !== this.chunk) {
        //delete old chunk asteroid
        delete this.gameServer.CHUNKS[this.chunk].ASTEROID_LIST[this.id];

        this.chunk = newChunk;
        this.gameServer.CHUNKS[this.chunk].ASTEROID_LIST[this.id] = this;
    }
};




Asteroid.prototype.follow = function (owner) {
    this.x = owner.x;//+ Arithmetic.getRandomInt(-5, 5);
    this.y = owner.y;//+ Arithmetic.getRandomInt(-5, 5);
};

Asteroid.prototype.addVelocity = function (x, y) {
    this.xVel = x;
    this.yVel = y;

    this.xSwitched = false;
    this.ySwitched = false;
};


Asteroid.prototype.onDelete = function () {
    this.limbo();
    this.packetHandler.addAsteroidAnimationPackets(this, "asteroidDeath");
    this.packetHandler.deleteAsteroidPackets(this);
};

Asteroid.prototype.move = function () {
    if (this.xVel > -0.1 && this.xVel < 0.1) {
        this.xVel = 0;
        this.yVel = 0;
    }

    if (onBoundary(this.x) && !this.xSwitched) {
        this.xVel = -this.xVel;
        this.xSwitched = true;
    }
    if (onBoundary(this.y) && !this.ySwitched) {
        this.yVel = -this.yVel;
        this.ySwitched = true;
    }

    this.x += this.xVel;
    this.y += this.yVel;

    this.xVel = lerp(this.xVel, 0, 0.2);
    this.yVel = lerp(this.yVel, 0, 0.2);

    this.gameServer.asteroidTree.remove(this.quadItem);
    this.gameServer.asteroidTree.insert(this.quadItem);
};

Asteroid.prototype.addQuadItem = function () {
    this.quadItem = {
        cell: this,
        bound: {
            minx: this.x - this.radius,
            miny: this.y - this.radius,
            maxx: this.x + this.radius,
            maxy: this.y + this.radius
        }
    };
};

Asteroid.prototype.updateQuadItem = function () {
    this.quadItem.bound = {
        minx: this.x - this.radius,
        miny: this.y - this.radius,
        maxx: this.x + this.radius,
        maxy: this.y + this.radius
    };

    this.gameServer.asteroidTree.remove(this.quadItem);
    this.gameServer.asteroidTree.insert(this.quadItem);
};

function onBoundary(coord) {
    return coord <= entityConfig.BORDER_WIDTH || coord >= entityConfig.WIDTH - entityConfig.BORDER_WIDTH;
};


module.exports = Asteroid;