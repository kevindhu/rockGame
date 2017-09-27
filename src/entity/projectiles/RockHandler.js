const BinaryWriter = require('../../packet/BinaryWriter');

function RockHandler(rock, gameServer) {
    this.rock = rock;
    this.gameServer = gameServer;
}


RockHandler.prototype.addInfo = function () {
    var writer = new BinaryWriter();
    var rock = this.rock;

    var ownerId = rock.owner ? rock.owner.id >>> 0 : 0 >>> 0;
    var hitterId = rock.hitter ? rock.hitter >>> 0 : 0 >>> 0;

    writer.writeUInt32(rock.id >>> 0);
    writer.writeUInt32(ownerId);
    writer.writeUInt32(hitterId);
    writer.writeUInt32(rock.x * 10000 >> 0);
    writer.writeUInt32(rock.y * 10000 >> 0);


    writer.writeUInt16(rock.vertices.length >>> 0); //write vertices
    for (var i = 0; i < rock.vertices.length; i++) {
        writer.writeInt16(rock.vertices[i][0] * 1000);
        writer.writeInt16(rock.vertices[i][1] * 1000);
    }
    writer.writeInt16(rock.health >>> 0);              //health
    writer.writeInt16(rock.maxHealth >>> 0);           //maxHealth

    writer.writeInt16(rock.theta * 100 >>> 0);              //theta
    writer.writeUInt8(rock.texture >>> 0);             //texture


    var flags = 0;
    if (rock.neutral)
        flags |= 0x01;               // neutral
    if (rock.fast)
        flags |= 0x10;               // fast

    writer.writeUInt8(flags >>> 0);
    return writer.toBuffer();
};


RockHandler.prototype.updateInfo = function () {
    var writer = new BinaryWriter();
    var rock = this.rock;
    var ownerId = rock.owner ? rock.owner.id : 0;
    var hitterId = rock.hitter ? rock.hitter : 0;

    writer.writeUInt32(rock.id >>> 0);
    writer.writeUInt32(ownerId >>> 0);
    writer.writeUInt32(hitterId >>> 0);

    writer.writeUInt32(rock.x * 10000 >> 0);
    writer.writeUInt32(rock.y * 10000 >> 0);


    writer.writeInt16(rock.health >>> 0);              //health
    writer.writeInt16(rock.maxHealth >>> 0);           //maxHealth

    writer.writeInt16(rock.theta * 100 >>> 0);              //theta

    var flags = 0;
    if (rock.neutral)
        flags |= 0x01;               // neutral
    if (rock.fast)
        flags |= 0x10;               // fast

    writer.writeUInt8(flags >>> 0);
    return writer.toBuffer();
};


RockHandler.prototype.deleteInfo = function () {
    var writer = new BinaryWriter();
    var rock = this.rock;

    // Write delete record
    writer.writeUInt32(rock.id >>> 0);         // Rock ID
    return writer.toBuffer();
};

module.exports = RockHandler;