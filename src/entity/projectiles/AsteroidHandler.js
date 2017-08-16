const entityConfig = require('../entityConfig');
const BinaryWriter = require('../../packet/BinaryWriter');

function AsteroidHandler(asteroid, gameServer) {
    this.asteroid = asteroid;
    this.gameServer = gameServer;
}



AsteroidHandler.prototype.addInfo = function () {
    var writer = new BinaryWriter();
    var asteroid = this.asteroid;

    // Write update record
    writer.writeUInt32(asteroid.id >>> 0);         // Asteroid ID

    (asteroid.owner) ? writer.writeUInt32(asteroid.owner.id >>> 0) : //Asteroid owner id
        writer.writeUInt32(0 >>> 0);


    writer.writeUInt32(asteroid.x * 100 >> 0);                // Coordinate X
    writer.writeUInt32(asteroid.y * 100 >> 0);                // Coordinate Y


    writer.writeUInt16(asteroid.radius >>> 0);             //Radius

    writer.writeUInt8(asteroid.health >>> 0);
    writer.writeUInt8(asteroid.maxHealth >>> 0);
    writer.writeUInt8(asteroid.displayTheta >>> 0); // display theta

    var flags = 0;
    if (asteroid.glowing)
        flags |= 0x01;               // isGlowing
    if (asteroid.fast)
        flags |= 0x10;               // isFast
    writer.writeUInt8(flags >>> 0);
    writer.writeUInt16(0);           //terminate flags

    writer.writeUInt16(0 >> 0); //terminate asteroid record

    return writer.toBuffer();
};


AsteroidHandler.prototype.updateInfo = function () {
    var writer = this.adder;
    var asteroid = this.asteroid;

    // Write update record
    writer.writeUInt32(asteroid.id >>> 0);         // Asteroid ID

    (asteroid.owner) ? writer.writeUInt32(asteroid.owner.id >>> 0) : //Asteroid owner id
        writer.writeUInt32(0 >>> 0);


    writer.writeUInt32(asteroid.x >> 0);                // Coordinate X
    writer.writeUInt32(asteroid.y >> 0);                // Coordinate Y
    writer.writeUInt16(asteroid.radius >>> 0);             //Radius

    writer.writeUInt8(asteroid.health >>> 0);
    writer.writeUInt8(asteroid.maxHealth >>> 0);
    writer.writeUInt8(asteroid.displayTheta >>> 0); // display theta

    var flags = 0;
    if (asteroid.glowing)
        flags |= 0x01;               // isGlowing
    if (asteroid.fast)
        flags |= 0x10;               // isFast
    writer.writeUInt8(flags >>> 0);
    writer.writeUInt16(0);           //terminate flags

    writer.writeUInt32(0 >> 0); //terminate asteroid record

    return writer.toBuffer();
};


AsteroidHandler.prototype.deleteInfo = function () {
    var writer = this.deleter;
    var asteroid = this.asteroid;

    // Write delete record
    writer.writeUInt32(asteroid.id >>> 0);         // Asteroid ID
    writer.writeUInt32(0 >> 0); //terminate asteroid record
};


AsteroidHandler.prototype.addAsteroidAnimationPackets = function (asteroid) {
    this.CHUNK_PACKETS[asteroid.chunk].push(
        {
            master: "add",
            class: "animationInfo",
            type: "asteroidDeath",
            id: asteroid.id,
            x: asteroid.x,
            y: asteroid.y
        })
};




AsteroidHandler.prototype.deleteControllerPackets = function (controller, chunk) {
    var info = {
        master: "delete",
        class: "controllerInfo",
        id: controller.id
    };
    if (chunk) {
        return info;
    } else {
        this.CHUNK_PACKETS[controller.chunk].push(info);
    }
};

AsteroidHandler.prototype.deleteUIPackets = function (player, action) {
    this.CHUNK_PACKETS[player.chunk].push({
        master: "delete",
        class: "UIInfo",
        id: player.id,
        action: action
    });
};

AsteroidHandler.prototype.deleteAsteroidPackets = function (asteroid, chunk) {
    var info = {
        master: "delete",
        class: "asteroidInfo",
        id: asteroid.id
    };
    if (chunk) {
        return info;
    }
    this.CHUNK_PACKETS[asteroid.chunk].push(info);
};

AsteroidHandler.prototype.sendPackets = function () {
    var id;
    for (var index in this.gameServer.SOCKET_LIST) {
        var socket = this.gameServer.SOCKET_LIST[index];
        if (socket.player) {
            var player = socket.player;

            if (player.chunkAdd) {
                for (id in player.chunkAdd) {
                    socket.emit('updateEntities', this.createChunkPacket(id));
                }
            }
            if (player.chunkDelete) {
                for (id in player.chunkDelete) {
                    socket.emit('updateEntities', this.deleteChunkPacket(id));
                }
            }
            socket.emit('updateEntities', this.masterPacket);
            var chunks = player.findNeighboringChunks();
            for (id in chunks) {
                socket.emit('updateEntities', this.CHUNK_PACKETS[id]);
            }
        }
    }
    this.resetPackets();
};

AsteroidHandler.prototype.findChunks = function (socket) {
    var rowLength = Math.sqrt(entityConfig.CHUNKS);
    var chunks = [];

    for (var i = 0; i < 9; i++) {
        var chunk = socket.player.chunk;
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
        chunks.push(chunk);
    }
    return chunks;
};

AsteroidHandler.prototype.resetPackets = function () {
    var id;
    for (id in this.CHUNK_PACKETS) {
        this.CHUNK_PACKETS[id] = [];
    }
    this.masterPacket = [];
};


module.exports = AsteroidHandler;