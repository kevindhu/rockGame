var Entity = require('./entity');
var QuadNode = require('./modules/QuadNode');
var Chunk = require('./Chunk');
var B2 = require('./modules/B2');
var B2Common = require('./modules/B2Common');
var PacketHandler = require('./PacketHandler');
const entityConfig = require('./entity/entityConfig');
const Arithmetic = require('./modules/Arithmetic');
const PORT = process.env.PORT || 2000;

function GameServer() {
    this.packetHandler = new PacketHandler(this);
    this.CHUNKS = {};

    this.SOCKET_LIST = {};
    this.INIT_SOCKET_LIST = {};

    this.PLAYER_LIST = {};
    this.ROCK_LIST = {};
    this.TILE_LIST = {};


    this.minx = entityConfig.BORDER_WIDTH;
    this.miny = entityConfig.BORDER_WIDTH;
    this.maxx = entityConfig.WIDTH - entityConfig.BORDER_WIDTH;
    this.maxy = entityConfig.WIDTH - entityConfig.BORDER_WIDTH;

    this.tileLength = (entityConfig.WIDTH - 2 * entityConfig.BORDER_WIDTH) /
        Math.sqrt(entityConfig.TILES);
    this.startTime = Date.now();

    this.step = 0;
    this.rockCount = 0;
    this.playerCount = 0;
}

/** SERVER INIT METHODS **/
GameServer.prototype.initChunks = function () {
    for (var i = 0; i < entityConfig.CHUNKS; i++) {
        this.CHUNKS[i] = new Chunk(i, this);
    }
};
GameServer.prototype.initB2 = function () {
    var gravity = new B2.b2Vec2(0, 0);
    this.box2d_world = new B2.b2World(gravity, false); //no sleep, need dynamic bodies over static bodies to work
};
GameServer.prototype.initTiles = function () {
    for (var i = 0; i < Math.sqrt(entityConfig.TILES); i++) {
        for (var j = 0; j < Math.sqrt(entityConfig.TILES); j++) {
            new Entity.Tile(entityConfig.BORDER_WIDTH + this.tileLength * i,
                entityConfig.BORDER_WIDTH + this.tileLength * j, this);
        }
    }
};


GameServer.prototype.initWalls = function () {
    var border = entityConfig.BORDER_WIDTH;
    var width = entityConfig.WIDTH;


    var wall1 = new Entity.Wall(border / 2, width / 2,
        border, width, this);

    var wall2 = new Entity.Wall(width - border / 2, width / 2,
        border, width, this);

    var wall3 = new Entity.Wall(width / 2, border / 2,
        width - 2 * border, border, this);

    var wall4 = new Entity.Wall(width / 2, width - border / 2,
        width - 2 * border, border, this);
};


GameServer.prototype.initRocks = function () {
    var i;
    for (i = 0; i < entityConfig.ROCKS; i++) {
        this.spawnRandomRock();
    }
};
GameServer.prototype.initNewClients = function () {
    for (var id in this.INIT_SOCKET_LIST) {
        var socket = this.SOCKET_LIST[id];
        if (!socket) {
            delete this.INIT_SOCKET_LIST[id];
            return;
        }

        if (!socket.verified) { //verify new client socket
            socket.life -= 1;
            if (socket.life === 0) {
                console.log("DETECTED ROGUE CLIENT!");
                socket.disconnect();
            }
        }

        if (!socket.player) {
            return;
        }

        else if (socket.stage <= 8) {
            var rowLength = Math.sqrt(entityConfig.CHUNKS);
            var chunk = socket.player.chunk;
            var xIndex = socket.stage % 3 - 1;
            var yIndex = Math.floor(socket.stage / 3) - 1;

            while (!(chunk % rowLength + xIndex).between(0, rowLength - 1) ||
            !(Math.floor(chunk / rowLength) + yIndex).between(0, rowLength - 1)) {
                socket.stage++;
                if (socket.stage > 8) {
                    return;
                }
                xIndex = socket.stage % 3 - 1;
                yIndex = Math.floor(socket.stage / 3) - 1;
            }
            chunk += xIndex + rowLength * yIndex;
            this.packetHandler.sendChunkInitPackets(socket, chunk);
            socket.stage++;
        }
        else {
            socket.initialized = true;
            delete this.INIT_SOCKET_LIST[id];
        }
    }
};

GameServer.prototype.spawnRandomRock = function () {
    var x = Arithmetic.getRandomInt(entityConfig.BORDER_WIDTH, entityConfig.WIDTH - entityConfig.BORDER_WIDTH);
    var y = Arithmetic.getRandomInt(entityConfig.BORDER_WIDTH, entityConfig.WIDTH - entityConfig.BORDER_WIDTH);
    return new Entity.Rock(x, y, getRandom(2, 30), this);
};


/** UPDATE METHODS **/
GameServer.prototype.spawnRocks = function () {
    if (this.rockCount < entityConfig.ROCKS) {
        this.spawnRandomRock();
    }
};

GameServer.prototype.update = function () {

    var prevTimeStamp = this.timeStamp;

    this.timeStamp = Date.now();
    this.step += 1;

    if (this.timeStamp - prevTimeStamp > 50) {
        //console.log("TOO LAGGY: " + this.timeStamp - prevTimeStamp);
    }

    if (this.timeStamp % 50 === 0) {
        //this.packetHandler.sendPing(this.timeStamp);
    }

    this.updateBox2d();
    this.initNewClients();

    this.updatePlayers();
    this.updateRocks();

    this.packetHandler.sendPackets();
};
GameServer.prototype.updatePlayers = function () {
    for (var id in this.PLAYER_LIST) {
        var player = this.PLAYER_LIST[id];
        player.tick();
    }
};
GameServer.prototype.updateRocks = function () {
    var id, rock;

    this.spawnRocks();

    for (id in this.ROCK_LIST) {
        rock = this.ROCK_LIST[id];
        rock.tick();
    }
};
GameServer.prototype.updateBox2d = function () {
    this.box2d_world.Step(1 / 20, 4, 3);

    //important to clear forces, otherwise forces will keep applying
    this.box2d_world.ClearForces();
};

/** SERVER CREATION EVENTS **/
GameServer.prototype.start = function () {
    var express = require("express");
    var app = express();
    var server = require('http').Server(app);

    /** INIT PORT CONNECTION **/
    app.get('/', function (req, res) {
        res.sendFile(__dirname + '/client/index.html');
    });
    app.use('/', express.static(__dirname + '/client'));

    server.listen(PORT);
    console.log('Started Server!');

    /** INIT SERVER OBJECTS **/
    this.initChunks();
    this.initB2();
    this.setupCollisionHandler();
    this.initTiles();
    this.initWalls();
    this.initRocks();

    var io = require('socket.io')(server, {});
    io.sockets.on('connection', function (socket) {
        var player;
        socket.id = Math.abs(Math.floor(Math.random() * 1000000));
        socket.life = 100;
        socket.verified = false;
        socket.stage = 0;

        this.packetHandler.sendVerificationPackets(socket);
        this.SOCKET_LIST[socket.id] = socket;
        this.INIT_SOCKET_LIST[socket.id] = socket;

        console.log("Client #" + socket.id + " has joined the server");

        socket.on("verify", function (data) {
            if (!socket.verified) {
                socket.closeTimer = 4;
                console.log("Verified Client #" + socket.id);
            }
            socket.verified = true;
        }.bind(this));

        socket.on("pong123", function (data) {
            var ping = Math.round((this.timeStamp - data) / 2);
            socket.closeTimer = 4;
            socket.emit("finalPing", ping);
        }.bind(this));

        socket.on('newPlayer', function (data) {
            player = this.createPlayer(socket, data);
            if (player) {
                this.playerCount ++;
                socket.player = player;
                this.packetHandler.addChatPackets("SERVER", player.name + " has connected!");
            }
        }.bind(this));


        socket.on('getPlayer', function (data) {
            var newPlayer = this.PLAYER_LIST[data.id];
            if (newPlayer) {
                this.packetHandler.b_addPlayerPackets(newPlayer);
            }
        }.bind(this));

        socket.on('getRock', function (data) {
            var rock = this.ROCK_LIST[data.id];
            if (rock) {
                this.packetHandler.b_addRockPackets(rock);
            }
        }.bind(this));

        socket.on('chatMessage', function (data) {
            var player = this.PLAYER_LIST[data.id];

            if (player) {
                this.packetHandler.addChatPackets(player.name, data.message);
            }
        }.bind(this));

        socket.on('move', function (data) {
            var player = this.PLAYER_LIST[data.id];

            if (player) {
                player.setMove(data.x / 100, data.y / 100);
            }
        }.bind(this));

        socket.on('startShoot', function (data) {
            var player = this.PLAYER_LIST[data.id];
            if (player) {
                player.startShoot();
            }
        }.bind(this));



        socket.on('endShoot', function (data) {
            var player = this.PLAYER_LIST[data.id];
            if (player) {
                player.endShoot();
            }
        }.bind(this));


        socket.on('keyEvent', function (data) {
            if (!player) {
                return;
            }
            switch (data.id) {
                case 32:
                    if (data.state && !player.shooting) {
                        player.shootSelfDefault();
                    }
                    else {
                        player.endShoot();
                    }

            }
        }.bind(this));

        socket.on('createCircle', function (data) {
            //var radius = data.radius / 100;
            //player.createCircle(radius);
        }.bind(this));


        socket.on('disconnect', function () {
            console.log("Client #" + socket.id + " has left the server");
            if (player) {
                player.onDelete();
                this.playerCount -= 1;
            }
            delete this.SOCKET_LIST[socket.id];
        }.bind(this));
    }.bind(this));
    setInterval(this.update.bind(this), 1000 / 30);
};

GameServer.prototype.createPlayer = function (socket, info) {
    return new Entity.Player(socket.id, info.name, this);
};


GameServer.prototype.setupCollisionHandler = function () {
    var tryAddRock = function (a, b) {
        if (a instanceof Entity.Rock && b instanceof Entity.PlayerSensor) {
            if (a.AREA < 2 && !a.owner && !a.fast && !a.isBullet) {
                b.parent.addRock(a);
            }
        }
    };


    var tryPPImpact = function (a, b) {
        if (a instanceof Entity.Player && b instanceof Entity.Player) {
            if (a.shooting && b.shooting) {
                a.boosting = true;
                a.boostTimer = 3;

                b.boosting = true;
                b.boostTimer = 3;

                a.shooting = false;
                b.shooting = false;
            }

            if (a.shooting) {
                b.boosting = true;
                b.boostTimer = 2;

                a.stalling = true;
                a.stallTimer = 5;

                a.shooting = false;


                var aVel = a.body.GetLinearVelocity();
                var bVel = b.body.GetLinearVelocity();
                var impact = normal(aVel.x - bVel.x,
                    aVel.y - bVel.y);


                doHardImpact(b, impact, 4);
            }
        }
    };
    var tryRRImpact = function (a, b, contact) {
        if (a instanceof Entity.Rock && b instanceof Entity.Rock) {
            if (a.hitter) {
                if (b.hitter && b.hitter.power > a.hitter) {
                    a.hitter = b.hitter;
                    a.hitTimer = b.hitTimer;
                }
                else {
                    b.hitter = a.hitter;
                    b.hitTimer = a.hitTimer;
                }
            }
            doImpact(a, b);

            if (a.isBullet && !a.dying) {
                a.startDying();
            }
            if (b.isBullet && !b.dying) {
                b.startDying();
            }
        }

    };
    var tryRPImpact = function (a, b, contact) {
        if (a instanceof Entity.Rock && b instanceof Entity.Player) {
            if (a.owner === b) {
                contact.SetEnabled(false);
                return;
            }
            //a.rotate(getRandom(-0.5,0.5));
            a.setLifeTimer();
            a.hitter = b.id;
            a.hitTimer = 50;
            b.slowed = true;
            b.slowTimer = 3;
            doImpact(a, b);
        }
    };

    var tryWallImpact = function (a, b) {
        if ((a instanceof Entity.Player || a instanceof Entity.Rock) && b instanceof Entity.Wall) {
            var vel = a.body.GetLinearVelocity();
            var impact = normal(vel.x, vel.y);
            if (a instanceof Entity.Player) {
                doHardImpact(a, impact, 5);
            }
            else if (a instanceof Entity.Rock) {
                doHardImpact(a, impact, 15);
            }
        }
    };

    var doImpact = function (a, b) {
        var aVel = a.body.GetLinearVelocity();
        var bVel = b.body.GetLinearVelocity();
        var impact = normal(aVel.x - bVel.x,
            aVel.y - bVel.y);


        var aImpact = impact;
        var bImpact = impact;

        if (a.hitter && a.hitter === b.id) {
            bImpact = impact / 4;
        }
        if (b instanceof Entity.Player && a.hitter !== b.id) {
            bImpact = impact * 4;
        }
        if (aImpact > 20 || bImpact > 20) {
            a.decreaseHealth(b, aImpact);
            b.decreaseHealth(a, bImpact);
        }
    };
    var doHardImpact = function (a, impact, power) {
        if (impact > 15) {
            a.decreaseHealth({power: power}, impact);
        }
    };

    B2.b2ContactListener.prototype.BeginContact = function (contact) {
        var a = contact.GetFixtureA().GetUserData();
        var b = contact.GetFixtureB().GetUserData();

        tryRRImpact(a, b, contact);

        tryWallImpact(a, b);
        tryWallImpact(b, a);

        tryRPImpact(a, b, contact);
        tryRPImpact(b, a, contact);

        tryPPImpact(a, b);
        tryPPImpact(b, a);

        tryAddRock(a, b);
        tryAddRock(b, a);
    }.bind(this);
    B2.b2ContactListener.prototype.PreSolve = function (contact) {
        var a = contact.GetFixtureA().GetUserData();
        var b = contact.GetFixtureB().GetUserData();
    }.bind(this);
    B2.b2ContactListener.prototype.EndContact = function (contact) {
        var a = contact.GetFixtureA().GetUserData();
        var b = contact.GetFixtureB().GetUserData();
    }.bind(this);
};


module.exports = GameServer;

function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}
function normal(x, y) {
    return Math.sqrt(x * x + y * y);
}
Object.size = function (obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};
Number.prototype.between = function (min, max) {
    return this >= min && this <= max;
};
