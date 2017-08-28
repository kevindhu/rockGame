var B2 = require("../../modules/B2");
var B2Common = require("../../modules/B2Common");
var EntityFunctions = require('../EntityFunctions');
var entityConfig = require('../entityConfig');
var lerp = require('lerp');

function Rock(x, y, SCALE, gameServer, body, vertices) {
    this.gameServer = gameServer;
    this.packetHandler = gameServer.packetHandler;

    this.id = Math.random();
    this.x = x;
    this.y = y;
    this.SCALE = SCALE;
    this.theta = getRandom(0,3);
    this.health = SCALE * 10;

    this.vertices = vertices;

    this.queuePosition = null;
    this.owner = null;
    this.body = body;
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
    this.packetHandler.addRockPackets(this);
};

Rock.prototype.setB2 = function () {
    var SCALE = this.SCALE;
    //this.body = B2Common.createBox(this.gameServer.box2d_world, this, this.x, this.y, 0.4, 0.4);
    var multiplier = function (x) {
        return x * SCALE;
    };

    if (!this.vertices) {
        //make default vertices
        var vertices = [];
        vertices[0] = [0, 0].map(multiplier);
        vertices[1] = [1, 0].map(multiplier);
        vertices[2] = [1, 1].map(multiplier);
        vertices[3] = [0, 1].map(multiplier);

        this.vertices = vertices;
    }


    this.body = B2Common.createRandomPolygon(this.gameServer.box2d_world, this, this.vertices, this.x, this.y);
    this.body.SetAngle(this.theta);
    this.getRandomVelocity();
};

Rock.prototype.setCentroid = function () {
    this.centroid = B2Common.findCentroid(this.vertices);
    this.centroidLength = normal(this.centroid[0], this.centroid[1]);
};


Rock.prototype.tick = function () {
    if (overBoundary(this.body.GetPosition().x) || overBoundary(this.body.GetPosition().y)) {
        this.onDelete();
        return;
    }

    this.move();
    if (this.health <= 0) {
        this.split();
    }
    this.packetHandler.updateRockPackets(this);
};


Rock.prototype.move = function () {
    this.getOrigin();

    if (this.queuePosition && this.owner) {
        var v = this.body.GetLinearVelocity();
        this.getTheta(this.queuePosition, this.origin);

        if (this.owner.default) {
            if (inBounds(this.origin.x, this.queuePosition.x, 0.5) &&
                inBounds(this.origin.y, this.queuePosition.y, 0.5)) {
                //this.queuePosition = null;
            }
            else {
                v.x = 1.1 * (this.queuePosition.x - this.origin.x);
                v.y = 1.1 * (this.queuePosition.y - this.origin.y);
            }
        }
        else {
            if (inBounds(this.origin.x, this.queuePosition.x, 0.3) &&
                inBounds(this.origin.y, this.queuePosition.y, 0.3)) {
                //this.queuePosition = null;
            }
            else {
                v.x = 2 * (this.queuePosition.x - this.origin.x) + this.owner.xVel;
                v.y = 2 * (this.queuePosition.y - this.origin.y) + this.owner.yVel;
            }
        }
        this.body.SetLinearVelocity(v);
        this.decayVelocity();
    }
};


Rock.prototype.onDelete = function () {
    if (this.owner) {
        this.owner.removeRock(this);
        this.removeOwner();
    }
    this.gameServer.box2d_world.DestroyBody(this.body);

    this.packetHandler.deleteRockPackets(this);

    delete this.gameServer.CHUNKS[this.chunk].ROCK_LIST[this.id];
    delete this.gameServer.ROCK_LIST[this.id];
};


function inBounds(x1, x2, range) {
    return Math.abs(x1 - x2) < range;
}


Rock.prototype.addOwner = function (owner) {
    this.owner = owner;
};

Rock.prototype.removeOwner = function () {
    this.owner = null;
    this.queuePosition = null;
};

Rock.prototype.getTheta = function (target, origin) {
    this.theta = Math.atan2(target.y - origin.y, target.x - origin.x) % (2 * Math.PI);
};

Rock.prototype.getRandomVelocity = function () {
    var v = this.body.GetLinearVelocity();
    v.Add(new B2.b2Vec2(getRandom(-0.4, 0.4), getRandom(-0.4, 0.4)));
    this.body.SetLinearVelocity(v);
};

Rock.prototype.decayVelocity = function () {
    var b = this.body;
    var v = b.GetLinearVelocity();

    v.x = lerp(v.x, 0, 0.2);
    v.y = lerp(v.y, 0, 0.2);


    //set the new velocity
    b.SetLinearVelocity(v);
};


Rock.prototype.decreaseHealth = function (amount) {
    this.health -= amount;
};


Rock.prototype.shoot = function (owner, targetX, targetY) {
    this.addShooting(owner, targetX, targetY);
};


Rock.prototype.addShooting = function (owner, targetX, targetY) {
    this.queuePosition = null;
    this.shooting = true;
    this.tempNeutral = owner;
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
    if (this.SCALE < 0.2 || this.body.GetFixtureList().GetShape().GetVertexCount() <= 3) {
        this.gameServer.box2d_world.DestroyBody(this.body);
        this.onDelete();
        return;
    }

    var poly = this.body.GetFixtureList().GetShape();
    var vertices = poly.GetVertices();
    var count = poly.GetVertexCount();


    var middleVertex = new B2.b2Vec2();
    middleVertex.Set((vertices[count / 2 - 1].x + vertices[count / 2].x) / 2, (vertices[count / 2 - 1].y + vertices[count / 2].y) / 2);

    var lastVertex = new B2.b2Vec2();
    lastVertex.Set((vertices[count - 1].x + vertices[0].x) / 2, (vertices[count - 1].y + vertices[0].y) / 2);


    var vertices1 = [];
    var vertices2 = [];
    var i;


    vertices1.push([lastVertex.x, lastVertex.y]);
    for (i = 0; i < count / 2; i++) {
        vertices1.push([vertices[i].x, vertices[i].y]);
    }
    vertices1.push([middleVertex.x, middleVertex.y]);


    vertices2.push([middleVertex.x, middleVertex.y]);
    for (i = count / 2; i < count; i++) {
        vertices2.push([vertices[i].x, vertices[i].y]);
    }
    vertices2.push([lastVertex.x, lastVertex.y]);

    var x = Math.floor(this.body.GetPosition().x);
    var y = Math.floor(this.body.GetPosition().y);
    var bodies = B2Common.createPolygonSplit(this.gameServer.box2d_world, this.body, vertices1, vertices2);


    var clone1 = new Rock(x, y, this.SCALE / 2, this.gameServer, bodies[0], vertices1);
    var clone2 = new Rock(x, y, this.SCALE / 2, this.gameServer, bodies[1], vertices2);

    //clone1.owner = this.owner;
    //clone2.owner = this.owner;

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


    this.onDelete();


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
