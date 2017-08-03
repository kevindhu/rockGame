const entityConfig = require('../entityConfig');
var EntityFunctions = require('../EntityFunctions');
var Queue = require('../../modules/Queue');
var lerp = require('lerp');

function Asteroid(x, y, material, gameServer) {
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

    this.qIndex = -1;

    if (material) {
        this.setMaterial(material);
    }
    else {
        this.setMaterial(this.getRandomMaterial());
    }
    
    this.setRadius(getRandom(10, 200)); //change to entityConfig!!!

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
};


Asteroid.prototype.limbo = function () {
    this.removeOwner();

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
    var rand = getRandom(0,1);

    if (rand > 0.5) {
        return "sulfer";
    }
    else {
        return "copper";
    }

};



Asteroid.prototype.removeOwner = function () {
    this.owner = null;
    this.removePaths();
};


Asteroid.prototype.split = function () {
    var clone = new Asteroid (this.x, this.y, this.material, this.gameServer);

    this.setRadius(this.radius/2);
    clone.setRadius(this.radius + getRandom(-1,1));

    this.theta = getRandom(0, 2*Math.PI);
    clone.theta = -this.theta + getRandom(-1,1);

    this.xVel = 20 * Math.cos(this.theta);
    this.yVel = 20 * Math.sin(this.theta);

    clone.xVel = 20 * Math.cos(clone.theta);
    clone.yVel = 20 * Math.sin(clone.theta);
};


Asteroid.prototype.decreaseHealth = function (amount) {
    var filteredAmount = amount/this.materialQuality;
    this.health -= filteredAmount;
    if (this.health <= 0) {
        this.split();
    }
}

Asteroid.prototype.becomeStatic = function () {
    this.limbo();
    this.type = "static";
};

Asteroid.prototype.becomeShooting = function (xVel, yVel, temp) { //not updated yet
    this.limbo();
    this.type = "shooting";
    
    this.addVelocity(xVel, yVel);
};


Asteroid.prototype.becomePlayer = function (player) { //not updated yet
    this.limbo();
    this.type = "player";
    this.setOwner(player);
};



Asteroid.prototype.updatePosition = function () {
    if (this.radius < 5 || overBoundary(this.x) || overBoundary(this.y)) {
        this.onDelete();
    }


    if (this.timer > 0) {
        this.timer -= 1;
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

    this.weight = this.radius/(1.3 * this.materialQuality);
    this.maxVel = 400/this.weight;
    this.range = 10 * this.weight;

    this.maxHealth = this.radius;
    this.health = this.maxHealth;
}


Asteroid.prototype.shoot = function (x,y) {
    this.getTheta({
        x: x,
        y: y
    }, true);

    this.targetPt = {
        x:x,
        y:y
    };

    this.xVel = 80 * Math.cos(this.theta);
    this.yVel = 80 * Math.sin(this.theta);
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


Asteroid.prototype.getTheta = function (target, hard) {
    var newTheta = Math.atan((this.y - target.y) / (this.x - target.x));
    if (this.y - target.y > 0 && this.x - target.x > 0 || this.y - target.y < 0 && this.x - target.x > 0) {
        newTheta += Math.PI;
    }


    if (this.savedTheta && this.savedTheta - newTheta > 5) {
        newTheta += 2*Math.PI;
    }
    else if (this.savedTheta && newTheta - this.savedTheta > 5) {
        newTheta -= 2*Math.PI;
    }

    if (hard) {
        this.theta = newTheta;
    }
    else if (Math.round(newTheta - this.savedTheta) > 2.7) {
        this.theta = lerp(this.theta, newTheta, 0.9);
    }
    else {
        this.theta = lerp(this.theta, newTheta, 0.4);
    }

    this.savedTheta = newTheta;
};


Asteroid.prototype.resetPathQueue = function () {
    this.pathQueue = new Queue();
}

Asteroid.prototype.move = function () {
    while (this.pathQueue.length() > 10) {
        this.currPath = this.pathQueue.dequeue();
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
        this.xVel = lerp(this.xVel, this.maxVel * Math.cos(this.theta), 0.3);
        this.yVel = lerp(this.yVel, this.maxVel * Math.sin(this.theta), 0.3);
    }
    else if (this.owner && this.owner.active) {
        //move with speed of owner
        this.queuePosition = this.owner.asteroidChainPos.peek(9 - this.qIndex);
        this.getTheta(this.queuePosition);

        var totalPlayerVel = Math.sqrt(square(this.owner.xVel) + square(this.owner.yVel));

        this.xVel = lerp(this.xVel, this.owner.maxVel * 1.4 * Math.cos(this.theta), 0.3);
        this.yVel = lerp(this.yVel, this.owner.maxVel * 1.4 * Math.sin(this.theta), 0.3);
        this.findFriendlies();
    }


    if (this.xVel > -0.3 && this.xVel < 0.3) {
        this.x += this.xVel;
        this.y += this.yVel;
    }
    else {
        this.x += this.xVel;
        this.y += this.yVel;

        this.xVel = lerp(this.xVel, 0, 0.05);
        this.yVel = lerp(this.yVel, 0, 0.05);
    }


    this.gameServer.asteroidTree.remove(this.quadItem);
    this.gameServer.asteroidTree.insert(this.quadItem);
};


Asteroid.prototype.findFriendlies = function () {
    this.gameServer.asteroidTree.find(this.quadItem.bound, function (asteroid) {
        if (asteroid.id !== this.id && this.xVel < 5 && this.yVel < 5) {
            this.ricochet(asteroid);
        }
    }.bind(this))

};


Asteroid.prototype.ricochet = function (asteroid) {
    var xAdd = Math.abs(asteroid.x - this.x) / 20;
    var yAdd = Math.abs(asteroid.y - this.y) / 20;
    var xImpulse = (20 - xAdd)/10;
    var yImpulse = (20 - yAdd)/10;


    this.xVel += (asteroid.x > this.x) ? -xImpulse: xImpulse;
    this.yVel += (asteroid.y > this.y) ? -yImpulse: yImpulse;
};




Asteroid.prototype.addPath = function (x,y) {
    this.pathQueue.enqueue({
        x: x,
        y: y
    });
     
    if (!this.currPath) {
        this.currPath = this.pathQueue.dequeue();
    }
}

Asteroid.prototype.removePaths = function () {
    this.pathQueue = new Queue();
}

Asteroid.prototype.addOwner = function (player) {
    this.owner = player;
}

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
};


function inBounds(x1, x2, range) {
    return Math.abs(x1-x2) < range;
}


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

function square(x) {
    return x*x;
}

module.exports = Asteroid;