var B2 = require("../../modules/B2");
var B2Common = require("../../modules/B2Common");
var Arithmetic = require("../../modules/Arithmetic");
var EntityFunctions = require('../EntityFunctions');
var entityConfig = require('../entityConfig');
var RockHandler = require('./RockHandler');
var lerp = require('lerp');

function Rock(x, y, SCALE, gameServer, body, vertices, texture) {
    this.gameServer = gameServer;
    this.packetHandler = gameServer.packetHandler;

    this.handler = new RockHandler(this, this.gameServer);

    this.gameServer.rockCount += 1;
    this.id = Math.floor(Math.random() * 1000000);

    console.log("NEW ROCK: " + this.id);

    this.x = x;
    this.y = y;
    this.SCALE = SCALE;
    this.theta = getRandom(0, 3);

    this.texture = texture ? texture : this.getRandomTexture();
    this.getPower();
    this.setDefaultHealth();
    this.setNeutral(100);

    this.vertices = vertices;
    this.sides = Math.round(getRandom(4, 8));

    this.owner = null;
    this.body = body;
    this.feed = this.SCALE * 2;
    this.init();
}

Rock.prototype.init = function () {
    if (!this.body) {
        this.setB2();
    }
    this.setCentroid();

    this.chunk = EntityFunctions.findChunk(this.gameServer, this);

    if (this.chunk !== 0) {
        this.chunk = 0;
    }
    this.gameServer.CHUNKS[this.chunk].ROCK_LIST[this.id] = this;
    this.gameServer.ROCK_LIST[this.id] = this;
    this.packetHandler.b_addRockPackets(this);
};

Rock.prototype.setB2 = function () {
    var SCALE = this.SCALE;
    //this.body = B2Common.createBox(this.gameServer.box2d_world, this, this.x, this.y, 0.4, 0.4);
    var multiplier = function (x) {
        return x * SCALE;
    };

    if (!this.vertices) {
        //make default vertices
        var sides = this.sides;
        var vertices = [];

        var theta = 0;
        var delta = 2 * Math.PI / sides;
        for (var i = 0; i < sides; i++) {
            theta = i * delta + getRandom(-0.2, 0.2);
            var x = Math.cos(theta) * this.SCALE;
            var y = Math.sin(theta) * this.SCALE;

            vertices[i] = [x, y];
        }

        this.vertices = vertices;
    }


    this.body = B2Common.createRandomPolygon(this.gameServer.box2d_world, this, this.vertices, this.x, this.y, this.texture);
    this.body.SetAngle(this.theta);
    this.getRandomVelocity();
};

Rock.prototype.getRandomTexture = function () {
    var num = Arithmetic.getRandomInt(0, 10);
    if (num < 7) {
        return 1;
    }
    else if (num < 9) {
        return 2;
    }
    else {
        return 3;
    }
};


Rock.prototype.getPower = function () {
    switch (this.texture) {
        case 1:
            this.realPower = 1;
            break;
        case 2:
            this.realPower = 2;
            break;
        case 3:
            this.realPower = 3;
            break;
        case 4:
            this.realPower = 4;
            break;
    }
    this.power = this.realPower;
};

Rock.prototype.setDefaultHealth = function () {
    var magnitude = 0;
    switch (this.texture) {
        case 1:
            magnitude = 2;
            break;
        case 2:
            magnitude = 5;
            break;
        case 3:
            magnitude = 40;
            break;
        case 4:
            magnitude = 50;
            break;
    }

    this.maxHealth = 2 * 3 * (1 + magnitude);
    this.health = this.maxHealth;
};

Rock.prototype.setCentroid = function () {
    this.centroid = B2Common.findCentroid(this.vertices);
    this.centroidLength = normal(this.centroid[0], this.centroid[1]);
};


Rock.prototype.tick = function () {
    if (this.dead || overBoundary(this.body.GetPosition().x) || overBoundary(this.body.GetPosition().y)) {
        this.onDelete();
        return;
    }
    this.move();
    this.checkSpeed();

    if (this.health <= 0 && !this.splitting) {
        this.splitting = true;
        this.splitTimer = 1;
    } //check split
    if (this.splitting) {
        if (this.splitTimer > 0) {
            this.splitTimer -= 1;
        }
        else {
            this.split();
            return;
        }
    }

    if (this.startChange) {         //change back to default ownership
        this.startChange = false;
        this.changing = true;
        this.changeTimer = 20;
    } //change neutrality
    if (this.changing) {
        if (this.changeTimer > 0) {
            this.changeTimer -= 1;
        }
        else {
            this.removeNeutral();
        }
    }


    if (this.neutral) {
        this.neutralTimer -= 1;
        if (this.neutralTimer <= 0) {
            this.removeNeutral();
        }
    }


    this.packetHandler.b_updateRockPackets(this);
};


Rock.prototype.checkSpeed = function () {
    var v = this.body.GetLinearVelocity();
    var normalVel = normal(v.x, v.y);


    if (this.fast && normalVel < 10) {
        this.fast = false;
    }
    else if (!this.fast && normalVel > 10) {
        this.fast = true;
    }
};


Rock.prototype.move = function () {
    this.getOrigin();
    if (this.owner) {
        var playerPosition = this.owner.body.GetPosition();
        var v = this.body.GetLinearVelocity();
        this.getTheta(playerPosition, this.origin);


        if (inBounds(this.origin.x, playerPosition.x, 0.3) &&
            inBounds(this.origin.y, playerPosition.y, 0.3)) {
            //do nothing
        }
        else {
            v.x = 2 * (playerPosition.x - this.origin.x);
            v.y = 2 * (playerPosition.y - this.origin.y);
        }

        this.body.SetLinearVelocity(v);
    }
};


Rock.prototype.onDelete = function () {
    this.gameServer.rockCount -= 1;
    if (this.owner) {
        this.removeOwner();
    }
    this.gameServer.box2d_world.DestroyBody(this.body);

    this.packetHandler.b_deleteRockPackets(this);
    delete this.gameServer.CHUNKS[this.chunk].ROCK_LIST[this.id];
    delete this.gameServer.ROCK_LIST[this.id];
};


function inBounds(x1, x2, range) {
    return Math.abs(x1 - x2) < range;
}


Rock.prototype.addOwner = function (owner) {
    if (this.owner) {
        this.removeOwner();
    }
    this.owner = owner;
};

Rock.prototype.removeOwner = function () {
    if (!this.owner) {
        return;
    }
    this.owner.removeRock(this);
    this.owner = null;
};

Rock.prototype.getTheta = function (target, origin) {
    this.theta = Math.atan2(target.y - origin.y, target.x - origin.x) % (2 * Math.PI);
};

Rock.prototype.getRandomVelocity = function () {
    var v = this.body.GetLinearVelocity();
    v.Add(new B2.b2Vec2(getRandom(-0.4, 0.4), getRandom(-0.4, 0.4)));
    this.body.SetLinearVelocity(v);
    this.body.SetAngularVelocity(1);
};

Rock.prototype.decayVelocity = function () {
    var b = this.body;
    var v = b.GetLinearVelocity();

    v.x = lerp(v.x, 0, 0.2);
    v.y = lerp(v.y, 0, 0.2);


    //set the new velocity
    b.SetLinearVelocity(v);
};


Rock.prototype.decreaseHealth = function (entity, amount) {
    this.health -= amount * entity.power;
};


Rock.prototype.shoot = function (owner, targetX, targetY) {
    this.addShooting(owner, targetX, targetY);
};


Rock.prototype.addShooting = function (owner, targetX, targetY) {
    playerPosition = null;
    this.setNeutral(100);
    this.shootTimer = 60;

    var targetPt = {
        x: targetX,
        y: targetY
    };

    this.getOrigin();

    this.getTheta(targetPt, this.origin);

    var v = this.body.GetLinearVelocity();
    v.x = 20 * Math.cos(this.theta);
    v.y = 20 * Math.sin(this.theta);
    this.body.SetLinearVelocity(v);
};

Rock.prototype.getOrigin = function () {
    var x = this.body.GetPosition().x;
    var y = this.body.GetPosition().y;

    var angle = Math.atan2(this.centroid[1], this.centroid[0]) % (2 * Math.PI) + this.body.GetAngle();
    this.origin = {
        x: x + this.centroidLength * Math.cos(angle),
        y: y + this.centroidLength * Math.sin(angle)
    };
    return this.origin;
};


Rock.prototype.split = function () {
    if (this.SCALE < 0.1) {
        this.gameServer.box2d_world.DestroyBody(this.body);
        this.onDelete();
        return;
    }

    var poly = this.body.GetFixtureList().GetShape();
    var vertices = poly.GetVertices();
    var count = poly.GetVertexCount();


    var middleVertex = new B2.b2Vec2();
    var middle = Math.floor(count / 2);
    middleVertex.Set((vertices[middle - 1].x + vertices[middle].x) / 2 + getRandom(-0.2, 0.2), (vertices[middle - 1].y + vertices[middle].y) / 2 + getRandom(-0.2, 0.2));

    var lastVertex = new B2.b2Vec2();
    lastVertex.Set((vertices[count - 1].x + vertices[0].x) / 2, (vertices[count - 1].y + vertices[0].y) / 2);


    var vertices1 = [];
    var vertices2 = [];
    var i;


    vertices1.push([lastVertex.x, lastVertex.y]);
    for (i = 0; i < middle; i++) {
        vertices1.push([vertices[i].x, vertices[i].y]);
    }
    vertices1.push([middleVertex.x, middleVertex.y]);


    vertices2.push([middleVertex.x, middleVertex.y]);
    for (i = middle; i < count; i++) {
        vertices2.push([vertices[i].x, vertices[i].y]);
    }
    vertices2.push([lastVertex.x, lastVertex.y]);

    var x = Math.floor(this.body.GetPosition().x);
    var y = Math.floor(this.body.GetPosition().y);
    var bodies = B2Common.createPolygonSplit(this.gameServer.box2d_world, this.body, vertices1, vertices2);


    var clone1 = new Rock(x, y, this.SCALE / 2, this.gameServer, bodies[0], vertices1, this.texture);
    var clone2 = new Rock(x, y, this.SCALE / 2, this.gameServer, bodies[1], vertices2, this.texture);

    clone1.body.GetFixtureList().SetUserData(clone1);
    clone2.body.GetFixtureList().SetUserData(clone2);

    clone1.body.SetAngularVelocity(this.body.GetAngularVelocity());
    clone2.body.SetAngularVelocity(this.body.GetAngularVelocity());


    var theta = Math.atan2(this.body.GetLinearVelocity().y, this.body.GetLinearVelocity().x);
    var normalVel = normal(this.body.GetLinearVelocity().y, this.body.GetLinearVelocity().x);
    var v1 = clone1.body.GetLinearVelocity();
    var v2 = clone2.body.GetLinearVelocity();

    v1.x = normalVel * Math.cos(theta + 0.1);
    v1.y = normalVel * Math.sin(theta + 0.1);
    v2.x = normalVel * Math.cos(theta - 0.1);
    v2.y = normalVel * Math.sin(theta - 0.1);

    clone1.body.SetLinearVelocity(v1);
    clone2.body.SetLinearVelocity(v2);

    var dmg = 0 - this.health;
    clone1.decreaseHealth(this, dmg/2);
    clone2.decreaseHealth(this, dmg/2);

    this.onDelete();


};


Rock.prototype.setNeutral = function (time) { //not grabbable
    this.neutral = true;
    this.neutralTimer = time;
};

Rock.prototype.removeNeutral = function () {
    this.removeOwner();
    this.startChange = false;
    this.changing = false;

    this.neutral = false;
    this.neutralTimer = 0;
    this.justDefault = true;
};

function normal(x, y) {
    return Math.sqrt(x * x + y * y);
}

function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

function overBoundary(coord) {
    return coord < entityConfig.BORDER_WIDTH || coord > entityConfig.WIDTH - entityConfig.BORDER_WIDTH;
}

module.exports = Rock;
