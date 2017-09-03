'use strict';
/*
 * Simple BinaryWriter is a minimal tool to write binary stream with unpredictable size.
 * Useful for binary serialization. Modified by LemonDoo
 *
 * Copyright (c) 2016 Barbosik https://github.com/Barbosik
 * License: Apache License, Version 2.0
 */

const allocMax = 20000;


function BinaryWriter() {
    this.allocLength = 0;
    this.sharedBuffer = new Buffer(allocMax);
}

module.exports = BinaryWriter;

BinaryWriter.prototype.writeUInt8 = function (value) {
    this.sharedBuffer.writeUInt8(value, this.allocLength, true);
    this.allocLength += 1;
};

BinaryWriter.prototype.writeInt8 = function (value) {
    this.sharedBuffer.writeInt8(value, this.allocLength, true);
    this.allocLength += 1;
};

BinaryWriter.prototype.writeUInt16 = function (value) {
    this.sharedBuffer.writeUInt16BE(value, this.allocLength, true);
    this.allocLength += 2;
};


BinaryWriter.prototype.writeInt16 = function (value) {
    this.sharedBuffer.writeInt16BE(value, this.allocLength, true);
    this.allocLength += 2;
};


BinaryWriter.prototype.writeUInt32 = function (value) {
    this.sharedBuffer.writeUInt32BE(value, this.allocLength, true);
    this.allocLength += 4;
    //console.log(this.sharedBuffer);
};

BinaryWriter.prototype.writeFloat = function (value) {
    this.sharedBuffer.writeFloatLE(value, this.allocLength, true);
    this.allocLength += 4;
};

BinaryWriter.prototype.writeDouble = function (value) {
    this.sharedBuffer.writeDoubleLE(value, this.allocLength, true);
    this.allocLength += 8;
};

BinaryWriter.prototype.writeBytes = function (data) { //writes data
    data.copy(this.sharedBuffer, this.allocLength, 0, data.length);
    this.allocLength += data.length;
};



BinaryWriter.prototype.writeStringZeroUtf8 = function (value) {
    var length = Buffer.byteLength(value, 'utf8');
    this.sharedBuffer.write(value, this.allocLength, 'utf8');
    this.allocLength += length;
    this.writeUInt8(0);
};

BinaryWriter.prototype.writeStringZeroUnicode = function (value) {
    var length = Buffer.byteLength(value, 'ucs2');
    this.sharedBuffer.write(value, this.allocLength, 'ucs2');
    this.allocLength += length;
    this.writeUInt16(0);
};

BinaryWriter.prototype.toBuffer = function () {
    var newBuf = new Buffer(this.allocLength);
    this.sharedBuffer.copy(newBuf, 0, 0, this.allocLength); //(target, targetSt, sourceSt, sourceEnd)
    return newBuf;
};
