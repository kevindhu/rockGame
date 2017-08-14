const entityConfig = require('../entityConfig');
var EntityFunctions = require('../EntityFunctions');
var Queue = require('../../modules/Queue');
var AsteroidHandler = require('./AsteroidHandler');
var lerp = require('lerp');

function Asteroid(x, y, material, radius, gameServer) {
    this.gameServer = gameServer;
    this.packetHandler = gameServer.packetHandler;

    this.handler = new AsteroidHandler(this, gameServer);

    this.id = Math.random();
    this.x = x;
    this.y = y;

    this.owner = null;

    this.xVel = getRandom(-10, 3);
    this.yVel = getRandom(-3, 3);

    this.value = 0;
    this.timer = 0;
    this.ricochetTimer = 0;

    this.theta = getRandom(0, 2);
    this.displayTheta = 0;
    this.displayThetaVel = 0;

    this.fast = false;


    if (material) {
        this.setMaterial(material);
    }
    else {
        this.setMaterial(this.getRandomMaterial());
    }

    if (radius) {
        this.setRadius(radius);
    }
    else {
        this.setRadius(getRandom(15, 200)); //change to entityConfig!!!
    }

    this.getRandomThetas();

    this.currPath = null;
    this.pathQueue = new Queue();

    this.init();
}


Asteroid.prototype.init = function () {
    this.addQuadItem();
    this.gameServer.asteroidTree.insert(this.quadItem);
    this.chunk = EntityFunctions.findChunk(this.gameServer, this);
    this.gameServer.CHUNKS[this.chunk].ASTEROID_LIST[this.id] = this;
    this.gameServer.ASTEROID_LIST[this.id] = this;
    this.packetHandler.addAsteroidPackets(this);
    this.packetHandler._addAsteroidPackets(this);
};


Asteroid.prototype.limbo = function () {
    if (this.owner) {
        this.owner.removeAsteroid(this);
    }

    this.gameServer.asteroidTree.remove(this.quadItem);

    delete this.gameServer.CHUNKS[this.chunk].ASTEROID_LIST[this.id];
    delete this.gameServer.ASTEROID_LIST[this.id];
};


Asteroid.prototype.setMaterial = function (material) {
    switch (material) {
        case "sulfer":
            this.material = "sulfer";
            this.materialQuality = 1;
            break;
        case "copper":
            this.material = "copper";
            this.materialQuality = 2;
            break;
    }
};

Asteroid.prototype.getRandomMaterial = function () {
    var rand = getRandom(0, 1);

    if (rand > 0.5) {
        return "sulfer";
    }
    else {
        return "copper";
    }
};

Asteroid.prototype.getRandomThetas = function () {
    var thetas = [];
    var angles = Math.round(getRandom(5, 9));
    var average = 2 * Math.PI / angles;

    var theta = 0;
    for (var i = 0; i < angles - 1; i++) {
        theta += average + getRandom(-0.4, 0.4);
        thetas[i] = theta;
    }
    this.thetas = thetas;
};


Asteroid.prototype.removeOwner = function () {
    this.owner = null;
    this.resetFeed();
    this.removePaths();
    this.removeGlowing();
};


Asteroid.prototype.split = function () {
    if (this.radius / 2 < 10) {
        this.onDelete();
        return;
    }
    var clone = new Asteroid(this.x, this.y, this.material, this.radius / 2 + getRandom(-1, 1), this.gameServer);

    this.setRadius(this.radius / 2);


    this.theta = getRandom(0, 2 * Math.PI);
    clone.theta = -this.theta + getRandom(-1, 1);

    this.splitting = true;
    clone.splitting = true;

    //this.xVel = 20 * Math.cos(this.theta);
    //this.yVel = 20 * Math.sin(this.theta);

    //clone.xVel = 20 * Math.cos(clone.theta);
    //clone.yVel = 20 * Math.sin(clone.theta);
};


Asteroid.prototype.decreaseHealth = function (amount) {
    var filteredAmount = amount / this.materialQuality;
    this.health -= filteredAmount;
    if (this.health <= 0) {
        this.split();
    }
};


Asteroid.prototype.update = function () {
    if (overBoundary(this.x) || overBoundary(this.y)) {
        this.onDelete();
    }

    if (this.timer > 0) { //what is the use of this?
        this.timer -= 1;
    }

    if (this.ricochetTimer > 0) {
        this.ricochetTimer -= 1;
    }

    this.move();
    //this.updateChunk(); //cant use this when they are out of bounds!!!
    this.updateQuadItem();
    this.packetHandler.updateAsteroidsPackets(this);
};


Asteroid.prototype.updateChunk = function () {
    var newChunk = EntityFunctions.findChunk(this.gameServer, this);
    if (newChunk !== this.chunk) {
        //delete old chunk asteroid
        delete this.gameServer.CHUNKS[this.chunk].ASTEROID_LIST[this.id];

        this.chunk = newChunk;
        console.log("NEW CHUNK: " + newChunk);
        this.gameServer.CHUNKS[this.chunk].ASTEROID_LIST[this.id] = this;
    }
};


Asteroid.prototype.setRadius = function (radius) {
    this.radius = radius;
    this.mass = this.materialQuality * this.radius / 1.3;
    this.maxVel = 400 / this.mass;
    this.range = 100;

    this.maxHealth = this.radius;
    this.health = this.maxHealth;

    this.maxFeed = this.radius;
    this.resetFeed();
};


Asteroid.prototype.addShooting = function (owner, x, y) {
    this.shooting = true;
    this.shooter = owner;
    this.tempNeutral = owner;
    this.shootTimer = 60;

    this.getTheta({
        x: x,
        y: y
    }, true);

    this.targetPt = {
        x: x,
        y: y
    };

    this.xVel = 60 * Math.cos(this.theta);
    this.yVel = 60 * Math.sin(this.theta);
};


Asteroid.prototype.removeShooting = function () {
    this.shooting = false;
    this.shooter = null;
};

Asteroid.prototype.follow = function (owner) {
    this.x = owner.x;
    this.y = owner.y;
};

Asteroid.prototype.addVelocity = function (x, y) {
    this.xVel = x;
    this.yVel = y;

    this.xSwitched = false;
    this.ySwitched = false;
};


Asteroid.prototype.onDelete = function () {
    this.limbo();
    //this.packetHandler.addAsteroidAnimationPackets(this, "asteroidDeath");
    this.packetHandler.deleteAsteroidPackets(this);
};


Asteroid.prototype.getTheta = function (target, hard) {
    var newTheta = Math.atan2(target.y - this.y, target.x - this.x) % (2 * Math.PI);

    if (hard) {
        this.theta = newTheta;
    }
    else if (Math.abs(newTheta - this.savedTheta) > 2.7) {
        this.theta = lerp(this.theta, newTheta, 0.9);
    }
    else {
        this.theta = lerp(this.theta, newTheta, 0.4);
    }

    this.savedTheta = newTheta;
};


Asteroid.prototype.resetPathQueue = function () {
    this.pathQueue = new Queue();
};

Asteroid.prototype.move = function () {
    while (this.pathQueue.length() > 10) {
        this.currPath = this.pathQueue.dequeue();
    }

    if (this.owner) {
        if (this.owner.active) {
            if (this.currPath) {
                this.currPath = null;
                this.pathQueue = new Queue();
            }

            //move with speed of owner
            this.getTheta(this.queuePosition);

            if (inBounds(this.x, this.queuePosition.x, 30) &&
                inBounds(this.y, this.queuePosition.y, 30)) {
                this.xVel = lerp(this.xVel, 0, 0.2);
                this.yVel = lerp(this.yVel, 0, 0.2);
            }
            else {
                //var totalPlayerVel = Math.sqrt(square(this.owner.xVel) + square(this.owner.yVel));
                this.xVel = lerp(this.xVel, this.owner.maxVel * 2 * Math.cos(this.theta), 0.2);
                this.yVel = lerp(this.yVel, this.owner.maxVel * 2 * Math.sin(this.theta), 0.2);
            }
        }
        else if (square(this.x - this.owner.x) + square(this.y - this.owner.y) > square(this.owner.range + 400)) {
            this.owner.active = true;
            return;
        }
    }
    if (this.currPath) {
        if (inBounds(this.currPath.x, this.x, this.range) &&
            inBounds(this.currPath.y, this.y, this.range)) {
            this.currPath = this.pathQueue.dequeue();
            if (!this.currPath) {
                return;
            }
        }
        this.getTheta(this.currPath);
        if (this.owner) {
            this.xVel = lerp(this.xVel, 3 * this.owner.maxVel * (1 - (this.mass / 100)) * Math.cos(this.theta), 0.3);
            this.yVel = lerp(this.yVel, 3 * this.owner.maxVel * (1 - (this.mass / 100)) * Math.sin(this.theta), 0.3);
        }
        //this.xVel = lerp(this.xVel, this.maxVel * Math.cos(this.theta), 0.02);
        //this.yVel = lerp(this.yVel, this.maxVel * Math.sin(this.theta), 0.02);
    }

    this.findAsteroids();

    if (this.shooting) {
        this.shootTimer -= 1;
        this.xVel = lerp(this.xVel, 0, 0.01);
        this.xVel = lerp(this.xVel, 0, 0.01);

        if (this.shootTimer <= 0) {
            this.removeShooting();
        }
    }

    else if (Math.abs(this.xVel) > 0.01 && Math.abs(this.yVel) > 0.01) { //decay movement velocity
        this.xVel = lerp(this.xVel, 0, 0.02);
        this.yVel = lerp(this.yVel, 0, 0.02);
    }


    if (Math.abs(this.displayThetaVel) > 0.005) { //decay theta velocity
        this.displayThetaVel = lerp(this.displayThetaVel, 0, 0.1);
    }


    if (!this.owner) {
        this.fast = normal(this.xVel, this.yVel) > 20;
    }


    this.x += this.xVel;
    this.y += this.yVel;
    this.displayTheta += this.displayThetaVel;


    this.gameServer.asteroidTree.remove(this.quadItem);
    this.gameServer.asteroidTree.insert(this.quadItem);

    //console.log(this.theta);
};


Asteroid.prototype.findAsteroids = function () {
    this.gameServer.asteroidTree.find(this.quadItem.bound, function (asteroid) {
        if (asteroid.id !== this.id && //find other asteroids!
            Math.abs(this.xVel) > 0 &&
            Math.abs(this.yVel) > 0) {

            if (this.owner) { //check if asteroid belongs to same owner
                if (this.owner === asteroid.owner) {
                    return;
                }
            }

            //check if temporarily neutral to shooter
            if (this.tempNeutral && this.tempNeutral === asteroid.owner ||
                asteroid.tempNeutral && asteroid.tempNeutral === this.owner) {
                return;
            }


            asteroid.tempNeutral = false;
            this.tempNeutral = false;

            var v1 = normal(this.xVel, this.yVel);
            var v2 = normal(asteroid.xVel, asteroid.yVel);

            if (this.splitting && asteroid.splitting || v1 + v2 < 10) {
                this.moveOut(asteroid);
            } else if (this.ricochetTimer <= 0) {
                this.splitting = false;
                this.ricochet(asteroid);
                this.shooting = false;
                asteroid.shooting = false;
            }

        }
    }.bind(this))

};

Asteroid.prototype.moveOut = function (asteroid) {
    if (Math.abs(asteroid.y - this.y) < 0.01) {
        if (asteroid.y - this.y > 0) {
            asteroid.y += 0.1;
        }
        else {
            asteroid.y -= 0.1;
        }
    }
    if (Math.abs(asteroid.x - this.x) < 0.01) {
        if (asteroid.x - this.x > 0) {
            asteroid.x += 0.1;
        }
        else {
            asteroid.x -= 0.1;
        }
    }

    var xDelta = Math.abs(this.x - asteroid.x);
    var yDelta = Math.abs(this.y - asteroid.y);
    var maxDist = (this.radius + asteroid.radius);

    var xSpeed = (maxDist - xDelta) / (10 * this.mass); //always positive
    var ySpeed = (maxDist - yDelta) / (10 * this.mass);

    var thisXVel = 0;
    var thisYVel = 0;

    if (this.x > asteroid.x) {
        thisXVel = xSpeed;
    }
    else {
        thisXVel = -xSpeed;
    }

    if (this.y > asteroid.y) {
        thisYVel = ySpeed;
    }
    else {
        thisYVel = -ySpeed;
    }

    this.xVel += thisXVel;
    this.yVel += thisYVel;

    asteroid.xVel -= thisXVel;
    asteroid.yVel -= thisYVel;

    var delta = 0.005;
    this.displayThetaVel += getRandom(-delta, delta);
    asteroid.displayThetaVel += getRandom(-delta, delta);

};


Asteroid.prototype.ricochet = function (asteroid) {
    var preXVel = this.xVel;
    var preYVel = this.yVel;

    var phi = Math.atan2(asteroid.y - this.y, asteroid.x - this.x);
    var phi2 = Math.atan2(this.y - asteroid.y, this.x - asteroid.x);


    var v1 = normal(this.xVel, this.yVel);
    var v2 = normal(asteroid.xVel, asteroid.yVel);

    var m1 = this.mass;
    var m2 = asteroid.mass;

    var theta1 = this.theta;
    var theta2 = asteroid.theta;


    this.xVel = (v1 * Math.cos(theta1 - phi) * (m1 - m2) + 2 * m2 * v2 * Math.cos(theta2 - phi))
        / (m1 + m2) * Math.cos(phi) + v1 * Math.sin(theta1 - phi) * Math.cos(phi + Math.PI / 2);

    this.yVel = (v1 * Math.cos(theta1 - phi) * (m1 - m2) + 2 * m2 * v2 * Math.cos(theta2 - phi))
        / (m1 + m2) * Math.sin(phi) + v1 * Math.sin(theta1 - phi) * Math.sin(phi + Math.PI / 2);

    asteroid.xVel = (v2 * Math.cos(theta2 - phi2) * (m2 - m1) + 2 * m1 * v1 * Math.cos(theta1 - phi2))
        / (m1 + m2) * Math.cos(phi2) + v2 * Math.sin(theta2 - phi2) * Math.cos(phi2 + Math.PI / 2);

    asteroid.yVel = (v2 * Math.cos(theta2 - phi) * (m1 - m2) + 2 * m1 * v1 * Math.cos(theta1 - phi))
        / (m1 + m2) * Math.sin(phi2) + v1 * Math.sin(theta2 - phi2) * Math.sin(phi2 + Math.PI / 2);


    this.theta = Math.atan2(this.yVel, this.xVel);
    asteroid.theta = Math.atan2(asteroid.yVel, asteroid.xVel);


    var delta = Math.sqrt(square(this.xVel - preXVel) + square(this.yVel - preYVel)) / this.mass;
    this.displayThetaVel = getRandom(-delta, delta);


    if (5 * delta > 1) { //filter for low dmg
        this.decreaseHealth(5 * delta);
        asteroid.decreaseHealth(5 * delta);
    } //damage asteroids


    this.ricochetTimer = 20;
    asteroid.ricochetTimer = 20;
};


Asteroid.prototype.addFeed = function () {
    if (!this.glowing && this.owner && this.feed >= this.maxFeed) {
        this.becomeGlowing();
    }
    else {
        this.feed += 5;
    }
};

Asteroid.prototype.becomeGlowing = function () {
    this.glowing = true;
};

Asteroid.prototype.removeGlowing = function () {
    this.glowing = false;
};


Asteroid.prototype.resetFeed = function () {
    this.feed = 0;
};


Asteroid.prototype.addPath = function (x, y) {
    this.pathQueue.enqueue({
        x: x,
        y: y
    });

    if (!this.currPath) {
        this.currPath = this.pathQueue.dequeue();
    }
};

Asteroid.prototype.removePaths = function () {
    this.pathQueue = new Queue();
};

Asteroid.prototype.addOwner = function (player) {
    this.owner = player;
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

function overBoundary(coord) {
    return coord < entityConfig.BORDER_WIDTH || coord > entityConfig.WIDTH - entityConfig.BORDER_WIDTH;
}


function inBounds(x1, x2, range) {
    return Math.abs(x1 - x2) < range;
}


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

function square(x) {
    return x * x;
}


function normal(a, b) {
    return Math.sqrt(square(a) + square(b));
}
module.exports = Asteroid;