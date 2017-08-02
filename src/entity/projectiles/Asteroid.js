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

    this.radius = 10; //change to entityConfig!!!

    this.weight = getRandom(5, 10);

    this.maxVel = 400/this.weight;

    this.currPath = null;
    this.pathQueue = new Queue();
    this.queueTimer = 0;


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

    this.move();

    //this.updateChunk();
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


Asteroid.prototype.getTheta = function (target) {
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

    console.log(newTheta, this.savedTheta);

    this.savedTheta = newTheta;




    this.theta = lerp(this.theta, newTheta, 0.4);
};


Asteroid.prototype.resetPathQueue = function () {
    this.pathQueue = new Queue();
}

Asteroid.prototype.move = function () {
    if (this.xVel > -0.1 && this.xVel < 0.1) {
        this.xVel = 0;
        this.yVel = 0;
    }

    while (this.pathQueue.length() > 5) {
        this.currPath = this.pathQueue.dequeue();
    }



    if (this.currPath) {
        if (inBounds(this.currPath.x, this.x) && 
            inBounds(this.currPath.y, this.y)) {
            this.currPath = this.pathQueue.dequeue();
            if (!this.currPath) {
                return;
            }
        }
        this.getTheta(this.currPath);
        this.xVel = this.maxVel * Math.cos(this.theta);
        this.yVel = this.maxVel * Math.sin(this.theta);
    }

    else if (this.owner && 1===2) {
        this.getTheta(this.owner);
        this.xVel = this.maxVel * Math.cos(this.theta);
        this.yVel = this.maxVel * Math.sin(this.theta);
    }


    this.findFriendlies();

    this.xVel = lerp(this.xVel, 0, 0.3);
    this.yVel = lerp(this.yVel, 0, 0.3);

    this.x += this.xVel;
    this.y += this.yVel;


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




Asteroid.prototype.teleport = function (x,y) {
    if (this.queueTimer === 0) { 
        this.pathQueue.enqueue({
            x: x,
            y: y
        });
        this.queueTimer = 30;

        if (!this.currPath) {
            this.currPath = this.pathQueue.dequeue();
        }

    }
    else {
        this.queueTimer -= 1;
    }
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

function onBoundary(coord) {
    return coord <= entityConfig.BORDER_WIDTH || coord >= entityConfig.WIDTH - entityConfig.BORDER_WIDTH;
};


function inBounds(x1, x2) {
    return Math.abs(x1-x2) < 50;
}


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}



function Queue(){
    var a=[],b=0;
    this.getLength=function(){
        return a.length-b
    };

    this.isEmpty=function(){
        return 0==a.length
    };

    this.enqueue=function(b){
        a.push(b)
    };

    
    this.dequeue=function(){
        if(0!=a.length){
            var c=a[b];
            2*++b>=a.length&&(a=a.slice(b),b=0);
            return c
        }
    };
    
    this.peek=function(){
        return 0<a.length?a[b]:void 0
    }

    this.length = function () {
        return a.length;
    }
};
module.exports = Asteroid;