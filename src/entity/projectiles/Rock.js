var B2 = require("../../modules/B2");
var B2Common = require("../../modules/B2Common");
var Arithmetic = require("../../modules/Arithmetic");
var EntityFunctions = require('../EntityFunctions');
var entityConfig = require('../entityConfig');
var RockHandler = require('./RockHandler');
var lerp = require('lerp');

function Rock(x, y, SCALE, gameServer, body, vertices, texture, theta) {
    this.gameServer = gameServer;
    this.packetHandler = gameServer.packetHandler;

    this.handler = new RockHandler(this, this.gameServer);

    this.gameServer.rockCount += 1;
    this.id = Math.abs(Math.floor(Math.random() * 10000000));

    this.x = x;
    this.y = y;
    this.SCALE = SCALE;
    this.theta = theta ? theta : getRandom(0, 3);
    this.vertices = vertices;
    this.sides = Math.floor(getRandom(4, 8));
    this.texture = texture ? texture : this.getRandomTexture();

    this.owner = null;
    this.body = body;

    this.init();
}

Rock.prototype.init = function () {
    this.setVertices();
    this.setCentroid();
    this.calculateArea();
    this.setLifeTimer();

    this.getFeed();
    this.getPower();
    this.setDefaultHealth();
    this.setNeutral(100);

    if (!this.body) {
        this.setB2();
        this.updateBody();
    }

    this.chunk = EntityFunctions.findChunk(this.gameServer, this);

    this.gameServer.CHUNKS[this.chunk].ROCK_LIST[this.id] = this;
    this.gameServer.ROCK_LIST[this.id] = this;
    this.packetHandler.b_addRockPackets(this);
};

Rock.prototype.setB2 = function () {
    this.body = B2Common.createRandomPolygon(this.gameServer.box2d_world, this, this.vertices, this.x, this.y, this.texture);
    this.body.SetAngle(this.theta);
    this.getRandomVelocity();
};


Rock.prototype.setLifeTimer = function () {
    this.lifeTimer = Math.pow(this.AREA, 3);
    this.lifeTimer += 100;
};

Rock.prototype.calculateArea = function () {
    var total = 0;

    for (var i = 0; i < this.vertices.length; i++) {
        var vertex = this.vertices[i];
        var x = (vertex[0] - this.centroid[0]) * 2;
        var y = (vertex[1] - this.centroid[1]) * 2;

        total += x * x + y * y;
    }
    this.AREA = Math.sqrt(total) / this.vertices.length;
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


Rock.prototype.getFeed = function () {
    switch (this.texture) {
        case 1:
            this.feed = 1;
            break;
        case 2:
            this.feed = 4;
            break;
        case 3:
            this.feed = 10;
            break;
        case 4:
            this.feed = 20;
            break;
    }
    this.power = this.realPower;
};

Rock.prototype.setDefaultHealth = function () {
    var magnitude = 0;
    switch (this.texture) {
        case 1:
            magnitude = 100;
            break;
        case 2:
            magnitude = 500;
            break;
        case 3:
            magnitude = 1000;
            break;
        case 4:
            magnitude = 10000;
            break;
    }

    this.maxHealth = magnitude;
    this.health = this.maxHealth;
};


Rock.prototype.setVertices = function () {
    if (!this.vertices) {
        //make default vertices
        var sides = this.sides;
        var vertices = [];

        var theta = 0;
        var delta = 2 * Math.PI / sides;
        for (var i = 0; i < sides; i++) {
            theta = i * delta + getRandom(-0.4, 0.4);
            var x = Math.cos(theta) * this.SCALE;
            var y = Math.sin(theta) * this.SCALE;

            vertices[i] = [x, y];
        }

        this.vertices = vertices;
    }
};

Rock.prototype.setCentroid = function () {
    this.centroid = B2Common.findCentroid(this.vertices);
    this.centroidLength = normal(this.centroid[0], this.centroid[1]);
};


Rock.prototype.tick = function () {
    if (this.body === "temp") {
        return;
    }
    if (this.dead) {
        this.onDelete();
        return;
    }
    if (this.lifeTimer <= 0 && this.body) {
        this.onDelete();
        return;
    }
    if (this.deletingBody) {
        this.deletingBody = false;
        this.x = this.body.GetPosition().x;
        this.y = this.body.GetPosition().y;
        this.deleteBody();
        return;
    }
    this.lifeTimer -= 1;

    if (this.hitTimer) {
        this.hitTimer -= 1;
        if (this.hitTimer <= 0) {
            this.hitter = null;
        }
    }
    if (this.health <= 0 && !this.splitting) {
        this.splitting = true;
        this.splitTimer = 1;
    }
    if (this.splitting && this.body) {
        if (this.splitTimer > 0) {
            this.splitTimer -= 1;
        }
        else {
            this.split();
            return;
        }
    }


    this.updateBody();
    this.move();

    this.packetHandler.b_updateRockPackets(this);
};

Rock.prototype.updateBody = function () {
    if (!this.body) {
        return;
    }
    this.x = this.body.GetPosition().x;
    this.y = this.body.GetPosition().y;
    this.theta = this.body.GetAngle();
};


Rock.prototype.deleteBody = function () {
    this.gameServer.box2d_world.DestroyBody(this.body);
    this.body = null;
};

Rock.prototype.move = function () {
    if (this.owner) {
        var playerPosition = this.owner.body.GetPosition();
        this.getOrigin();
        //this.getTheta(playerPosition, this.origin);


        if (inBounds(this.origin.x, playerPosition.x, 3) &&
            inBounds(this.origin.y, playerPosition.y, 3)) {
            //this.owner.consumeRock(this);
        }
        else {
            this.x += 0.2 * (playerPosition.x - this.origin.x);
            this.y += 0.2 * (playerPosition.y - this.origin.y);
        }
    }
};


Rock.prototype.onDelete = function () {
    this.gameServer.rockCount -= 1;
    if (this.owner) {
        this.removeOwner();
    }
    else {
        this.gameServer.box2d_world.DestroyBody(this.body);
    }

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
    this.deletingBody = true;
};

Rock.prototype.removeOwner = function () {
    if (!this.owner) {
        return;
    }
    this.owner.removeRock(this);
    this.dead = true;
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
    this.setLifeTimer();
    this.health -= amount * entity.power;
};


Rock.prototype.getOrigin = function () {
    var x = this.x;
    var y = this.y;

    var angle = Math.atan2(this.centroid[1], this.centroid[0]) % (2 * Math.PI) + this.theta;
    this.origin = {
        x: x + this.centroidLength * Math.cos(angle),
        y: y + this.centroidLength * Math.sin(angle)
    };
    return this.origin;
};


Rock.prototype.rotate = function (vel) {
    this.body.SetAngularVelocity(vel);
};

Rock.prototype.split = function () {
    if (this.AREA < 1) {
        this.gameServer.box2d_world.DestroyBody(this.body);
        this.dead = true;
        return;
    }

    var getMaxLength = function (vert, c) {
        var max = 0;
        var curr = 0;
        for (var i = 1; i <= c; i++) {
            curr = 0;
            curr += square(vert[i % c].x - vert[(i - 1) % c].x);
            curr += square(vert[i % c].y - vert[(i - 1) % c].y);
            if (max < curr) {
                max = curr;
            }
        }
        return curr;
    };
    var poly = this.body.GetFixtureList().GetShape();
    var vertices = poly.GetVertices();
    var count = poly.GetVertexCount();

    var maxLength = getMaxLength(vertices, count);
    var middleLength = 0;

    var buf = 0;
    var middle = Math.floor(count / 2) + buf;

    while (middleLength < maxLength / 2) {
        buf++;
        middle = Math.floor(count / 2) + buf;

        middleLength = 0;
        middleLength += square(vertices[(middle - 1) % count].x - vertices[middle % count].x);
        middleLength += square(vertices[(middle - 1) % count].y - vertices[middle % count].y);
    }

    var factor = getRandom(0.3, 0.7);
    var middleVertex = new B2.b2Vec2();


    middleVertex.Set(
        vertices[(middle - 1) % count].x * factor + vertices[middle % count].x * (1 - factor),
        vertices[(middle - 1) % count].y * factor + vertices[middle % count].y * (1 - factor)
    );


    var factor2 = getRandom(0.3, 0.7);

    var lastVertex = new B2.b2Vec2();
    lastVertex.Set(
        vertices[(count + buf - 1) % count].x * factor2 + vertices[buf % count].x * (1 - factor2),
        vertices[(count + buf - 1) % count].y * factor2 + vertices[buf % count].y * (1 - factor2)
    );


    var vertices1 = [];
    var vertices2 = [];
    var i;


    //default
    vertices1.push([lastVertex.x, lastVertex.y]);
    for (i = buf; i < middle; i++) {
        vertices1.push([vertices[i % count].x, vertices[i % count].y]);
    }
    vertices1.push([middleVertex.x, middleVertex.y]);


    vertices2.push([middleVertex.x, middleVertex.y]);
    for (i = middle; i < count + buf; i++) {
        vertices2.push([vertices[i % count].x, vertices[i % count].y]);
    }
    vertices2.push([lastVertex.x, lastVertex.y]);


    var x = Math.floor(this.body.GetPosition().x);
    var y = Math.floor(this.body.GetPosition().y);


    //var bodies = B2Common.createPolygonSplit(this.gameServer.box2d_world, this.body, vertices1, vertices2);

    var clone1 = new Rock(x, y, this.SCALE * 3 / 5, this.gameServer, null, vertices1, this.texture, this.body.GetAngle());
    var clone2 = new Rock(x, y, this.SCALE * 3 / 5, this.gameServer, null, vertices2, this.texture, this.body.GetAngle());


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


    var ang = getRandom(-0.2, 0.2);
    clone1.body.SetAngularVelocity(ang);
    clone2.body.SetAngularVelocity(ang);

    var dmg = 0 - this.health;

    clone1.hitter = this.hitter;
    clone1.hitTimer = this.hitTimer;

    clone2.hitter = this.hitter;
    clone2.hitTimer = this.hitTimer;

    clone1.decreaseHealth(this, dmg / getRandom(10, 15));
    clone2.decreaseHealth(this, dmg / getRandom(10, 15));

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

function square(x) {
    return x * x;
}

function overBoundary(coord) {
    return coord < entityConfig.BORDER_WIDTH || coord > entityConfig.WIDTH - entityConfig.BORDER_WIDTH;
}

module.exports = Rock;
