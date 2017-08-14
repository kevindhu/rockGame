var BinaryWriter = require("./BinaryWriter");

function UpdateNodes(playerTracker, addNodes, updNodes, delNodes) {
    this.playerTracker = playerTracker;
    this.addNodes = addNodes;
    this.updNodes = updNodes;
    this.delNodes = delNodes;
}

module.exports = UpdateNodes;

UpdateNodes.prototype.build = function () {
    var writer = new BinaryWriter();

    writer.writeUInt8(0x10);    // Packet ID
    this.writeUpdateItems(writer);
    this.writeRemoveItems(writer, protocol);
    return writer.toBuffer();
};


UpdateNodes.prototype.writeUpdateItems = function (writer) {
    for (var i = 0; i < this.updNodes.length; i++) {
        var node = this.updNodes[i];
        if (node.nodeId === 0)
            continue;
        var cellX = node.position.x + scrambleX;
        var cellY = node.position.y + scrambleY;

        // Write update record
        writer.writeUInt32((node.nodeId ^ scrambleId) >>> 0);         // Cell ID
        writer.writeUInt32(cellX >> 0);                // Coordinate X
        writer.writeUInt32(cellY >> 0);                // Coordinate Y
        writer.writeUInt16(node._size >>> 0);     // Cell Size (not to be confused with mass, because mass = size*size/100)
        var color = node.color;
        writer.writeUInt8(color.r >>> 0);         // Color R
        writer.writeUInt8(color.g >>> 0);         // Color G
        writer.writeUInt8(color.b >>> 0);         // Color B

        var flags = 0;
        if (node.isSpiked)
            flags |= 0x01;      // isVirus
        if (node.isAgitated)
            flags |= 0x10;      // isAgitated
        if (node.cellType == 3)
            flags |= 0x20;      // isEjected
        writer.writeUInt8(flags >>> 0);                  // Flags

        writer.writeUInt16(0);                          // Cell Name
    }
    for (var i = 0; i < this.addNodes.length; i++) {
        var node = this.addNodes[i];
        if (node.nodeId == 0)
            continue;

        var cellX = node.position.x + scrambleX;
        var cellY = node.position.y + scrambleY;
        var skinName = null;
        var cellName = null;
        if (node.owner) {
            skinName = node.owner._skinUtf8;
            cellName = node.owner._nameUnicode;
        }

        // Write update record
        writer.writeUInt32((node.nodeId ^ scrambleId) >>> 0);         // Cell ID
        writer.writeUInt32(cellX >> 0);                // Coordinate X
        writer.writeUInt32(cellY >> 0);                // Coordinate Y
        writer.writeUInt16(node._size >>> 0);     // Cell Size (not to be confused with mass, because mass = size*size/100)
        var color = node.color;
        writer.writeUInt8(color.r >>> 0);         // Color R
        writer.writeUInt8(color.g >>> 0);         // Color G
        writer.writeUInt8(color.b >>> 0);         // Color B

        var flags = 0;
        if (node.isSpiked)
            flags |= 0x01;      // isVirus
        if (skinName != null)
            flags |= 0x04;      // isSkinPresent
        if (node.isAgitated)
            flags |= 0x10;      // isAgitated
        if (node.cellType == 3)
            flags |= 0x20;      // isEjected
        writer.writeUInt8(flags >>> 0);                  // Flags

        if (flags & 0x04)
            writer.writeBytes(skinName);       // Skin Name in UTF8

        if (cellName != null)
            writer.writeBytes(cellName);    // Name
        else
            writer.writeUInt16(0);                      // Name
    }
    writer.writeUInt32(0 >> 0);                         // Cell Update record terminator
};




UpdateNodes.prototype.writeRemoveItems = function (writer, protocol) {
    var scrambleId = this.playerTracker.scrambleId;

    var length = this.eatNodes.length + this.delNodes.length;
    if (protocol < 6)
        writer.writeUInt32(length >>> 0);          // RemoveRecordCount
    else
        writer.writeUInt16(length >>> 0);          // RemoveRecordCount
    for (var i = 0; i < this.eatNodes.length; i++) {
        var node = this.eatNodes[i];
        writer.writeUInt32((node.nodeId ^ scrambleId) >>> 0);                // Cell ID
    }
    for (var i = 0; i < this.delNodes.length; i++) {
        var node = this.delNodes[i];
        writer.writeUInt32((node.nodeId ^ scrambleId) >>> 0);                // Cell ID
    }
};
