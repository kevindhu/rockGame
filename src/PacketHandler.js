const entityConfig = require('./entity/entityConfig');
const Arithmetic = require('./modules/Arithmetic');
const BinaryWriter = require('./packet/BinaryWriter');
var Packet = require('./packet/Packet');
var B2 = require('./modules/B2');


function PacketHandler(gameServer) {
    this.gameServer = gameServer;

    this.CHUNK_PACKETS = {};

    this.B_CHUNK_PACKETS = {};


    this.masterPacket = [];
    this.resetChunkPackets();
}


PacketHandler.prototype.sendVerificationPackets = function (socket) {
    socket.emit('initVerification', {}); //make this more secure
};

PacketHandler.prototype.resetChunkPackets = function () {
    for (var i = 0; i < entityConfig.CHUNKS; i++) {
        this.CHUNK_PACKETS[i] = [];
        this.B_CHUNK_PACKETS[i] = new Packet(this.gameServer);
    }

    this.masterPacket = [];
};


PacketHandler.prototype.sendChunkInitPackets = function (socket, chunk) {
    //socket.emit('updateEntities', this.createChunkPacket(chunk, socket.id));
    //socket.emit('updateBinary', this.b_createChunkPacket(chunk, socket.id));
};


PacketHandler.prototype.createChunkPacket = function (chunk, id) {
    var initPacket = [];
    var populate = function (list, call) {
        for (var i in list) {
            var entity = list[i];
            initPacket.push(call(entity, true));
        }
    };

    populate(this.gameServer.CHUNKS[chunk].TILE_LIST, this.addTilePackets);
    return initPacket;
};


PacketHandler.prototype.b_createChunkPacket = function (chunk, id) {
    var PLAYER_LIST = this.gameServer.CHUNKS[chunk].PLAYER_LIST;
    var ROCK_LIST = this.gameServer.CHUNKS[chunk].ROCK_LIST;

    var populateBit = function (list, writer, call) {
        for (var i in list) {
            var entity = list[i];
            call(entity, writer);
        }
    };

    var packet = new Packet(this.gameServer);

    populateBit(PLAYER_LIST, packet.addPlayers, this.b_addPlayerPackets);
    populateBit(ROCK_LIST, packet.addRocks, this.b_addRockPackets);

    if (id) {
        packet.SELF_ID = id;
        packet.hasId = true;
    }

    return packet.build();
};


PacketHandler.prototype.deleteChunkPacket = function (chunk) {
    var deletePacket = [];
    var populate = function (list, call) {
        var count = 0;
        for (var i in list) {
            var entity = list[i];
            deletePacket.push(call(entity, true));
            count++;
        }
    };

    populate(this.gameServer.CHUNKS[chunk].PLAYER_LIST, this.deletePlayerPackets);
    //populate(this.gameServer.CHUNKS[chunk].TILE_LIST, this.deleteTilePackets); //make this thing work
    populate(this.gameServer.CHUNKS[chunk].ROCK_LIST, this.deleteRockPackets);
    return deletePacket;
};


PacketHandler.prototype.b_addPlayerPackets = function (player, writer) {
    var info = player.handler.addInfo();

    writer = writer ? writer : this.B_CHUNK_PACKETS[player.chunk].addPlayers;
    writer.writeBytes(info);
    writer.length++;
};


PacketHandler.prototype.b_addRockPackets = function (rock, writer) {
    var info = rock.handler.addInfo();

    writer = writer ? writer : this.B_CHUNK_PACKETS[rock.chunk].addRocks;
    writer.writeBytes(info);
    writer.length++;
};


PacketHandler.prototype.b_updateRockPackets = function (rock, writer) {
    var info = rock.handler.updateInfo();
    writer = writer ? writer : this.B_CHUNK_PACKETS[rock.chunk].updateRocks;

    writer.writeBytes(info);
    writer.length++;
};

PacketHandler.prototype.b_updatePlayerPackets = function (player, writer) {
    var info = player.handler.updateInfo();
    writer = writer ? writer : this.B_CHUNK_PACKETS[player.chunk].updatePlayers;

    writer.writeBytes(info);
    writer.length++;
};


PacketHandler.prototype.b_deletePlayerPackets = function (player, writer) {
    var info = player.handler.deleteInfo();
    writer = writer ? writer : this.B_CHUNK_PACKETS[player.chunk].deleteRocks;

    writer.writeBytes(info);
    writer.length++;
};

PacketHandler.prototype.b_deleteRockPackets = function (rock, writer) {
    var info = rock.handler.deleteInfo();
    writer = writer ? writer : this.B_CHUNK_PACKETS[rock.chunk].deleteRocks;

    writer.writeBytes(info);
    writer.length++;
};


PacketHandler.prototype.addTilePackets = function (tile, ifInit) {
    return {
        master: "add",
        class: "tileInfo",
        id: tile.id,
        x: tile.x * 100,
        y: tile.y * 100,
        length: tile.length * 100,
        color: tile.color,
        alert: tile.alert
    };
};
PacketHandler.prototype.addChatPackets = function (name, message) {
    this.masterPacket.push({
        master: "add",
        class: "chatInfo",
        name: name,
        chatMessage: message
    });
};


PacketHandler.prototype.sendPing = function (timestamp) {
    var id;
    for (var index in this.gameServer.SOCKET_LIST) {
        var socket = this.gameServer.SOCKET_LIST[index];
        if (socket.player) {
            socket.emit('ping', timestamp);
        }
        socket.closeTimer -= 1;
        if (socket.closeTimer <= 0) {
            console.log("CLIENT " + socket.id + "LEFT BUT SOCKET STILL UP");
            socket.disconnect();
        }
    }
};


PacketHandler.prototype.sendPackets = function () {
    var id;


    for (var index in this.gameServer.SOCKET_LIST) {
        var socket = this.gameServer.SOCKET_LIST[index];
        if (socket.player) {
            var player = socket.player;
            //socket.emit('updateEntities', this.masterPacket); //global updates

            var chunks = player.findNeighboringChunks();
            for (id in chunks) {
                //socket.emit('updateBinary', this.B_CHUNK_PACKETS[id].build());
            }
        }
    }
    this.resetChunkPackets();
};


module.exports = PacketHandler;