var Entity = require('./entity');
var QuadNode = require('./modules/QuadNode');
var Chunk = require('./Chunk');
var PacketHandler = require('./PacketHandler');
const entityConfig = require('./entity/entityConfig');
const Arithmetic = require('./modules/Arithmetic');
const PORT = process.env.PORT || 2000;

function GameServer() {
    this.packetHandler = new PacketHandler(this);
    this.CHUNKS = {};

    this.SOCKET_LIST = {};
    this.INIT_SOCKET_LIST = {};

    this.CONTROLLER_LIST = {};

    this.ASTEROID_LIST = {};

    this.TILE_LIST = {};
    this.HOME_LIST = {};
    this.LASER_LIST = {};

    //these are all updaters (updated every tick of server loop until deleted)

    this.controllerTree = null;
    this.homeTree = null;
    this.tileTree = null;
    this.towerTree = null;

    this.minx = entityConfig.BORDER_WIDTH;
    this.miny = entityConfig.BORDER_WIDTH;
    this.maxx = entityConfig.WIDTH - entityConfig.BORDER_WIDTH;
    this.maxy = entityConfig.WIDTH - entityConfig.BORDER_WIDTH;

    this.tileLength = (entityConfig.WIDTH - 2 * entityConfig.BORDER_WIDTH) /
        Math.sqrt(entityConfig.TILES);
    this.startTime = Date.now();
}

/** SERVER INIT METHODS **/
GameServer.prototype.initChunks = function () {
    for (var i = 0; i < entityConfig.CHUNKS; i++) {
        this.CHUNKS[i] = new Chunk(i, this);
    }
};

GameServer.prototype.initTiles = function () {
    this.tileTree = new QuadNode({
        minx: this.minx,
        miny: this.miny,
        maxx: this.maxx,
        maxy: this.maxy
    });
    for (var i = 0; i < Math.sqrt(entityConfig.TILES); i++) {
        for (var j = 0; j < Math.sqrt(entityConfig.TILES); j++) {
            new Entity.Tile(entityConfig.BORDER_WIDTH + this.tileLength * i,
                entityConfig.BORDER_WIDTH + this.tileLength * j, this);
        }
    }
};

GameServer.prototype.initControllers = function () {
    this.controllerTree = new QuadNode({
        minx: this.minx,
        miny: this.miny,
        maxx: this.maxx,
        maxy: this.maxy
    });
};


GameServer.prototype.initAsteroids = function () {
    this.asteroidTree = new QuadNode({
        minx: this.minx,
        miny: this.miny,
        maxx: this.maxx,
        maxy: this.maxy
    });

    for (var i = 0; i < entityConfig.SHARDS; i++) {
        this.createAsteroid();
    }
}

GameServer.prototype.initHomes = function () {
    this.homeTree = new QuadNode({
        minx: this.minx,
        miny: this.miny,
        maxx: this.maxx,
        maxy: this.maxy
    });
};


GameServer.prototype.initNewClients = function () {
    for (var id in this.INIT_SOCKET_LIST) {
        var socket = this.SOCKET_LIST[id];
        if (!socket) {
            delete this.INIT_SOCKET_LIST[id];
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

        if (socket.timer !== 0) {
            socket.timer -= 1;
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
            socket.timer = 2;
            socket.stage++;
        }
        else {
            delete this.INIT_SOCKET_LIST[id];
        }
    }
};

/** UPDATE METHODS **/
GameServer.prototype.spawnAsteroids = function () {
    if (Object.size(this.ASTEROID_LIST) < entityConfig.SHARDS) {
        this.createAsteroid();
    }
};

GameServer.prototype.getEntityTile = function (entity) {
    var entityBound = {
        minx: entity.x - entityConfig.SHARD_WIDTH,
        miny: entity.y - entityConfig.SHARD_WIDTH,
        maxx: entity.x + entityConfig.SHARD_WIDTH,
        maxy: entity.y + entityConfig.SHARD_WIDTH
    };
    var ret = null;

    this.tileTree.find(entityBound, function (tile) {
        ret = tile;
    }.bind(this));
    return ret;
};


GameServer.prototype.checkControllerCollision = function (controller) {
    var controllerBound = {
        minx: controller.x - controller.radius,
        miny: controller.y - controller.radius,
        maxx: controller.x + controller.radius,
        maxy: controller.y + controller.radius
    };

    this.asteroidTree.find(controllerBound, function (asteroid) {
        if (asteroid.fast && asteroid.prevOwner !== controller) {
            asteroid.decreaseHealth(controller.maxHealth);
            controller.decreaseHealth(Math.abs(asteroid.xVel) + Math.abs(asteroid.yVel));
        }
        if (asteroid.glowing && asteroid.owner === controller) {
            controller.consumeAsteroid(asteroid);
        }
    }.bind(this));

};

GameServer.prototype.checkCollisions = function () {
    var id;
    for (id in this.CONTROLLER_LIST) {
        var controller = this.CONTROLLER_LIST[id];
        this.checkControllerCollision(controller);
    }
};

GameServer.prototype.updateControllers = function () {
    for (var id in this.CONTROLLER_LIST) {
        var controller = this.CONTROLLER_LIST[id];
        controller.update();
    }
};


GameServer.prototype.updateAsteroids = function () {
    var id, asteroid;
    this.spawnAsteroids();

    for (id in this.ASTEROID_LIST) {
        asteroid = this.ASTEROID_LIST[id];
        asteroid.update();
    }
};


GameServer.prototype.update = function () {
    this.timeStamp = Date.now();


    this.initNewClients();
    this.checkCollisions();

    this.updateControllers();
    this.updateAsteroids();

    this.packetHandler.sendPackets();
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
    this.initTiles();
    this.initAsteroids();
    this.initControllers();
    this.initHomes();

    /** START WEBSOCKET SERVICE **/
    var io = require('socket.io')(server, {});

    io.sockets.on('connection', function (socket) {
        var player;
        socket.id = Math.random();
        socket.timer = 0;
        socket.life = 100;
        socket.verified = false;
        socket.stage = 0;

        this.packetHandler.sendVerificationPackets(socket);
        this.SOCKET_LIST[socket.id] = socket;
        this.INIT_SOCKET_LIST[socket.id] = socket;

        console.log("Client #" + socket.id + " has joined the server");

        socket.on("verify", function (data) {
            if (!socket.verified) {
                console.log("Verified Client #" + socket.id);
            }
            socket.verified = true;
        }.bind(this));

        socket.on('newPlayer', function (data) {
            player = this.createPlayer(socket, data);
            socket.player = player;
            this.packetHandler.addChatPackets("SERVER", player.name + " has connected!");
        }.bind(this));

        socket.on('chatMessage', function (data) {
            var player = this.CONTROLLER_LIST[data.id];

            if (player) {
                this.packetHandler.addChatPackets(player.name, data.message);
            }
        }.bind(this));

        socket.on('mouseDown', function (data) {
            var player = this.CONTROLLER_LIST[data.id];


            if (player) {
                //CUT THE ASTROID
            }
        }.bind(this));

        socket.on('mouseMove', function (data) {


            var player = this.CONTROLLER_LIST[data.id];

            if (player && !player.active) {
                player.selectAsteroid(player.x + data.x, player.y + data.y);
                player.moveAsteroids(player.x + data.x, player.y + data.y);
            }
        }.bind(this));

        socket.on('slash', function (data) {
            var player = this.CONTROLLER_LIST[data.id];

            if (player && player.active) {
                player.addSlash({
                    x: player.x + data.x,
                    y: player.y + data.y,
                    slashId: data.slashId
                });
            }
        }.bind(this));

        socket.on('mouseUp', function (data) {
            var player = this.CONTROLLER_LIST[data.id];

            if (player && player.active) {
                player.shootAsteroid(player.x + data.x, player.y + data.y);
            }
        }.bind(this));


        socket.on('keyEvent', function (data) {
            if (!player) {
                return;
            }
            switch (data.id) {
                case 39:
                case 68:
                    player.pressingRight = data.state;
                    break;
                case 40:
                case 83:
                    player.pressingDown = data.state;
                    break;
                case 37:
                case 65:
                    player.pressingLeft = data.state;
                    break;
                case 38:
                case 87:
                    player.pressingUp = data.state;
                    break;
                case 32:
                    if (data.state) {
                        player.switch();
                    }
                    break;
                case "hehe xd": //swirling motion
                    if (data.state) {
                        player.groupAsteroids();
                    }
                    break;
            }

        }.bind(this));


        socket.on('disconnect', function () {
            console.log("Client #" + socket.id + " has left the server");
            if (player) {
                player.onDelete();
            }
            delete this.SOCKET_LIST[socket.id];
            delete this.INIT_SOCKET_LIST[socket.id];
        }.bind(this));
    }.bind(this));

    /** START MAIN LOOP **/
    setInterval(this.update.bind(this), 1000 / 25);
};

GameServer.prototype.createPlayer = function (socket, info) {
    return new Entity.Player(socket.id, info.name, this);
};


GameServer.prototype.createAsteroid = function () {
    var emptySpace = false;
    var radius;
    var x, y;

    while (!emptySpace) {
        radius = Arithmetic.getRandomInt(15, 200);
        x = Arithmetic.getRandomInt(entityConfig.BORDER_WIDTH, entityConfig.WIDTH - entityConfig.BORDER_WIDTH);
        y = Arithmetic.getRandomInt(entityConfig.BORDER_WIDTH, entityConfig.WIDTH - entityConfig.BORDER_WIDTH);

        var entityBound = {
            minx: x - radius,
            miny: y - radius,
            maxx: x + radius,
            maxy: y + radius
        };

        var check = null;
        this.asteroidTree.find(entityBound, function (asteroid) {
            check = asteroid;
        }.bind(this));

        if (!check) {
            emptySpace = true;
        }
    }

    return new Entity.Asteroid(x, y, null, radius, this);
};


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

module.exports = GameServer;
