const entityConfig = require('../entityConfig');
const BinaryWriter = require('../../packet/BinaryWriter');

function PlayerHandler(player, gameServer) {
    this.player = player;
    this.gameServer = gameServer;
}


PlayerHandler.prototype.addInfo = function () {
    var writer = new BinaryWriter();
    var player = this.player;

    var x = player.body.GetPosition().x;
    var y = player.body.GetPosition().y;


    // Write update record
    writer.writeUInt32(player.id >>> 0);             //id
    writer.writeUInt32(x * 100 >> 0);                // x
    writer.writeUInt32(y * 100 >> 0);                // y

    writer.writeUInt16(player.radius >>> 0);             //radius

    var nameNum = "";
    for (var i = 0; i < player.name.length; i++) {
        const val = player.name.toLowerCase().charCodeAt(i) - 97 + 1;
        nameNum = nameNum + "" + val;
    }
    writer.writeUInt32(parseInt(nameNum) >>> 0);              //name

    writer.writeUInt8(player.vertices.length >>> 0); //vertices
    for (var i = 0; i < player.vertices.length; i++) {
        writer.writeInt16(player.vertices[i][0] * 1000);
        writer.writeInt16(player.vertices[i][1] * 1000);
    }

    writer.writeUInt8(player.health >>> 0);              //health
    writer.writeUInt8(player.maxHealth >>> 0);           //maxHealth

    writer.writeInt16(player.theta * 100 >>> 0);            //theta
    writer.writeUInt8(player.level >>> 0);                  //level

    var flags = 0;
    if (player.vulnerable)
        flags |= 0x01;
    if (player.shooting)
        flags |= 0x10;
    writer.writeUInt8(flags >>> 0);                    //flags

    return writer.toBuffer();
};


PlayerHandler.prototype.updateInfo = function () {
    var writer = new BinaryWriter();
    var player = this.player;

    var x = player.body.GetPosition().x;
    var y = player.body.GetPosition().y;


    // Write update record
    writer.writeUInt32(player.id >>> 0);             //id
    writer.writeUInt32(x * 10000 >> 0);                // x
    writer.writeUInt32(y * 10000 >> 0);                // y

    writer.writeUInt16(player.radius >>> 0);             //radius

    var nameNum = "";
    for (var i = 0; i < player.name.length; i++) {
        const val = player.name.toLowerCase().charCodeAt(i) - 97 + 1;
        nameNum = nameNum + "" + val;
    }
    writer.writeUInt32(parseInt(nameNum) >>> 0);              //name

    writer.writeUInt8(player.health >>> 0);              //health
    writer.writeUInt8(player.maxHealth >>> 0);           //maxHealth

    writer.writeInt16(player.theta * 100 >>> 0);            //theta
    writer.writeUInt8(player.level >>> 0);                  //level

    var flags = 0;
    if (player.shooting) {
        flags |= 0x100;
    }
    if (player.vulnerable) {
        flags |= 0x010;
    }
    if (player.colliding) {
        flags |= 0x001;
    }
    writer.writeUInt16(parseInt(flags.toString(16)) >>> 0);                    //flags



    return writer.toBuffer();
};


PlayerHandler.prototype.deleteInfo = function () {
    var writer = new BinaryWriter();
    var player = this.player;

    // Write delete record
    writer.writeUInt32(player.id >>> 0);         // Rock ID
    return writer.toBuffer();
};


module.exports = PlayerHandler;