(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
function BinaryReader(data) {
    this._offset = 0;
    this._buffer = new DataView(data);
}

module.exports = BinaryReader;


BinaryReader.prototype.readInt8 = function () {
    var value = this._buffer.getInt8(this._offset);
    this._offset += 1;
    return value;
};

BinaryReader.prototype.readUInt8 = function () {
    var value = this._buffer.getUint8(this._offset);
    this._offset += 1;
    return value;
};


BinaryReader.prototype.readInt16 = function () {
    var value = this._buffer.getInt16(this._offset);
    this._offset += 2;
    return value;
};

BinaryReader.prototype.readUInt16 = function () {
    var value = this._buffer.getUint16(this._offset);
    this._offset += 2;
    return value;
};



BinaryReader.prototype.readInt32 = function () {
    var value = this._buffer.getInt32(this._offset);
    this._offset += 4;
    return value;
};


BinaryReader.prototype.readUInt32 = function () {
    var value = this._buffer.getUint32(this._offset);
    this._offset += 4;
    return value;
};

BinaryReader.prototype.skipBytes = function (length) {
    this._offset += length;
};

BinaryReader.prototype.length = function () {
    return this._buffer.byteLength;
};


},{}],2:[function(require,module,exports){
var Entity = require('./entity');
var MainUI = require('./ui/MainUI');
var BinaryReader = require('./BinaryReader');

function Client() {
    this.SELF_ID = null;
    this.SELF_PLAYER = null;
    this.TRAIL = null;
    this.updates = [];

    this.currPing = 0;

    this.init();
}

Client.prototype.init = function () {
    this.initSocket();
    this.initCanvases();
    this.initLists();
    this.initViewers();
};
Client.prototype.initSocket = function () {
    this.socket = io();
    this.socket.verified = false;

    this.socket.on('initVerification', this.verify.bind(this));

    this.socket.on('updateEntities', this.handlePacket.bind(this));
    this.socket.on('updateBinary', this.handleBinary.bind(this));


    this.socket.on('chatMessage', this.mainUI);
    this.socket.on('ping', this.sendPong.bind(this));
    this.socket.on('finalPing', function (message) {
        //console.log("PING: " + message);
        this.currPing = message;
        if (this.currPing > 90000) {
            this.currPing = 10;
        }
    });


};

Client.prototype.sendPong = function (message) {
    this.socket.emit("pong123", message);
};


Client.prototype.initCanvases = function () {
    this.mainCanvas = document.getElementById("main_canvas");
    this.mainCanvas.style.border = '1px solid #000000';
    this.mainCanvas.style.visibility = "hidden";
    this.mainCtx = this.mainCanvas.getContext("2d");


    document.addEventListener("mousedown", function (event) {
        if (!this.SELF_ID) {
            return;
        }
        var x = ((event.x / this.mainCanvas.offsetWidth * 1000) - this.mainCanvas.width / 2) / this.scaleFactor;
        var y = ((event.y / this.mainCanvas.offsetHeight * 500) - this.mainCanvas.height / 2) / this.scaleFactor;


        if (Math.abs(x) + Math.abs(y) < 200) {
            this.playerClicked = true;
            this.circleConstruct = [];
            this.circleStageCount = 0;
        }
        else {
            this.clickTemp = true;
            this.clickTimer = 0;
        }
    }.bind(this));
    document.addEventListener("mouseup", function (event) {
        if (!this.SELF_ID) {
            return;
        }
        var x = ((event.x / this.mainCanvas.offsetWidth * 1000) - this.mainCanvas.width / 2) / this.scaleFactor;
        var y = ((event.y / this.mainCanvas.offsetHeight * 500) - this.mainCanvas.height / 2) / this.scaleFactor;

        this.socket.emit("shootSelf", {
            id: this.SELF_ID,
            x: x,
            y: y
        });

        this.clickTemp = false;
        this.clickTimer = 0;

    }.bind(this));


    document.addEventListener("mousemove", function (event) {
        if (!this.SELF_PLAYER) {
            return;
        }

        var x = ((event.x / this.mainCanvas.offsetWidth * 1000) -
            this.mainCanvas.width / 2) / this.scaleFactor;
        var y = ((event.y / this.mainCanvas.offsetHeight * 500) -
            this.mainCanvas.height / 2) / this.scaleFactor;

        if (square(x) + square(y) > square(this.SELF_PLAYER.range)) { //if not in range
            return;
        }

        if (!this.pre) {
            this.pre = {x: x, y: y}
        }
        else if (square(this.pre.x - x) + square(this.pre.y - y) > 80) {
            this.pre = {x: x, y: y};

            if (Math.abs(x) < 50 && Math.abs(y) < 50) {
                x = 0;
                y = 0;
            }

            this.socket.emit('move', {
                id: this.SELF_ID,
                x: x,
                y: y
            });

            this.SELF_PLAYER.setMove(x, y);
        }
    }.bind(this));
};


Client.prototype.sendCircle = function (construct) {

    var radiiNormal = function (vector) {
        if (!vector) {
            return 0;
        }
        return (vector.x * vector.x + vector.y * vector.y);
    };

    var maxRadius = Math.sqrt(Math.max(
        radiiNormal(construct[0]),
        radiiNormal(construct[1]),
        radiiNormal(construct[2]),
        radiiNormal(construct[3])));

    if (maxRadius) {
        this.socket.emit("createCircle", {
            id: this.SELF_ID,
            radius: maxRadius
        });
    }
};

Client.prototype.initLists = function () {
    this.PLAYER_LIST = {};
    this.TILE_LIST = {};
    this.ROCK_LIST = {};
    this.ASTEROID_LIST = {};
    this.ANIMATION_LIST = {};

    this.PLAYER_ARRAY = [];
};
Client.prototype.initViewers = function () {
    this.keys = [];
    this.scaleFactor = 1;
    this.mainScaleFactor = 0.5;
    this.mainUI = new MainUI(this, this.socket);
    this.mainUI.playerNamerUI.open();
};

Client.prototype.verify = function (data) {
    if (!this.socket.verified) {
        console.log("VERIFIED CLIENT");
        this.socket.emit("verify", {});
        this.socket.verified = true;
    }
};


Client.prototype.applyUpdate = function (reader) {
    var rockLength = reader.readUInt16();

    for (i = 0; i < rockLength; i++) {
        rock = new Entity.Rock(reader, this);
        this.ROCK_LIST[rock.id] = rock;
    }


    var playerLength = reader.readUInt8();

    for (i = 0; i < playerLength; i++) {
        player = new Entity.Player(reader, this);
        this.PLAYER_LIST[player.id] = player;
    }

    var rock2Length = reader.readUInt16();


    for (i = 0; i < rock2Length; i++) {
        var id = reader.readUInt32();
        rock = this.ROCK_LIST[id];


        if (rock) {
            rock.update(reader);
        }
        else {
            console.log("FUCK YOU MATE " + id);

            var fakeRock = new Entity.Rock(null, this);
            fakeRock.update(reader);

            this.ROCK_LIST[id] = fakeRock;
        }
    }


    var player2Length = reader.readUInt8();
    for (i = 0; i < player2Length; i++) {
        id = reader.readUInt32();
        var player = this.PLAYER_LIST[id];
        if (player) {
            player.update(reader);
        }
    }

    var rock3Length = reader.readUInt16(); //delete rocks
    for (i = 0; i < rock3Length; i++) {
        id = reader.readUInt32();
        delete this.ROCK_LIST[id];

        //console.log("DELETED ROCK: " + id);
    }

    var player3Length = reader.readUInt8();
    for (i = 0; i < player3Length; i++) {
        id = reader.readUInt32();
        delete this.PLAYER_LIST[id];
    }
};


Client.prototype.handleBinary = function (data) {
    var reader = new BinaryReader(data);
    if (reader.length() < 1) {
        return;
    }

    var step = reader.readUInt32();

    if (!this.initialStep) {
        this.initialStep = step;
    }
    else if (this.initialStep === step) {
        return;
    }
    this.lastStep = step;


    //console.log("LAST STEP: " + step);


    if (!this.currStep) {
        this.currStep = step - 3;
    }

    this.updates.push({
        step: step,
        reader: reader
    });

    reader.step = step;
};


Client.prototype.handlePacket = function (data) {
    var packet, i;
    for (i = 0; i < data.length; i++) {
        packet = data[i];
        switch (packet.master) {
            case "add":
                this.addEntities(packet);
                break;
            case "delete":
                this.deleteEntities(packet);
                break;
            case "update":
                this.updateEntities(packet);
                break;
        }
    }
};


Client.prototype.addEntities = function (packet) {
    var addEntity = function (packet, list, entity, array) {
        if (!packet) {
            return;
        }
        list[packet.id] = new entity(packet, this);
        if (array && array.indexOf(packet.id) === -1) {
            array.push(packet.id);
        }
    }.bind(this);

    switch (packet.class) {
        case "tileInfo":
            addEntity(packet, this.TILE_LIST, Entity.Tile);
            break;
        case "playerInfo":
            //addEntity(packet, this.PLAYER_LIST, Entity.Player, this.PLAYER_ARRAY);
            break;
        case "animationInfo":
            if (packet.id === this.SELF_ID) {
                addEntity(packet, this.ANIMATION_LIST, Entity.Animation);
            }
            break;
        case "UIInfo":
            if (this.SELF_ID === packet.playerId) {
                this.mainUI.open(packet);
            }
            break;
        case "selfId":
            if (!this.SELF_ID) {
                this.SELF_ID = packet.selfId;
                this.mainUI.gameUI.open();
            }
            break;
        case "chatInfo":
            this.mainUI.gameUI.chatUI.addMessage(packet);
            break;
    }
};

Client.prototype.updateEntities = function (packet) {
    function updateEntity(packet, list) {
        if (!packet) {
            return;
        }
        var entity = list[packet.id];
        if (!entity) {
            return;
        }
        entity.update(packet);
    }

    switch (packet.class) {
        case "playerInfo":
            //updateEntity(packet, this.PLAYER_LIST);
            break;
        case "tileInfo":
            updateEntity(packet, this.TILE_LIST);
            break;
        case "UIInfo":
            if (this.SELF_ID === packet.playerId) {
                this.mainUI.update(packet);
            }
            break;
    }
};

Client.prototype.deleteEntities = function (packet) {
    var deleteEntity = function (packet, list, array) {
        if (!packet) {
            return;
        }
        if (array) {
            var index = array.indexOf(packet.id);
            array.splice(index, 1);
        }
        delete list[packet.id];
    };

    switch (packet.class) {
        case "tileInfo":
            deleteEntity(packet, this.TILE_LIST);
            break;
        case "playerInfo":
            //deleteEntity(packet, this.PLAYER_LIST, this.PLAYER_ARRAY);
            break;
        case "animationInfo":
            deleteEntity(packet, this.ANIMATION_LIST);
            break;
        case "UIInfo":
            if (this.SELF_ID === packet.id) {
                this.mainUI.close(packet.action);
            }
            break;
    }
};

Client.prototype.drawScene = function (data) {
    this.mainUI.updateLeaderBoard();

    var id;
    var entityList = [
        this.TILE_LIST,
        this.PLAYER_LIST,
        this.ASTEROID_LIST,
        this.ANIMATION_LIST,
        this.ROCK_LIST
    ];

    var inBounds = function (player, x, y) {
        var range = this.mainCanvas.width / (0.7 * this.scaleFactor);
        return x < (player.x + range) && x > (player.x - range)
            && y < (player.y + range) && y > (player.y - range);
    }.bind(this);

    var translateScene = function () {
        this.mainCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.scaleFactor = lerp(this.scaleFactor, this.mainScaleFactor, 0.3);
        this.mainCtx.translate(this.mainCanvas.width / 2, this.mainCanvas.height / 2);
        this.mainCtx.scale(this.scaleFactor, this.scaleFactor);
        this.mainCtx.translate(-this.SELF_PLAYER.x, -this.SELF_PLAYER.y);
    }.bind(this);


    this.SELF_PLAYER.tick();


    translateScene();
    this.mainCtx.clearRect(0, 0, 11000, 11000);

    this.mainCtx.fillStyle = "#1d1f21";
    this.mainCtx.fillRect(0, 0, 20000, 20000);


    for (var i = 0; i < entityList.length; i++) {
        var list = entityList[i];
        for (id in list) {
            var entity = list[id];
            if (inBounds(this.SELF_PLAYER, entity.x, entity.y)) {
                entity.show();
            }
        }
    }
    if (this.TRAIL && !this.active) {
        this.TRAIL.show();
    }
};

Client.prototype.clientUpdate = function () {
    this.updateStep();


    if (!this.SELF_PLAYER) {
        if (this.SELF_ID) {
            this.SELF_PLAYER = this.PLAYER_LIST[this.SELF_ID];
            return;
        }
        else {
            return;
        }
    }
    this.drawScene();
};

Client.prototype.updateStep = function () {
    var stepRange = this.lastStep - this.currStep;
    var update;

    if (!stepRange) {
        return;
    }
    //console.log(this.updates[0]);

    if (this.currStep < this.initialStep) {
        this.currStep += 1;
        return;
    }
    if (this.currStep > this.lastStep) {
        console.log("STEP RANGE TOO SMALL: SERVER TOO SLOW");
        return;
    } //too fast
    if (this.lastStep - this.currStep > 5 + this.currPing / 50) {
        console.log("STEP RANGE TOO LARGE: CLIENT IS TOO SLOW FOR STEP: " + this.currStep);
        update = this.findUpdatePacket(this.currStep);
        if (!update) {
            console.log("UPDATE NOT FOUND!!!!");
            this.currStep += 1;
            return;
        }
        if (update.reader._offset > 10) {
            console.log("OFFSET IS TOO LARGE");
            this.currStep += 1;
            return;
        }

        this.applyUpdate(update.reader);
        this.currStep += 1;
        this.updateStep();
        return;
    } //too slow

    update = this.findUpdatePacket(this.currStep);
    if (!update) {
        console.log("CANNOT FIND UPDATE FOR STEP: " + this.currStep);
        this.currStep += 1;
        return;
    }
    if (update.reader._offset > 10) {
        console.log("OFFSET IS TOO LARGE FOR STEP: " + this.currStep);
        console.log(this.updates[0]);
        this.currStep += 1;
        return;
    }
    this.applyUpdate(update.reader);
    this.currStep += 1;
};


Client.prototype.findUpdatePacket = function (step) {
    var length = this.updates.length;

    for (var i = length - 1; i >= 0; i--) {
        var update = this.updates[i];

        if (update.step === step) {
            this.updates.splice(0, i);
            return update;
        }
    }
    console.log('COULD NOT FIND PACKET FOR STEP: ' + step);
    console.log(this.updates[0]);
    console.log(this.updates[1]);
    console.log(this.updates[2]);


    return null;
};


Client.prototype.start = function () {
    setInterval(this.clientUpdate.bind(this), 1000 / 25);
};

function lerp(a, b, ratio) {
    return a + ratio * (b - a);
}


function square(a) {
    return a * a;
}

function vectorNormal(a) {
    return a.x * a.x + a.y * a.y;
}

module.exports = Client;
},{"./BinaryReader":1,"./entity":8,"./ui/MainUI":10}],3:[function(require,module,exports){
function Animation(animationInfo, client) {

    this.client = client;
    this.type = animationInfo.type;
    this.id = animationInfo.id;
    this.x = animationInfo.x;
    this.y = animationInfo.y;
    //this.theta = 15;
    this.timer = getRandom(10, 14);

    if (this.type === "slash") {
        this.slashId = animationInfo.slashId;
        var slash = this.client.findSlash(this.slashId);
        this.pre = slash[0];
        this.post = slash[1];
    }
}


Animation.prototype.show = function () {
    var ctx = this.client.mainCtx;
    var player = this.client.SELF_PLAYER;

    if (this.type === "slash" && player) {
        ctx.beginPath();

        ctx.strokeStyle = "rgba(242, 31, 66, 0.6)";
        ctx.lineWidth = 15;

        ctx.moveTo(player.x + this.pre.x, player.y + this.pre.y);
        ctx.lineTo(player.x + this.post.x, player.y + this.post.y);

        ctx.stroke();
        ctx.closePath();
    }
    

    if (this.type === "shardDeath") { //deprecated but could pull some good code from here
        ctx.font = 60 - this.timer + "px Arial";
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(-Math.PI / 50 * this.theta);
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255, 168, 86, " + this.timer * 10 / 100 + ")";
        ctx.fillText(this.name, 0, 15);
        ctx.restore();

        ctx.fillStyle = "#000000";
        this.theta = lerp(this.theta, 0, 0.08);
        this.x = lerp(this.x, this.endX, 0.1);
        this.y = lerp(this.y, this.endY, 0.1);
    }


    this.timer--;
    if (this.timer <= 0) {
        delete this.client.ANIMATION_LIST[this.id];
    }
};


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

function lerp(a, b, ratio) {
    return a + ratio * (b - a);
}

module.exports = Animation;



},{}],4:[function(require,module,exports){
function MiniMap() { //deprecated, please update
}

MiniMap.prototype.draw = function () {
    if (mapTimer <= 0 || serverMap === null) {
        var tileLength = Math.sqrt(Object.size(TILE_LIST));
        if (tileLength === 0 || !selfPlayer) {
            return;
        }
        var imgData = mainCtx.createImageData(tileLength, tileLength);
        var tile;
        var tileRGB;
        var i = 0;


        for (var id in TILE_LIST) {
            tileRGB = {};
            tile = TILE_LIST[id];
            if (tile.color && tile.alert || inBounds(selfPlayer, tile.x, tile.y)) {
                tileRGB.r = tile.color.r;
                tileRGB.g = tile.color.g;
                tileRGB.b = tile.color.b;
            }
            else {
                tileRGB.r = 0;
                tileRGB.g = 0;
                tileRGB.b = 0;
            }

            imgData.data[i] = tileRGB.r;
            imgData.data[i + 1] = tileRGB.g;
            imgData.data[i + 2] = tileRGB.b;
            imgData.data[i + 3] = 255;
            i += 4;
        }
        console.log(400 / Object.size(TILE_LIST));
        imgData = scaleImageData(imgData, Math.floor(400 / Object.size(TILE_LIST)), mainCtx);

        mMapCtx.putImageData(imgData, 0, 0);

        mMapCtxRot.rotate(90 * Math.PI / 180);
        mMapCtxRot.scale(1, -1);
        mMapCtxRot.drawImage(mMap, 0, 0);
        mMapCtxRot.scale(1, -1);
        mMapCtxRot.rotate(270 * Math.PI / 180);

        serverMap = mMapRot;
        mapTimer = 25;
    }

    else {
        mapTimer -= 1;
    }

    mainCtx.drawImage(serverMap, 800, 400);
}; //deprecated

MiniMap.prototype.scaleImageData = function (imageData, scale, mainCtx) {
    var scaled = mainCtx.createImageData(imageData.width * scale, imageData.height * scale);
    var subLine = mainCtx.createImageData(scale, 1).data;
    for (var row = 0; row < imageData.height; row++) {
        for (var col = 0; col < imageData.width; col++) {
            var sourcePixel = imageData.data.subarray(
                (row * imageData.width + col) * 4,
                (row * imageData.width + col) * 4 + 4
            );
            for (var x = 0; x < scale; x++) subLine.set(sourcePixel, x * 4)
            for (var y = 0; y < scale; y++) {
                var destRow = row * scale + y;
                var destCol = col * scale;
                scaled.data.set(subLine, (destRow * scaled.width + destCol) * 4)
            }
        }
    }

    return scaled;
};

module.exports = MiniMap;
},{}],5:[function(require,module,exports){
function Player(reader, client) {
    this.id = reader.readUInt32(); //player id
    this.x = reader.readUInt32() / 100; //real x
    this.y = reader.readUInt32() / 100; //real y

    this.radius = reader.readUInt16(); //radius
    this.name = reader.readUInt32(); //name

    this.vertices = [];            //vertices
    var count = reader.readUInt8();
    for (var i = 0; i < count; i++) {
        this.vertices[i] = [];
        this.vertices[i][0] = reader.readInt16() / 1000;
        this.vertices[i][1] = reader.readInt16() / 1000;
    }
    console.log("PLAYER VERTICES COUNT: " + count);

    this.health = reader.readUInt8(); //health
    this.maxHealth = reader.readUInt8(); //maxHealth

    this.theta = reader.readInt16() / 100; //theta
    this.level = reader.readUInt8(); //level

    switch (reader.readUInt8()) {    //flags
        case 1:
            this.vulnerable = true;
            break;
        case 16:
            this.shooting = true;
            break;
        case 17:
            this.vulnerable = true;
            this.shooting = true;
            break;
    }

    this.client = client;

    if (!this.client.SELF_PLAYER && this.id === this.client.SELF_ID) {
        this.client.SELF_PLAYER = this;
    }

    this.collisionTimer = 0;

    this.mover = {
        x: 0,
        y: 0
    };

    this.realMover = {
        x: 0,
        y: 0
    };
}


Player.prototype.update = function (reader) {
    this.x = reader.readUInt32() / 100; //real x
    this.y = reader.readUInt32() / 100; //real y

    this.radius = reader.readUInt16(); //radius
    this.name = reader.readInt32(); //name

    this.health = reader.readUInt8(); //health
    this.maxHealth = reader.readUInt8(); //maxHealth

    this.theta = reader.readInt16() / 100; //theta
    this.level = reader.readUInt8(); //level

    var flags = reader.readUInt16();

    this.shooting = Number(String(flags).charAt(0)) === 1;
    this.vulnerable = Number(String(flags).charAt(1)) === 1;
    this.colliding = Number(String(flags).charAt(2)) === 1;

};


Player.prototype.tick = function () {
    if (this.realMover) {
        this.mover.x = lerp(this.mover.x, this.realMover.x, 0.15);
        this.mover.y = lerp(this.mover.y, this.realMover.y, 0.15);
    }
    //this.move(this.mover.x, this.mover.y);
};


Player.prototype.setMove = function (x, y) {
    this.realMover = {
        x: x,
        y: y
    };
};


Player.prototype.getTheta = function (target, origin) {
    this.theta = Math.atan2(target.y - origin.y, target.x - origin.x) % (2 * Math.PI);
};

Player.prototype.move = function (x, y) {
    var target = {
        x: this.x + x,
        y: this.y + y
    };
    var origin = {
        x: this.x,
        y: this.y
    };

    this.getTheta(target, origin);


    var normalVel = normal(x, y);
    if (normalVel < 1) {
        normalVel = 1;
    }

    var velBuffer = 3; //change soon

    this.x += 100 * x / normalVel / velBuffer;
    this.y += 100 * y / normalVel / velBuffer;

};


Player.prototype.show = function () {
    var ctx = this.client.mainCtx;
    var selfId = this.client.SELF_ID;
    var fillAlpha;
    var strokeAlpha;
    var i;


    fillAlpha = this.health / (4 * this.maxHealth);
    strokeAlpha = 1;

    ctx.font = "20px Arial";


    ctx.strokeStyle = "rgba(252, 102, 37," + strokeAlpha + ")";
    if (this.shooting) {
        ctx.fillStyle = "green";
    }
    else if (this.vulnerable) {
        ctx.fillStyle = "red";
    }
    else {
        ctx.fillStyle = "rgba(123,0,0," + fillAlpha + ")";
    }
    ctx.lineWidth = 10;


    ctx.beginPath();

    ctx.translate(this.x, this.y);
    ctx.rotate(this.theta);

    if (this.vertices) {
        var v = this.vertices;
        ctx.moveTo(v[0][0] * this.radius, v[0][1] * this.radius);
        for (i = 1; i < v.length; i++) {
            ctx.lineTo(v[i][0] * this.radius, v[i][1] * this.radius);
        }
        ctx.lineTo(v[0][0] * this.radius, v[0][1] * this.radius);
        ctx.fill();
        ctx.stroke();
    }
    ctx.fill();
    ctx.stroke();

    ctx.rotate(2 * Math.PI - this.theta);


    if (!this.vulnerable) {
        ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
        ctx.arc(0, 0, this.radius * 2, 0, 2 * Math.PI);
        ctx.fill();
    }

    ctx.translate(-this.x, -this.y);


    ctx.closePath();


    if (1 === 3) {
        var radius = this.radius;
        ctx.beginPath();
        ctx.moveTo(this.x + radius, this.y);
        var theta, x, y;
        for (i = Math.PI / 4; i <= 2 * Math.PI - Math.PI / 4; i += Math.PI / 4) {
            theta = i;
            x = radius * Math.cos(theta);
            y = radius * Math.sin(theta);
            ctx.lineTo(this.x + x, this.y + y);
        }
        ctx.lineTo(this.x + radius, this.y + 3);
        ctx.stroke();
        ctx.fill();
    }


    ctx.fillStyle = "#ff9d60";
    ctx.fillText(this.name, this.x, this.y + 70);


    if (this.health && this.maxHealth && this.health > 0) { //health bar
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.strokeStyle = "black";
        ctx.rect(this.x, this.y, 100, 20);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.fillStyle = "green";
        ctx.rect(this.x, this.y, 100 * this.health / this.maxHealth, 20);
        ctx.fill();
        ctx.closePath();
    } //display health bar


    ctx.closePath();
};


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}


function normal(x, y) {
    return Math.sqrt(x * x + y * y);
}

function lerp(a, b, ratio) {
    return a + ratio * (b - a);
}


module.exports = Player;
},{}],6:[function(require,module,exports){
function Rock(reader, client) {
    if (!reader) {
        console.log("MAKING NEW FAKE ROCK");
        this.client = client;
        return; //for fake rock purposes
    }
    var prev = reader._offset;


    this.id = reader.readUInt32();
    //console.log("NEW ROCK: " + this.id);

    this.owner = reader.readUInt32();
    this.x = reader.readUInt32() / 100;
    this.y = reader.readUInt32() / 100;

    this.vertices = [];
    var count = reader.readUInt16();
    //console.log("COUNT: " + count);
    for (var i = 0; i < count; i++) {
        this.vertices[i] = [];
        this.vertices[i][0] = reader.readInt16() / 1000;
        this.vertices[i][1] = reader.readInt16() / 1000;
    }

    this.health = reader.readInt16();
    this.maxHealth = reader.readInt16();

    this.theta = reader.readInt16() / 100;
    this.texture = reader.readUInt8();

    switch (reader.readUInt8()) {
        case 1:
            this.neutral = true;
            break;
        case 16:
            this.fast = true;
            break;
        case 17:
            this.neutral = true;
            this.fast = true;
            break;
    }
    var delta = reader._offset - prev;
    //console.log("DELTA: " + delta);

    this.updates = [];

    this.client = client;
}


Rock.prototype.update = function (reader) {
    this.updateTimer = 50;

    this.owner = reader.readUInt32();
    this.x = reader.readUInt32() / 100;
    this.y = reader.readUInt32() / 100;

    this.health = reader.readInt16();
    this.maxHealth = reader.readInt16();

    this.theta = reader.readInt16() / 100;

    this.neutral = false;
    this.fast = false;
    switch (reader.readUInt8()) { //flags
        case 1:
            this.neutral = true;
            break;
        case 16:
            this.fast = true;
            break;
        case 17:
            this.neutral = true;
            this.fast = true;
            break;
    }
};


Rock.prototype.show = function () {
    this.updateTimer -= 1;

    if (this.updateTimer <= 0) {
        delete this.client.ROCK_LIST[this.id];
        return;
    }

    var ctx = this.client.mainCtx;
    var SCALE = 100;


    ctx.fillStyle = "pink"; //default color
    switch (this.texture) {
        case 1:
            ctx.fillStyle = "brown";
            break;
        case 2:
            ctx.fillStyle = "grey";
            break;
        case 3:
            ctx.fillStyle = "yellow";
            break;
        case 4:
            ctx.fillStyle = "green";
            break;
    }


    ctx.strokeStyle = !this.owner ? "blue" : "green";
    ctx.strokeStyle = this.fast ? "red" : ctx.strokeStyle;


    ctx.beginPath();

    ctx.translate(this.x, this.y);
    ctx.rotate(this.theta);

    if (this.vertices) {
        var v = this.vertices;
        ctx.moveTo(v[0][0] * SCALE, v[0][1] * SCALE);

        for (var i = 1; i < v.length; i++) {
            ctx.lineTo(v[i][0] * SCALE, v[i][1] * SCALE);
        }
        ctx.lineTo(v[0][0] * SCALE, v[0][1] * SCALE);
    }
    else {
        ctx.fillRect(0, 0, 30, 30);
    }

    ctx.fill();
    ctx.stroke();

    ctx.rotate(2 * Math.PI - this.theta);
    ctx.translate(-this.x, -this.y);

    ctx.closePath();

    if (this.health && this.maxHealth && this.health > 0) { //health bar
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.strokeStyle = "black";
        ctx.rect(this.x, this.y, 100, 20);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.fillStyle = "green";
        ctx.rect(this.x, this.y, 100 * this.health / this.maxHealth, 20);
        ctx.fill();
        ctx.closePath();
    } //display health bar
};


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

module.exports = Rock;
},{}],7:[function(require,module,exports){
function Tile(thisInfo, client) {
    this.id = thisInfo.id;
    this.x = thisInfo.x;
    this.y = thisInfo.y;
    this.length = thisInfo.length;
    this.color = thisInfo.color;
    this.topColor = {
        r: this.color.r + 10,
        g: this.color.g + 10,
        b: this.color.b + 10
    };
    this.borderColor = {
        r: this.color.r - 10,
        g: this.color.g - 10,
        b: this.color.b - 10
    };
    this.alert = thisInfo.alert;
    this.random = Math.floor(getRandom(0, 3));

    this.client = client;
}

Tile.prototype.update = function (thisInfo) {
    this.color = thisInfo.color;
    this.topColor = {
        r: this.color.r + 100,
        g: this.color.g + 100,
        b: this.color.b + 100
    };
    this.borderColor = {
        r: this.color.r - 10,
        g: this.color.g - 10,
        b: this.color.b - 10
    };
    this.alert = thisInfo.alert;
};

Tile.prototype.show = function () {
    var ctx = this.client.mainCtx;
    ctx.beginPath();

    ctx.strokeStyle = "rgb(" + this.borderColor.r + "," + this.borderColor.g + "," + this.borderColor.b + ")";
    ctx.lineWidth = 20;


    var grd = ctx.createLinearGradient(this.x + this.length * 3/4, this.y, this.x + this.length/4, this.y + this.length);
    grd.addColorStop(0, "rgb(" + this.topColor.r + "," + this.topColor.g + "," + this.topColor.b + ")");
    grd.addColorStop(1, "rgb(" + this.color.r + "," + this.color.g + "," + this.color.b + ")");
    ctx.fillStyle = grd;


    ctx.rect(this.x + 30, this.y + 30, this.length - 30, this.length - 30);

    ctx.stroke();
    ctx.fill();


};


module.exports = Tile;


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}
},{}],8:[function(require,module,exports){
module.exports = {
    Animation: require('./Animation'),
    Player: require('./Player'),
    MiniMap: require('./MiniMap'),
    Tile: require('./Tile'),
    Rock: require('./Rock')
};
},{"./Animation":3,"./MiniMap":4,"./Player":5,"./Rock":6,"./Tile":7}],9:[function(require,module,exports){
var Client = require('./Client.js');
var MainUI = require('./ui/MainUI');

var client = new Client();
client.start();



document.onkeydown = function (event) {
    client.keys[event.keyCode] = true;

    if (event.keyCode === 32) {
        console.log("SPACE");
        client.socket.emit("shootSelf", {
            id: client.SELF_ID
        });
    }
}.bind(this);

document.onkeyup = function (event) {
    if (event.keyCode === 84) {
        client.mainUI.gameUI.chatUI.textInput.click();
    }
    client.keys[event.keyCode] = false;
    client.socket.emit('keyEvent', {id: event.keyCode, state: false});
};


$(window).bind('mousewheel DOMMouseScroll', function (event) {
    if (event.ctrlKey === true) {
        event.preventDefault();
    }
    if (client.CHAT_SCROLL) {
        client.CHAT_SCROLL = false;
        return;
    }

    if(event.originalEvent.wheelDelta /120 > 0 && client.mainScaleFactor < 2) {
        client.mainScaleFactor += 0.05;
    }
    else if (client.mainScaleFactor > 0.25) {
        client.mainScaleFactor -= 0.05;
    }
});

document.addEventListener('contextmenu', function (e) { //prevent right-click context menu
    e.preventDefault();
}, false);
},{"./Client.js":2,"./ui/MainUI":10}],10:[function(require,module,exports){
document.documentElement.style.overflow = 'hidden';  // firefox, chrome
document.body.scroll = "no";

var PlayerNamerUI = require('./PlayerNamerUI');
var GameUI = require('./game/GameUI');

function MainUI(client, socket) {
    this.client = client;
    this.socket = socket;

    this.gameUI = new GameUI(this.client, this.socket, this);

    this.playerNamerUI = new PlayerNamerUI(this.client, this.socket);
}

MainUI.prototype.open = function (info) {
    var action = info.action;
    var home;
    if (action === "gameMsgPrompt") {
        this.gameUI.gameMsgPrompt.open(info.message);
    }
};


MainUI.prototype.close = function (action) {
    if (action === "gameMsgPrompt") {
        this.gameUI.gameMsgPrompt.close();
    }
};


MainUI.prototype.updateLeaderBoard = function () {
    var leaderboard = document.getElementById("leaderboard");
    var PLAYER_ARRAY = this.client.PLAYER_ARRAY;


    var playerSort = function (a, b) {
        var playerA = this.client.PLAYER_LIST[a];
        var playerB = this.client.PLAYER_LIST[b];
        return playerA.radius - playerB.radius;
    }.bind(this);

    PLAYER_ARRAY.sort(playerSort);


    leaderboard.innerHTML = "";
    for (var i = PLAYER_ARRAY.length - 1; i >= 0; i--) {
        var player = this.client.PLAYER_LIST[PLAYER_ARRAY[i]];
        var entry = document.createElement('li');
        entry.appendChild(document.createTextNode(player.name + " - " + player.radius));
        leaderboard.appendChild(entry);
    }
};



module.exports = MainUI;
},{"./PlayerNamerUI":11,"./game/GameUI":14}],11:[function(require,module,exports){
function PlayerNamerUI (client, socket) {
    this.client = client;
    this.socket = socket;

    this.leaderboard = document.getElementById("leaderboard_container");
    this.nameBtn = document.getElementById("nameSubmit");
    this.playerNameInput = document.getElementById("playerNameInput");
    this.playerNamer = document.getElementById("player_namer");
}

PlayerNamerUI.prototype.open = function () {
    this.playerNameInput.addEventListener("keyup", function (event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            this.nameBtn.click();
        }
    }.bind(this));

    this.nameBtn.addEventListener("click", function () {
        this.client.mainCanvas.style.visibility = "visible";
        this.leaderboard.style.visibility = "visible";
        this.socket.emit("newPlayer",
            {
                name: this.playerNameInput.value,
            });
        this.playerNamer.style.display = 'none';
    }.bind(this));

    this.playerNamer.style.visibility = "visible";
    this.playerNameInput.focus();
    this.leaderboard.style.visibility = "hidden";
};

module.exports = PlayerNamerUI;
},{}],12:[function(require,module,exports){
function ChatUI(parent) {
    this.parent = parent;
    this.template = document.getElementById("chat_container");
    this.textInput = document.getElementById('chat_input');
    this.chatList = document.getElementById('chat_list');


    this.textInput.addEventListener('click', function () {
        this.textInput.focus();

        this.parent.client.CHAT_OPEN = true;
        this.chatList.style.height = "80%";
        this.chatList.style.overflowY = "auto";

        this.textInput.style.background = "rgba(34, 48, 71, 1)";
    }.bind(this));
    this.textInput.addEventListener('keydown', function (e) {
        if (e.keyCode === 13) {
            this.sendMessage();
        }
    }.bind(this));


    this.template.addEventListener('mousewheel', function () {
        this.parent.client.CHAT_SCROLL = true;
    }.bind(this));

    this.template.addEventListener('mousedown', function () {
        this.parent.client.CHAT_CLICK = true;
    }.bind(this));
}

ChatUI.prototype.open = function (message) {
    this.template.style.display = "block";
    this.close();
};


ChatUI.prototype.close = function () {
    this.textInput.blur();
    this.parent.client.CHAT_OPEN = false;
    this.chatList.style.height = "30%";
    this.chatList.style.background = "rgba(182, 193, 211, 0.02)";
    this.textInput.style.background = "rgba(182, 193, 211, 0.1)";
    this.parent.client.CHAT_SCROLL = false;
    $('#chat_list').animate({scrollTop: $('#chat_list').prop("scrollHeight")}, 100);
    this.chatList.style.overflowY = "none";
};


ChatUI.prototype.addMessage = function (packet) {
    var entry = document.createElement('li');
    entry.appendChild(document.createTextNode(packet.name + " : " + packet.chatMessage));
    this.chatList.appendChild(entry);

    $('#chat_list').animate({scrollTop: $('#chat_list').prop("scrollHeight")}, 100);
};


ChatUI.prototype.sendMessage = function () {
    var socket = this.parent.socket;


    if (this.textInput.value && this.textInput.value !== "") {
        socket.emit('chatMessage', {
            id: this.parent.client.SELF_ID,
            message: this.textInput.value
        });
        this.textInput.value = "";
    }
    this.close();
};

module.exports = ChatUI;



},{}],13:[function(require,module,exports){
function GameMsgPrompt(parent) {
    this.parent = parent;
    this.template = document.getElementById("prompt_container");
    this.message = document.getElementById('game_msg_prompt');
}

GameMsgPrompt.prototype.open = function (message) {
    this.template.style.display = "block";
    this.message.innerHTML = message;
};

GameMsgPrompt.prototype.close = function () {
    this.template.style.display = "none";
};

module.exports = GameMsgPrompt;



},{}],14:[function(require,module,exports){
var GameMsgPrompt = require('./GameMsgPrompt');
var ChatUI = require('./ChatUI');

function GameUI(client, socket, parent) {
    this.client = client;
    this.socket = socket;
    this.parent = parent;
    this.gameMsgPrompt = new GameMsgPrompt(this);
    this.chatUI = new ChatUI(this);
}

GameUI.prototype.open = function () {
    console.log("OPENING GAME UI");
    this.chatUI.open();
};

module.exports =  GameUI;
},{"./ChatUI":12,"./GameMsgPrompt":13}]},{},[9])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2xpZW50L2pzL0JpbmFyeVJlYWRlci5qcyIsInNyYy9jbGllbnQvanMvQ2xpZW50LmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvQW5pbWF0aW9uLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvTWluaU1hcC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L1BsYXllci5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L1JvY2suanMiLCJzcmMvY2xpZW50L2pzL2VudGl0eS9UaWxlLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvaW5kZXguanMiLCJzcmMvY2xpZW50L2pzL2luZGV4LmpzIiwic3JjL2NsaWVudC9qcy91aS9NYWluVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL1BsYXllck5hbWVyVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvQ2hhdFVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9nYW1lL0dhbWVNc2dQcm9tcHQuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvR2FtZVVJLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RpQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiZnVuY3Rpb24gQmluYXJ5UmVhZGVyKGRhdGEpIHtcclxuICAgIHRoaXMuX29mZnNldCA9IDA7XHJcbiAgICB0aGlzLl9idWZmZXIgPSBuZXcgRGF0YVZpZXcoZGF0YSk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQmluYXJ5UmVhZGVyO1xyXG5cclxuXHJcbkJpbmFyeVJlYWRlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9idWZmZXIuZ2V0SW50OCh0aGlzLl9vZmZzZXQpO1xyXG4gICAgdGhpcy5fb2Zmc2V0ICs9IDE7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn07XHJcblxyXG5CaW5hcnlSZWFkZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB2YWx1ZSA9IHRoaXMuX2J1ZmZlci5nZXRVaW50OCh0aGlzLl9vZmZzZXQpO1xyXG4gICAgdGhpcy5fb2Zmc2V0ICs9IDE7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn07XHJcblxyXG5cclxuQmluYXJ5UmVhZGVyLnByb3RvdHlwZS5yZWFkSW50MTYgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9idWZmZXIuZ2V0SW50MTYodGhpcy5fb2Zmc2V0KTtcclxuICAgIHRoaXMuX29mZnNldCArPSAyO1xyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG59O1xyXG5cclxuQmluYXJ5UmVhZGVyLnByb3RvdHlwZS5yZWFkVUludDE2ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHZhbHVlID0gdGhpcy5fYnVmZmVyLmdldFVpbnQxNih0aGlzLl9vZmZzZXQpO1xyXG4gICAgdGhpcy5fb2Zmc2V0ICs9IDI7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn07XHJcblxyXG5cclxuXHJcbkJpbmFyeVJlYWRlci5wcm90b3R5cGUucmVhZEludDMyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHZhbHVlID0gdGhpcy5fYnVmZmVyLmdldEludDMyKHRoaXMuX29mZnNldCk7XHJcbiAgICB0aGlzLl9vZmZzZXQgKz0gNDtcclxuICAgIHJldHVybiB2YWx1ZTtcclxufTtcclxuXHJcblxyXG5CaW5hcnlSZWFkZXIucHJvdG90eXBlLnJlYWRVSW50MzIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9idWZmZXIuZ2V0VWludDMyKHRoaXMuX29mZnNldCk7XHJcbiAgICB0aGlzLl9vZmZzZXQgKz0gNDtcclxuICAgIHJldHVybiB2YWx1ZTtcclxufTtcclxuXHJcbkJpbmFyeVJlYWRlci5wcm90b3R5cGUuc2tpcEJ5dGVzID0gZnVuY3Rpb24gKGxlbmd0aCkge1xyXG4gICAgdGhpcy5fb2Zmc2V0ICs9IGxlbmd0aDtcclxufTtcclxuXHJcbkJpbmFyeVJlYWRlci5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2J1ZmZlci5ieXRlTGVuZ3RoO1xyXG59O1xyXG5cclxuIiwidmFyIEVudGl0eSA9IHJlcXVpcmUoJy4vZW50aXR5Jyk7XHJcbnZhciBNYWluVUkgPSByZXF1aXJlKCcuL3VpL01haW5VSScpO1xyXG52YXIgQmluYXJ5UmVhZGVyID0gcmVxdWlyZSgnLi9CaW5hcnlSZWFkZXInKTtcclxuXHJcbmZ1bmN0aW9uIENsaWVudCgpIHtcclxuICAgIHRoaXMuU0VMRl9JRCA9IG51bGw7XHJcbiAgICB0aGlzLlNFTEZfUExBWUVSID0gbnVsbDtcclxuICAgIHRoaXMuVFJBSUwgPSBudWxsO1xyXG4gICAgdGhpcy51cGRhdGVzID0gW107XHJcblxyXG4gICAgdGhpcy5jdXJyUGluZyA9IDA7XHJcblxyXG4gICAgdGhpcy5pbml0KCk7XHJcbn1cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuaW5pdFNvY2tldCgpO1xyXG4gICAgdGhpcy5pbml0Q2FudmFzZXMoKTtcclxuICAgIHRoaXMuaW5pdExpc3RzKCk7XHJcbiAgICB0aGlzLmluaXRWaWV3ZXJzKCk7XHJcbn07XHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdFNvY2tldCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuc29ja2V0ID0gaW8oKTtcclxuICAgIHRoaXMuc29ja2V0LnZlcmlmaWVkID0gZmFsc2U7XHJcblxyXG4gICAgdGhpcy5zb2NrZXQub24oJ2luaXRWZXJpZmljYXRpb24nLCB0aGlzLnZlcmlmeS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB0aGlzLnNvY2tldC5vbigndXBkYXRlRW50aXRpZXMnLCB0aGlzLmhhbmRsZVBhY2tldC5iaW5kKHRoaXMpKTtcclxuICAgIHRoaXMuc29ja2V0Lm9uKCd1cGRhdGVCaW5hcnknLCB0aGlzLmhhbmRsZUJpbmFyeS5iaW5kKHRoaXMpKTtcclxuXHJcblxyXG4gICAgdGhpcy5zb2NrZXQub24oJ2NoYXRNZXNzYWdlJywgdGhpcy5tYWluVUkpO1xyXG4gICAgdGhpcy5zb2NrZXQub24oJ3BpbmcnLCB0aGlzLnNlbmRQb25nLmJpbmQodGhpcykpO1xyXG4gICAgdGhpcy5zb2NrZXQub24oJ2ZpbmFsUGluZycsIGZ1bmN0aW9uIChtZXNzYWdlKSB7XHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIlBJTkc6IFwiICsgbWVzc2FnZSk7XHJcbiAgICAgICAgdGhpcy5jdXJyUGluZyA9IG1lc3NhZ2U7XHJcbiAgICAgICAgaWYgKHRoaXMuY3VyclBpbmcgPiA5MDAwMCkge1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJQaW5nID0gMTA7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG5cclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuc2VuZFBvbmcgPSBmdW5jdGlvbiAobWVzc2FnZSkge1xyXG4gICAgdGhpcy5zb2NrZXQuZW1pdChcInBvbmcxMjNcIiwgbWVzc2FnZSk7XHJcbn07XHJcblxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5pbml0Q2FudmFzZXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLm1haW5DYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1haW5fY2FudmFzXCIpO1xyXG4gICAgdGhpcy5tYWluQ2FudmFzLnN0eWxlLmJvcmRlciA9ICcxcHggc29saWQgIzAwMDAwMCc7XHJcbiAgICB0aGlzLm1haW5DYW52YXMuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICB0aGlzLm1haW5DdHggPSB0aGlzLm1haW5DYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG5cclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGlmICghdGhpcy5TRUxGX0lEKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHggPSAoKGV2ZW50LnggLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0V2lkdGggKiAxMDAwKSAtIHRoaXMubWFpbkNhbnZhcy53aWR0aCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvcjtcclxuICAgICAgICB2YXIgeSA9ICgoZXZlbnQueSAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRIZWlnaHQgKiA1MDApIC0gdGhpcy5tYWluQ2FudmFzLmhlaWdodCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvcjtcclxuXHJcblxyXG4gICAgICAgIGlmIChNYXRoLmFicyh4KSArIE1hdGguYWJzKHkpIDwgMjAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGxheWVyQ2xpY2tlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuY2lyY2xlQ29uc3RydWN0ID0gW107XHJcbiAgICAgICAgICAgIHRoaXMuY2lyY2xlU3RhZ2VDb3VudCA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmNsaWNrVGVtcCA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuY2xpY2tUaW1lciA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGlmICghdGhpcy5TRUxGX0lEKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHggPSAoKGV2ZW50LnggLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0V2lkdGggKiAxMDAwKSAtIHRoaXMubWFpbkNhbnZhcy53aWR0aCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvcjtcclxuICAgICAgICB2YXIgeSA9ICgoZXZlbnQueSAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRIZWlnaHQgKiA1MDApIC0gdGhpcy5tYWluQ2FudmFzLmhlaWdodCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvcjtcclxuXHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcInNob290U2VsZlwiLCB7XHJcbiAgICAgICAgICAgIGlkOiB0aGlzLlNFTEZfSUQsXHJcbiAgICAgICAgICAgIHg6IHgsXHJcbiAgICAgICAgICAgIHk6IHlcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5jbGlja1RlbXAgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmNsaWNrVGltZXIgPSAwO1xyXG5cclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLlNFTEZfUExBWUVSKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciB4ID0gKChldmVudC54IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldFdpZHRoICogMTAwMCkgLVxyXG4gICAgICAgICAgICB0aGlzLm1haW5DYW52YXMud2lkdGggLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcbiAgICAgICAgdmFyIHkgPSAoKGV2ZW50LnkgLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0SGVpZ2h0ICogNTAwKSAtXHJcbiAgICAgICAgICAgIHRoaXMubWFpbkNhbnZhcy5oZWlnaHQgLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcblxyXG4gICAgICAgIGlmIChzcXVhcmUoeCkgKyBzcXVhcmUoeSkgPiBzcXVhcmUodGhpcy5TRUxGX1BMQVlFUi5yYW5nZSkpIHsgLy9pZiBub3QgaW4gcmFuZ2VcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLnByZSkge1xyXG4gICAgICAgICAgICB0aGlzLnByZSA9IHt4OiB4LCB5OiB5fVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChzcXVhcmUodGhpcy5wcmUueCAtIHgpICsgc3F1YXJlKHRoaXMucHJlLnkgLSB5KSA+IDgwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHJlID0ge3g6IHgsIHk6IHl9O1xyXG5cclxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKHgpIDwgNTAgJiYgTWF0aC5hYnMoeSkgPCA1MCkge1xyXG4gICAgICAgICAgICAgICAgeCA9IDA7XHJcbiAgICAgICAgICAgICAgICB5ID0gMDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5zb2NrZXQuZW1pdCgnbW92ZScsIHtcclxuICAgICAgICAgICAgICAgIGlkOiB0aGlzLlNFTEZfSUQsXHJcbiAgICAgICAgICAgICAgICB4OiB4LFxyXG4gICAgICAgICAgICAgICAgeTogeVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuU0VMRl9QTEFZRVIuc2V0TW92ZSh4LCB5KTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuc2VuZENpcmNsZSA9IGZ1bmN0aW9uIChjb25zdHJ1Y3QpIHtcclxuXHJcbiAgICB2YXIgcmFkaWlOb3JtYWwgPSBmdW5jdGlvbiAodmVjdG9yKSB7XHJcbiAgICAgICAgaWYgKCF2ZWN0b3IpIHtcclxuICAgICAgICAgICAgcmV0dXJuIDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiAodmVjdG9yLnggKiB2ZWN0b3IueCArIHZlY3Rvci55ICogdmVjdG9yLnkpO1xyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgbWF4UmFkaXVzID0gTWF0aC5zcXJ0KE1hdGgubWF4KFxyXG4gICAgICAgIHJhZGlpTm9ybWFsKGNvbnN0cnVjdFswXSksXHJcbiAgICAgICAgcmFkaWlOb3JtYWwoY29uc3RydWN0WzFdKSxcclxuICAgICAgICByYWRpaU5vcm1hbChjb25zdHJ1Y3RbMl0pLFxyXG4gICAgICAgIHJhZGlpTm9ybWFsKGNvbnN0cnVjdFszXSkpKTtcclxuXHJcbiAgICBpZiAobWF4UmFkaXVzKSB7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcImNyZWF0ZUNpcmNsZVwiLCB7XHJcbiAgICAgICAgICAgIGlkOiB0aGlzLlNFTEZfSUQsXHJcbiAgICAgICAgICAgIHJhZGl1czogbWF4UmFkaXVzXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmluaXRMaXN0cyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuUExBWUVSX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuVElMRV9MSVNUID0ge307XHJcbiAgICB0aGlzLlJPQ0tfTElTVCA9IHt9O1xyXG4gICAgdGhpcy5BU1RFUk9JRF9MSVNUID0ge307XHJcbiAgICB0aGlzLkFOSU1BVElPTl9MSVNUID0ge307XHJcblxyXG4gICAgdGhpcy5QTEFZRVJfQVJSQVkgPSBbXTtcclxufTtcclxuQ2xpZW50LnByb3RvdHlwZS5pbml0Vmlld2VycyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMua2V5cyA9IFtdO1xyXG4gICAgdGhpcy5zY2FsZUZhY3RvciA9IDE7XHJcbiAgICB0aGlzLm1haW5TY2FsZUZhY3RvciA9IDAuNTtcclxuICAgIHRoaXMubWFpblVJID0gbmV3IE1haW5VSSh0aGlzLCB0aGlzLnNvY2tldCk7XHJcbiAgICB0aGlzLm1haW5VSS5wbGF5ZXJOYW1lclVJLm9wZW4oKTtcclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUudmVyaWZ5ID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgIGlmICghdGhpcy5zb2NrZXQudmVyaWZpZWQpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlZFUklGSUVEIENMSUVOVFwiKTtcclxuICAgICAgICB0aGlzLnNvY2tldC5lbWl0KFwidmVyaWZ5XCIsIHt9KTtcclxuICAgICAgICB0aGlzLnNvY2tldC52ZXJpZmllZCA9IHRydWU7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5hcHBseVVwZGF0ZSA9IGZ1bmN0aW9uIChyZWFkZXIpIHtcclxuICAgIHZhciByb2NrTGVuZ3RoID0gcmVhZGVyLnJlYWRVSW50MTYoKTtcclxuXHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgcm9ja0xlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgcm9jayA9IG5ldyBFbnRpdHkuUm9jayhyZWFkZXIsIHRoaXMpO1xyXG4gICAgICAgIHRoaXMuUk9DS19MSVNUW3JvY2suaWRdID0gcm9jaztcclxuICAgIH1cclxuXHJcblxyXG4gICAgdmFyIHBsYXllckxlbmd0aCA9IHJlYWRlci5yZWFkVUludDgoKTtcclxuXHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgcGxheWVyTGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBwbGF5ZXIgPSBuZXcgRW50aXR5LlBsYXllcihyZWFkZXIsIHRoaXMpO1xyXG4gICAgICAgIHRoaXMuUExBWUVSX0xJU1RbcGxheWVyLmlkXSA9IHBsYXllcjtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgcm9jazJMZW5ndGggPSByZWFkZXIucmVhZFVJbnQxNigpO1xyXG5cclxuXHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgcm9jazJMZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBpZCA9IHJlYWRlci5yZWFkVUludDMyKCk7XHJcbiAgICAgICAgcm9jayA9IHRoaXMuUk9DS19MSVNUW2lkXTtcclxuXHJcblxyXG4gICAgICAgIGlmIChyb2NrKSB7XHJcbiAgICAgICAgICAgIHJvY2sudXBkYXRlKHJlYWRlcik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkZVQ0sgWU9VIE1BVEUgXCIgKyBpZCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgZmFrZVJvY2sgPSBuZXcgRW50aXR5LlJvY2sobnVsbCwgdGhpcyk7XHJcbiAgICAgICAgICAgIGZha2VSb2NrLnVwZGF0ZShyZWFkZXIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5ST0NLX0xJU1RbaWRdID0gZmFrZVJvY2s7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICB2YXIgcGxheWVyMkxlbmd0aCA9IHJlYWRlci5yZWFkVUludDgoKTtcclxuICAgIGZvciAoaSA9IDA7IGkgPCBwbGF5ZXIyTGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBpZCA9IHJlYWRlci5yZWFkVUludDMyKCk7XHJcbiAgICAgICAgdmFyIHBsYXllciA9IHRoaXMuUExBWUVSX0xJU1RbaWRdO1xyXG4gICAgICAgIGlmIChwbGF5ZXIpIHtcclxuICAgICAgICAgICAgcGxheWVyLnVwZGF0ZShyZWFkZXIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB2YXIgcm9jazNMZW5ndGggPSByZWFkZXIucmVhZFVJbnQxNigpOyAvL2RlbGV0ZSByb2Nrc1xyXG4gICAgZm9yIChpID0gMDsgaSA8IHJvY2szTGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBpZCA9IHJlYWRlci5yZWFkVUludDMyKCk7XHJcbiAgICAgICAgZGVsZXRlIHRoaXMuUk9DS19MSVNUW2lkXTtcclxuXHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIkRFTEVURUQgUk9DSzogXCIgKyBpZCk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHBsYXllcjNMZW5ndGggPSByZWFkZXIucmVhZFVJbnQ4KCk7XHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgcGxheWVyM0xlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWQgPSByZWFkZXIucmVhZFVJbnQzMigpO1xyXG4gICAgICAgIGRlbGV0ZSB0aGlzLlBMQVlFUl9MSVNUW2lkXTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5DbGllbnQucHJvdG90eXBlLmhhbmRsZUJpbmFyeSA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICB2YXIgcmVhZGVyID0gbmV3IEJpbmFyeVJlYWRlcihkYXRhKTtcclxuICAgIGlmIChyZWFkZXIubGVuZ3RoKCkgPCAxKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBzdGVwID0gcmVhZGVyLnJlYWRVSW50MzIoKTtcclxuXHJcbiAgICBpZiAoIXRoaXMuaW5pdGlhbFN0ZXApIHtcclxuICAgICAgICB0aGlzLmluaXRpYWxTdGVwID0gc3RlcDtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHRoaXMuaW5pdGlhbFN0ZXAgPT09IHN0ZXApIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLmxhc3RTdGVwID0gc3RlcDtcclxuXHJcblxyXG4gICAgLy9jb25zb2xlLmxvZyhcIkxBU1QgU1RFUDogXCIgKyBzdGVwKTtcclxuXHJcblxyXG4gICAgaWYgKCF0aGlzLmN1cnJTdGVwKSB7XHJcbiAgICAgICAgdGhpcy5jdXJyU3RlcCA9IHN0ZXAgLSAzO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMudXBkYXRlcy5wdXNoKHtcclxuICAgICAgICBzdGVwOiBzdGVwLFxyXG4gICAgICAgIHJlYWRlcjogcmVhZGVyXHJcbiAgICB9KTtcclxuXHJcbiAgICByZWFkZXIuc3RlcCA9IHN0ZXA7XHJcbn07XHJcblxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5oYW5kbGVQYWNrZXQgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgdmFyIHBhY2tldCwgaTtcclxuICAgIGZvciAoaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgcGFja2V0ID0gZGF0YVtpXTtcclxuICAgICAgICBzd2l0Y2ggKHBhY2tldC5tYXN0ZXIpIHtcclxuICAgICAgICAgICAgY2FzZSBcImFkZFwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5hZGRFbnRpdGllcyhwYWNrZXQpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJkZWxldGVcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMuZGVsZXRlRW50aXRpZXMocGFja2V0KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwidXBkYXRlXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUVudGl0aWVzKHBhY2tldCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5hZGRFbnRpdGllcyA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcclxuICAgIHZhciBhZGRFbnRpdHkgPSBmdW5jdGlvbiAocGFja2V0LCBsaXN0LCBlbnRpdHksIGFycmF5KSB7XHJcbiAgICAgICAgaWYgKCFwYWNrZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsaXN0W3BhY2tldC5pZF0gPSBuZXcgZW50aXR5KHBhY2tldCwgdGhpcyk7XHJcbiAgICAgICAgaWYgKGFycmF5ICYmIGFycmF5LmluZGV4T2YocGFja2V0LmlkKSA9PT0gLTEpIHtcclxuICAgICAgICAgICAgYXJyYXkucHVzaChwYWNrZXQuaWQpO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcbiAgICBzd2l0Y2ggKHBhY2tldC5jbGFzcykge1xyXG4gICAgICAgIGNhc2UgXCJ0aWxlSW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLlRJTEVfTElTVCwgRW50aXR5LlRpbGUpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwicGxheWVySW5mb1wiOlxyXG4gICAgICAgICAgICAvL2FkZEVudGl0eShwYWNrZXQsIHRoaXMuUExBWUVSX0xJU1QsIEVudGl0eS5QbGF5ZXIsIHRoaXMuUExBWUVSX0FSUkFZKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImFuaW1hdGlvbkluZm9cIjpcclxuICAgICAgICAgICAgaWYgKHBhY2tldC5pZCA9PT0gdGhpcy5TRUxGX0lEKSB7XHJcbiAgICAgICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLkFOSU1BVElPTl9MSVNULCBFbnRpdHkuQW5pbWF0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiVUlJbmZvXCI6XHJcbiAgICAgICAgICAgIGlmICh0aGlzLlNFTEZfSUQgPT09IHBhY2tldC5wbGF5ZXJJZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tYWluVUkub3BlbihwYWNrZXQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJzZWxmSWRcIjpcclxuICAgICAgICAgICAgaWYgKCF0aGlzLlNFTEZfSUQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuU0VMRl9JRCA9IHBhY2tldC5zZWxmSWQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW5VSS5nYW1lVUkub3BlbigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJjaGF0SW5mb1wiOlxyXG4gICAgICAgICAgICB0aGlzLm1haW5VSS5nYW1lVUkuY2hhdFVJLmFkZE1lc3NhZ2UocGFja2V0KTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLnVwZGF0ZUVudGl0aWVzID0gZnVuY3Rpb24gKHBhY2tldCkge1xyXG4gICAgZnVuY3Rpb24gdXBkYXRlRW50aXR5KHBhY2tldCwgbGlzdCkge1xyXG4gICAgICAgIGlmICghcGFja2V0KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGVudGl0eSA9IGxpc3RbcGFja2V0LmlkXTtcclxuICAgICAgICBpZiAoIWVudGl0eSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVudGl0eS51cGRhdGUocGFja2V0KTtcclxuICAgIH1cclxuXHJcbiAgICBzd2l0Y2ggKHBhY2tldC5jbGFzcykge1xyXG4gICAgICAgIGNhc2UgXCJwbGF5ZXJJbmZvXCI6XHJcbiAgICAgICAgICAgIC8vdXBkYXRlRW50aXR5KHBhY2tldCwgdGhpcy5QTEFZRVJfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJ0aWxlSW5mb1wiOlxyXG4gICAgICAgICAgICB1cGRhdGVFbnRpdHkocGFja2V0LCB0aGlzLlRJTEVfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJVSUluZm9cIjpcclxuICAgICAgICAgICAgaWYgKHRoaXMuU0VMRl9JRCA9PT0gcGFja2V0LnBsYXllcklkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW5VSS51cGRhdGUocGFja2V0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgIH1cclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuZGVsZXRlRW50aXRpZXMgPSBmdW5jdGlvbiAocGFja2V0KSB7XHJcbiAgICB2YXIgZGVsZXRlRW50aXR5ID0gZnVuY3Rpb24gKHBhY2tldCwgbGlzdCwgYXJyYXkpIHtcclxuICAgICAgICBpZiAoIXBhY2tldCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChhcnJheSkge1xyXG4gICAgICAgICAgICB2YXIgaW5kZXggPSBhcnJheS5pbmRleE9mKHBhY2tldC5pZCk7XHJcbiAgICAgICAgICAgIGFycmF5LnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRlbGV0ZSBsaXN0W3BhY2tldC5pZF07XHJcbiAgICB9O1xyXG5cclxuICAgIHN3aXRjaCAocGFja2V0LmNsYXNzKSB7XHJcbiAgICAgICAgY2FzZSBcInRpbGVJbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuVElMRV9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInBsYXllckluZm9cIjpcclxuICAgICAgICAgICAgLy9kZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLlBMQVlFUl9MSVNULCB0aGlzLlBMQVlFUl9BUlJBWSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJhbmltYXRpb25JbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuQU5JTUFUSU9OX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiVUlJbmZvXCI6XHJcbiAgICAgICAgICAgIGlmICh0aGlzLlNFTEZfSUQgPT09IHBhY2tldC5pZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tYWluVUkuY2xvc2UocGFja2V0LmFjdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmRyYXdTY2VuZSA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICB0aGlzLm1haW5VSS51cGRhdGVMZWFkZXJCb2FyZCgpO1xyXG5cclxuICAgIHZhciBpZDtcclxuICAgIHZhciBlbnRpdHlMaXN0ID0gW1xyXG4gICAgICAgIHRoaXMuVElMRV9MSVNULFxyXG4gICAgICAgIHRoaXMuUExBWUVSX0xJU1QsXHJcbiAgICAgICAgdGhpcy5BU1RFUk9JRF9MSVNULFxyXG4gICAgICAgIHRoaXMuQU5JTUFUSU9OX0xJU1QsXHJcbiAgICAgICAgdGhpcy5ST0NLX0xJU1RcclxuICAgIF07XHJcblxyXG4gICAgdmFyIGluQm91bmRzID0gZnVuY3Rpb24gKHBsYXllciwgeCwgeSkge1xyXG4gICAgICAgIHZhciByYW5nZSA9IHRoaXMubWFpbkNhbnZhcy53aWR0aCAvICgwLjcgKiB0aGlzLnNjYWxlRmFjdG9yKTtcclxuICAgICAgICByZXR1cm4geCA8IChwbGF5ZXIueCArIHJhbmdlKSAmJiB4ID4gKHBsYXllci54IC0gcmFuZ2UpXHJcbiAgICAgICAgICAgICYmIHkgPCAocGxheWVyLnkgKyByYW5nZSkgJiYgeSA+IChwbGF5ZXIueSAtIHJhbmdlKTtcclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcbiAgICB2YXIgdHJhbnNsYXRlU2NlbmUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5tYWluQ3R4LnNldFRyYW5zZm9ybSgxLCAwLCAwLCAxLCAwLCAwKTtcclxuICAgICAgICB0aGlzLnNjYWxlRmFjdG9yID0gbGVycCh0aGlzLnNjYWxlRmFjdG9yLCB0aGlzLm1haW5TY2FsZUZhY3RvciwgMC4zKTtcclxuICAgICAgICB0aGlzLm1haW5DdHgudHJhbnNsYXRlKHRoaXMubWFpbkNhbnZhcy53aWR0aCAvIDIsIHRoaXMubWFpbkNhbnZhcy5oZWlnaHQgLyAyKTtcclxuICAgICAgICB0aGlzLm1haW5DdHguc2NhbGUodGhpcy5zY2FsZUZhY3RvciwgdGhpcy5zY2FsZUZhY3Rvcik7XHJcbiAgICAgICAgdGhpcy5tYWluQ3R4LnRyYW5zbGF0ZSgtdGhpcy5TRUxGX1BMQVlFUi54LCAtdGhpcy5TRUxGX1BMQVlFUi55KTtcclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcblxyXG4gICAgdGhpcy5TRUxGX1BMQVlFUi50aWNrKCk7XHJcblxyXG5cclxuICAgIHRyYW5zbGF0ZVNjZW5lKCk7XHJcbiAgICB0aGlzLm1haW5DdHguY2xlYXJSZWN0KDAsIDAsIDExMDAwLCAxMTAwMCk7XHJcblxyXG4gICAgdGhpcy5tYWluQ3R4LmZpbGxTdHlsZSA9IFwiIzFkMWYyMVwiO1xyXG4gICAgdGhpcy5tYWluQ3R4LmZpbGxSZWN0KDAsIDAsIDIwMDAwLCAyMDAwMCk7XHJcblxyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZW50aXR5TGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBsaXN0ID0gZW50aXR5TGlzdFtpXTtcclxuICAgICAgICBmb3IgKGlkIGluIGxpc3QpIHtcclxuICAgICAgICAgICAgdmFyIGVudGl0eSA9IGxpc3RbaWRdO1xyXG4gICAgICAgICAgICBpZiAoaW5Cb3VuZHModGhpcy5TRUxGX1BMQVlFUiwgZW50aXR5LngsIGVudGl0eS55KSkge1xyXG4gICAgICAgICAgICAgICAgZW50aXR5LnNob3coKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGlmICh0aGlzLlRSQUlMICYmICF0aGlzLmFjdGl2ZSkge1xyXG4gICAgICAgIHRoaXMuVFJBSUwuc2hvdygpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5jbGllbnRVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnVwZGF0ZVN0ZXAoKTtcclxuXHJcblxyXG4gICAgaWYgKCF0aGlzLlNFTEZfUExBWUVSKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuU0VMRl9JRCkge1xyXG4gICAgICAgICAgICB0aGlzLlNFTEZfUExBWUVSID0gdGhpcy5QTEFZRVJfTElTVFt0aGlzLlNFTEZfSURdO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdGhpcy5kcmF3U2NlbmUoKTtcclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUudXBkYXRlU3RlcCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBzdGVwUmFuZ2UgPSB0aGlzLmxhc3RTdGVwIC0gdGhpcy5jdXJyU3RlcDtcclxuICAgIHZhciB1cGRhdGU7XHJcblxyXG4gICAgaWYgKCFzdGVwUmFuZ2UpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICAvL2NvbnNvbGUubG9nKHRoaXMudXBkYXRlc1swXSk7XHJcblxyXG4gICAgaWYgKHRoaXMuY3VyclN0ZXAgPCB0aGlzLmluaXRpYWxTdGVwKSB7XHJcbiAgICAgICAgdGhpcy5jdXJyU3RlcCArPSAxO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLmN1cnJTdGVwID4gdGhpcy5sYXN0U3RlcCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiU1RFUCBSQU5HRSBUT08gU01BTEw6IFNFUlZFUiBUT08gU0xPV1wiKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9IC8vdG9vIGZhc3RcclxuICAgIGlmICh0aGlzLmxhc3RTdGVwIC0gdGhpcy5jdXJyU3RlcCA+IDUgKyB0aGlzLmN1cnJQaW5nIC8gNTApIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlNURVAgUkFOR0UgVE9PIExBUkdFOiBDTElFTlQgSVMgVE9PIFNMT1cgRk9SIFNURVA6IFwiICsgdGhpcy5jdXJyU3RlcCk7XHJcbiAgICAgICAgdXBkYXRlID0gdGhpcy5maW5kVXBkYXRlUGFja2V0KHRoaXMuY3VyclN0ZXApO1xyXG4gICAgICAgIGlmICghdXBkYXRlKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVVBEQVRFIE5PVCBGT1VORCEhISFcIik7XHJcbiAgICAgICAgICAgIHRoaXMuY3VyclN0ZXAgKz0gMTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodXBkYXRlLnJlYWRlci5fb2Zmc2V0ID4gMTApIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJPRkZTRVQgSVMgVE9PIExBUkdFXCIpO1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJTdGVwICs9IDE7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuYXBwbHlVcGRhdGUodXBkYXRlLnJlYWRlcik7XHJcbiAgICAgICAgdGhpcy5jdXJyU3RlcCArPSAxO1xyXG4gICAgICAgIHRoaXMudXBkYXRlU3RlcCgpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH0gLy90b28gc2xvd1xyXG5cclxuICAgIHVwZGF0ZSA9IHRoaXMuZmluZFVwZGF0ZVBhY2tldCh0aGlzLmN1cnJTdGVwKTtcclxuICAgIGlmICghdXBkYXRlKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJDQU5OT1QgRklORCBVUERBVEUgRk9SIFNURVA6IFwiICsgdGhpcy5jdXJyU3RlcCk7XHJcbiAgICAgICAgdGhpcy5jdXJyU3RlcCArPSAxO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGlmICh1cGRhdGUucmVhZGVyLl9vZmZzZXQgPiAxMCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiT0ZGU0VUIElTIFRPTyBMQVJHRSBGT1IgU1RFUDogXCIgKyB0aGlzLmN1cnJTdGVwKTtcclxuICAgICAgICBjb25zb2xlLmxvZyh0aGlzLnVwZGF0ZXNbMF0pO1xyXG4gICAgICAgIHRoaXMuY3VyclN0ZXAgKz0gMTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLmFwcGx5VXBkYXRlKHVwZGF0ZS5yZWFkZXIpO1xyXG4gICAgdGhpcy5jdXJyU3RlcCArPSAxO1xyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuZmluZFVwZGF0ZVBhY2tldCA9IGZ1bmN0aW9uIChzdGVwKSB7XHJcbiAgICB2YXIgbGVuZ3RoID0gdGhpcy51cGRhdGVzLmxlbmd0aDtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gbGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgICAgICB2YXIgdXBkYXRlID0gdGhpcy51cGRhdGVzW2ldO1xyXG5cclxuICAgICAgICBpZiAodXBkYXRlLnN0ZXAgPT09IHN0ZXApIHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVzLnNwbGljZSgwLCBpKTtcclxuICAgICAgICAgICAgcmV0dXJuIHVwZGF0ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBjb25zb2xlLmxvZygnQ09VTEQgTk9UIEZJTkQgUEFDS0VUIEZPUiBTVEVQOiAnICsgc3RlcCk7XHJcbiAgICBjb25zb2xlLmxvZyh0aGlzLnVwZGF0ZXNbMF0pO1xyXG4gICAgY29uc29sZS5sb2codGhpcy51cGRhdGVzWzFdKTtcclxuICAgIGNvbnNvbGUubG9nKHRoaXMudXBkYXRlc1syXSk7XHJcblxyXG5cclxuICAgIHJldHVybiBudWxsO1xyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBzZXRJbnRlcnZhbCh0aGlzLmNsaWVudFVwZGF0ZS5iaW5kKHRoaXMpLCAxMDAwIC8gMjUpO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gbGVycChhLCBiLCByYXRpbykge1xyXG4gICAgcmV0dXJuIGEgKyByYXRpbyAqIChiIC0gYSk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBzcXVhcmUoYSkge1xyXG4gICAgcmV0dXJuIGEgKiBhO1xyXG59XHJcblxyXG5mdW5jdGlvbiB2ZWN0b3JOb3JtYWwoYSkge1xyXG4gICAgcmV0dXJuIGEueCAqIGEueCArIGEueSAqIGEueTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDbGllbnQ7IiwiZnVuY3Rpb24gQW5pbWF0aW9uKGFuaW1hdGlvbkluZm8sIGNsaWVudCkge1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy50eXBlID0gYW5pbWF0aW9uSW5mby50eXBlO1xyXG4gICAgdGhpcy5pZCA9IGFuaW1hdGlvbkluZm8uaWQ7XHJcbiAgICB0aGlzLnggPSBhbmltYXRpb25JbmZvLng7XHJcbiAgICB0aGlzLnkgPSBhbmltYXRpb25JbmZvLnk7XHJcbiAgICAvL3RoaXMudGhldGEgPSAxNTtcclxuICAgIHRoaXMudGltZXIgPSBnZXRSYW5kb20oMTAsIDE0KTtcclxuXHJcbiAgICBpZiAodGhpcy50eXBlID09PSBcInNsYXNoXCIpIHtcclxuICAgICAgICB0aGlzLnNsYXNoSWQgPSBhbmltYXRpb25JbmZvLnNsYXNoSWQ7XHJcbiAgICAgICAgdmFyIHNsYXNoID0gdGhpcy5jbGllbnQuZmluZFNsYXNoKHRoaXMuc2xhc2hJZCk7XHJcbiAgICAgICAgdGhpcy5wcmUgPSBzbGFzaFswXTtcclxuICAgICAgICB0aGlzLnBvc3QgPSBzbGFzaFsxXTtcclxuICAgIH1cclxufVxyXG5cclxuXHJcbkFuaW1hdGlvbi5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5tYWluQ3R4O1xyXG4gICAgdmFyIHBsYXllciA9IHRoaXMuY2xpZW50LlNFTEZfUExBWUVSO1xyXG5cclxuICAgIGlmICh0aGlzLnR5cGUgPT09IFwic2xhc2hcIiAmJiBwbGF5ZXIpIHtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcblxyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiYSgyNDIsIDMxLCA2NiwgMC42KVwiO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAxNTtcclxuXHJcbiAgICAgICAgY3R4Lm1vdmVUbyhwbGF5ZXIueCArIHRoaXMucHJlLngsIHBsYXllci55ICsgdGhpcy5wcmUueSk7XHJcbiAgICAgICAgY3R4LmxpbmVUbyhwbGF5ZXIueCArIHRoaXMucG9zdC54LCBwbGF5ZXIueSArIHRoaXMucG9zdC55KTtcclxuXHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIH1cclxuICAgIFxyXG5cclxuICAgIGlmICh0aGlzLnR5cGUgPT09IFwic2hhcmREZWF0aFwiKSB7IC8vZGVwcmVjYXRlZCBidXQgY291bGQgcHVsbCBzb21lIGdvb2QgY29kZSBmcm9tIGhlcmVcclxuICAgICAgICBjdHguZm9udCA9IDYwIC0gdGhpcy50aW1lciArIFwicHggQXJpYWxcIjtcclxuICAgICAgICBjdHguc2F2ZSgpO1xyXG4gICAgICAgIGN0eC50cmFuc2xhdGUodGhpcy54LCB0aGlzLnkpO1xyXG4gICAgICAgIGN0eC5yb3RhdGUoLU1hdGguUEkgLyA1MCAqIHRoaXMudGhldGEpO1xyXG4gICAgICAgIGN0eC50ZXh0QWxpZ24gPSBcImNlbnRlclwiO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcInJnYmEoMjU1LCAxNjgsIDg2LCBcIiArIHRoaXMudGltZXIgKiAxMCAvIDEwMCArIFwiKVwiO1xyXG4gICAgICAgIGN0eC5maWxsVGV4dCh0aGlzLm5hbWUsIDAsIDE1KTtcclxuICAgICAgICBjdHgucmVzdG9yZSgpO1xyXG5cclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCIjMDAwMDAwXCI7XHJcbiAgICAgICAgdGhpcy50aGV0YSA9IGxlcnAodGhpcy50aGV0YSwgMCwgMC4wOCk7XHJcbiAgICAgICAgdGhpcy54ID0gbGVycCh0aGlzLngsIHRoaXMuZW5kWCwgMC4xKTtcclxuICAgICAgICB0aGlzLnkgPSBsZXJwKHRoaXMueSwgdGhpcy5lbmRZLCAwLjEpO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICB0aGlzLnRpbWVyLS07XHJcbiAgICBpZiAodGhpcy50aW1lciA8PSAwKSB7XHJcbiAgICAgICAgZGVsZXRlIHRoaXMuY2xpZW50LkFOSU1BVElPTl9MSVNUW3RoaXMuaWRdO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbShtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbjtcclxufVxyXG5cclxuZnVuY3Rpb24gbGVycChhLCBiLCByYXRpbykge1xyXG4gICAgcmV0dXJuIGEgKyByYXRpbyAqIChiIC0gYSk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQW5pbWF0aW9uO1xyXG5cclxuXHJcbiIsImZ1bmN0aW9uIE1pbmlNYXAoKSB7IC8vZGVwcmVjYXRlZCwgcGxlYXNlIHVwZGF0ZVxyXG59XHJcblxyXG5NaW5pTWFwLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgaWYgKG1hcFRpbWVyIDw9IDAgfHwgc2VydmVyTWFwID09PSBudWxsKSB7XHJcbiAgICAgICAgdmFyIHRpbGVMZW5ndGggPSBNYXRoLnNxcnQoT2JqZWN0LnNpemUoVElMRV9MSVNUKSk7XHJcbiAgICAgICAgaWYgKHRpbGVMZW5ndGggPT09IDAgfHwgIXNlbGZQbGF5ZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgaW1nRGF0YSA9IG1haW5DdHguY3JlYXRlSW1hZ2VEYXRhKHRpbGVMZW5ndGgsIHRpbGVMZW5ndGgpO1xyXG4gICAgICAgIHZhciB0aWxlO1xyXG4gICAgICAgIHZhciB0aWxlUkdCO1xyXG4gICAgICAgIHZhciBpID0gMDtcclxuXHJcblxyXG4gICAgICAgIGZvciAodmFyIGlkIGluIFRJTEVfTElTVCkge1xyXG4gICAgICAgICAgICB0aWxlUkdCID0ge307XHJcbiAgICAgICAgICAgIHRpbGUgPSBUSUxFX0xJU1RbaWRdO1xyXG4gICAgICAgICAgICBpZiAodGlsZS5jb2xvciAmJiB0aWxlLmFsZXJ0IHx8IGluQm91bmRzKHNlbGZQbGF5ZXIsIHRpbGUueCwgdGlsZS55KSkge1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5yID0gdGlsZS5jb2xvci5yO1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5nID0gdGlsZS5jb2xvci5nO1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5iID0gdGlsZS5jb2xvci5iO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5yID0gMDtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuZyA9IDA7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLmIgPSAwO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpbWdEYXRhLmRhdGFbaV0gPSB0aWxlUkdCLnI7XHJcbiAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpICsgMV0gPSB0aWxlUkdCLmc7XHJcbiAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpICsgMl0gPSB0aWxlUkdCLmI7XHJcbiAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpICsgM10gPSAyNTU7XHJcbiAgICAgICAgICAgIGkgKz0gNDtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc29sZS5sb2coNDAwIC8gT2JqZWN0LnNpemUoVElMRV9MSVNUKSk7XHJcbiAgICAgICAgaW1nRGF0YSA9IHNjYWxlSW1hZ2VEYXRhKGltZ0RhdGEsIE1hdGguZmxvb3IoNDAwIC8gT2JqZWN0LnNpemUoVElMRV9MSVNUKSksIG1haW5DdHgpO1xyXG5cclxuICAgICAgICBtTWFwQ3R4LnB1dEltYWdlRGF0YShpbWdEYXRhLCAwLCAwKTtcclxuXHJcbiAgICAgICAgbU1hcEN0eFJvdC5yb3RhdGUoOTAgKiBNYXRoLlBJIC8gMTgwKTtcclxuICAgICAgICBtTWFwQ3R4Um90LnNjYWxlKDEsIC0xKTtcclxuICAgICAgICBtTWFwQ3R4Um90LmRyYXdJbWFnZShtTWFwLCAwLCAwKTtcclxuICAgICAgICBtTWFwQ3R4Um90LnNjYWxlKDEsIC0xKTtcclxuICAgICAgICBtTWFwQ3R4Um90LnJvdGF0ZSgyNzAgKiBNYXRoLlBJIC8gMTgwKTtcclxuXHJcbiAgICAgICAgc2VydmVyTWFwID0gbU1hcFJvdDtcclxuICAgICAgICBtYXBUaW1lciA9IDI1O1xyXG4gICAgfVxyXG5cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIG1hcFRpbWVyIC09IDE7XHJcbiAgICB9XHJcblxyXG4gICAgbWFpbkN0eC5kcmF3SW1hZ2Uoc2VydmVyTWFwLCA4MDAsIDQwMCk7XHJcbn07IC8vZGVwcmVjYXRlZFxyXG5cclxuTWluaU1hcC5wcm90b3R5cGUuc2NhbGVJbWFnZURhdGEgPSBmdW5jdGlvbiAoaW1hZ2VEYXRhLCBzY2FsZSwgbWFpbkN0eCkge1xyXG4gICAgdmFyIHNjYWxlZCA9IG1haW5DdHguY3JlYXRlSW1hZ2VEYXRhKGltYWdlRGF0YS53aWR0aCAqIHNjYWxlLCBpbWFnZURhdGEuaGVpZ2h0ICogc2NhbGUpO1xyXG4gICAgdmFyIHN1YkxpbmUgPSBtYWluQ3R4LmNyZWF0ZUltYWdlRGF0YShzY2FsZSwgMSkuZGF0YTtcclxuICAgIGZvciAodmFyIHJvdyA9IDA7IHJvdyA8IGltYWdlRGF0YS5oZWlnaHQ7IHJvdysrKSB7XHJcbiAgICAgICAgZm9yICh2YXIgY29sID0gMDsgY29sIDwgaW1hZ2VEYXRhLndpZHRoOyBjb2wrKykge1xyXG4gICAgICAgICAgICB2YXIgc291cmNlUGl4ZWwgPSBpbWFnZURhdGEuZGF0YS5zdWJhcnJheShcclxuICAgICAgICAgICAgICAgIChyb3cgKiBpbWFnZURhdGEud2lkdGggKyBjb2wpICogNCxcclxuICAgICAgICAgICAgICAgIChyb3cgKiBpbWFnZURhdGEud2lkdGggKyBjb2wpICogNCArIDRcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgZm9yICh2YXIgeCA9IDA7IHggPCBzY2FsZTsgeCsrKSBzdWJMaW5lLnNldChzb3VyY2VQaXhlbCwgeCAqIDQpXHJcbiAgICAgICAgICAgIGZvciAodmFyIHkgPSAwOyB5IDwgc2NhbGU7IHkrKykge1xyXG4gICAgICAgICAgICAgICAgdmFyIGRlc3RSb3cgPSByb3cgKiBzY2FsZSArIHk7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGVzdENvbCA9IGNvbCAqIHNjYWxlO1xyXG4gICAgICAgICAgICAgICAgc2NhbGVkLmRhdGEuc2V0KHN1YkxpbmUsIChkZXN0Um93ICogc2NhbGVkLndpZHRoICsgZGVzdENvbCkgKiA0KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzY2FsZWQ7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE1pbmlNYXA7IiwiZnVuY3Rpb24gUGxheWVyKHJlYWRlciwgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gcmVhZGVyLnJlYWRVSW50MzIoKTsgLy9wbGF5ZXIgaWRcclxuICAgIHRoaXMueCA9IHJlYWRlci5yZWFkVUludDMyKCkgLyAxMDA7IC8vcmVhbCB4XHJcbiAgICB0aGlzLnkgPSByZWFkZXIucmVhZFVJbnQzMigpIC8gMTAwOyAvL3JlYWwgeVxyXG5cclxuICAgIHRoaXMucmFkaXVzID0gcmVhZGVyLnJlYWRVSW50MTYoKTsgLy9yYWRpdXNcclxuICAgIHRoaXMubmFtZSA9IHJlYWRlci5yZWFkVUludDMyKCk7IC8vbmFtZVxyXG5cclxuICAgIHRoaXMudmVydGljZXMgPSBbXTsgICAgICAgICAgICAvL3ZlcnRpY2VzXHJcbiAgICB2YXIgY291bnQgPSByZWFkZXIucmVhZFVJbnQ4KCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcclxuICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0gW107XHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXVswXSA9IHJlYWRlci5yZWFkSW50MTYoKSAvIDEwMDA7XHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXVsxXSA9IHJlYWRlci5yZWFkSW50MTYoKSAvIDEwMDA7XHJcbiAgICB9XHJcbiAgICBjb25zb2xlLmxvZyhcIlBMQVlFUiBWRVJUSUNFUyBDT1VOVDogXCIgKyBjb3VudCk7XHJcblxyXG4gICAgdGhpcy5oZWFsdGggPSByZWFkZXIucmVhZFVJbnQ4KCk7IC8vaGVhbHRoXHJcbiAgICB0aGlzLm1heEhlYWx0aCA9IHJlYWRlci5yZWFkVUludDgoKTsgLy9tYXhIZWFsdGhcclxuXHJcbiAgICB0aGlzLnRoZXRhID0gcmVhZGVyLnJlYWRJbnQxNigpIC8gMTAwOyAvL3RoZXRhXHJcbiAgICB0aGlzLmxldmVsID0gcmVhZGVyLnJlYWRVSW50OCgpOyAvL2xldmVsXHJcblxyXG4gICAgc3dpdGNoIChyZWFkZXIucmVhZFVJbnQ4KCkpIHsgICAgLy9mbGFnc1xyXG4gICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgdGhpcy52dWxuZXJhYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAxNjpcclxuICAgICAgICAgICAgdGhpcy5zaG9vdGluZyA9IHRydWU7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMTc6XHJcbiAgICAgICAgICAgIHRoaXMudnVsbmVyYWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvb3RpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxuXHJcbiAgICBpZiAoIXRoaXMuY2xpZW50LlNFTEZfUExBWUVSICYmIHRoaXMuaWQgPT09IHRoaXMuY2xpZW50LlNFTEZfSUQpIHtcclxuICAgICAgICB0aGlzLmNsaWVudC5TRUxGX1BMQVlFUiA9IHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5jb2xsaXNpb25UaW1lciA9IDA7XHJcblxyXG4gICAgdGhpcy5tb3ZlciA9IHtcclxuICAgICAgICB4OiAwLFxyXG4gICAgICAgIHk6IDBcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5yZWFsTW92ZXIgPSB7XHJcbiAgICAgICAgeDogMCxcclxuICAgICAgICB5OiAwXHJcbiAgICB9O1xyXG59XHJcblxyXG5cclxuUGxheWVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAocmVhZGVyKSB7XHJcbiAgICB0aGlzLnggPSByZWFkZXIucmVhZFVJbnQzMigpIC8gMTAwOyAvL3JlYWwgeFxyXG4gICAgdGhpcy55ID0gcmVhZGVyLnJlYWRVSW50MzIoKSAvIDEwMDsgLy9yZWFsIHlcclxuXHJcbiAgICB0aGlzLnJhZGl1cyA9IHJlYWRlci5yZWFkVUludDE2KCk7IC8vcmFkaXVzXHJcbiAgICB0aGlzLm5hbWUgPSByZWFkZXIucmVhZEludDMyKCk7IC8vbmFtZVxyXG5cclxuICAgIHRoaXMuaGVhbHRoID0gcmVhZGVyLnJlYWRVSW50OCgpOyAvL2hlYWx0aFxyXG4gICAgdGhpcy5tYXhIZWFsdGggPSByZWFkZXIucmVhZFVJbnQ4KCk7IC8vbWF4SGVhbHRoXHJcblxyXG4gICAgdGhpcy50aGV0YSA9IHJlYWRlci5yZWFkSW50MTYoKSAvIDEwMDsgLy90aGV0YVxyXG4gICAgdGhpcy5sZXZlbCA9IHJlYWRlci5yZWFkVUludDgoKTsgLy9sZXZlbFxyXG5cclxuICAgIHZhciBmbGFncyA9IHJlYWRlci5yZWFkVUludDE2KCk7XHJcblxyXG4gICAgdGhpcy5zaG9vdGluZyA9IE51bWJlcihTdHJpbmcoZmxhZ3MpLmNoYXJBdCgwKSkgPT09IDE7XHJcbiAgICB0aGlzLnZ1bG5lcmFibGUgPSBOdW1iZXIoU3RyaW5nKGZsYWdzKS5jaGFyQXQoMSkpID09PSAxO1xyXG4gICAgdGhpcy5jb2xsaWRpbmcgPSBOdW1iZXIoU3RyaW5nKGZsYWdzKS5jaGFyQXQoMikpID09PSAxO1xyXG5cclxufTtcclxuXHJcblxyXG5QbGF5ZXIucHJvdG90eXBlLnRpY2sgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAodGhpcy5yZWFsTW92ZXIpIHtcclxuICAgICAgICB0aGlzLm1vdmVyLnggPSBsZXJwKHRoaXMubW92ZXIueCwgdGhpcy5yZWFsTW92ZXIueCwgMC4xNSk7XHJcbiAgICAgICAgdGhpcy5tb3Zlci55ID0gbGVycCh0aGlzLm1vdmVyLnksIHRoaXMucmVhbE1vdmVyLnksIDAuMTUpO1xyXG4gICAgfVxyXG4gICAgLy90aGlzLm1vdmUodGhpcy5tb3Zlci54LCB0aGlzLm1vdmVyLnkpO1xyXG59O1xyXG5cclxuXHJcblBsYXllci5wcm90b3R5cGUuc2V0TW92ZSA9IGZ1bmN0aW9uICh4LCB5KSB7XHJcbiAgICB0aGlzLnJlYWxNb3ZlciA9IHtcclxuICAgICAgICB4OiB4LFxyXG4gICAgICAgIHk6IHlcclxuICAgIH07XHJcbn07XHJcblxyXG5cclxuUGxheWVyLnByb3RvdHlwZS5nZXRUaGV0YSA9IGZ1bmN0aW9uICh0YXJnZXQsIG9yaWdpbikge1xyXG4gICAgdGhpcy50aGV0YSA9IE1hdGguYXRhbjIodGFyZ2V0LnkgLSBvcmlnaW4ueSwgdGFyZ2V0LnggLSBvcmlnaW4ueCkgJSAoMiAqIE1hdGguUEkpO1xyXG59O1xyXG5cclxuUGxheWVyLnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24gKHgsIHkpIHtcclxuICAgIHZhciB0YXJnZXQgPSB7XHJcbiAgICAgICAgeDogdGhpcy54ICsgeCxcclxuICAgICAgICB5OiB0aGlzLnkgKyB5XHJcbiAgICB9O1xyXG4gICAgdmFyIG9yaWdpbiA9IHtcclxuICAgICAgICB4OiB0aGlzLngsXHJcbiAgICAgICAgeTogdGhpcy55XHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuZ2V0VGhldGEodGFyZ2V0LCBvcmlnaW4pO1xyXG5cclxuXHJcbiAgICB2YXIgbm9ybWFsVmVsID0gbm9ybWFsKHgsIHkpO1xyXG4gICAgaWYgKG5vcm1hbFZlbCA8IDEpIHtcclxuICAgICAgICBub3JtYWxWZWwgPSAxO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciB2ZWxCdWZmZXIgPSAzOyAvL2NoYW5nZSBzb29uXHJcblxyXG4gICAgdGhpcy54ICs9IDEwMCAqIHggLyBub3JtYWxWZWwgLyB2ZWxCdWZmZXI7XHJcbiAgICB0aGlzLnkgKz0gMTAwICogeSAvIG5vcm1hbFZlbCAvIHZlbEJ1ZmZlcjtcclxuXHJcbn07XHJcblxyXG5cclxuUGxheWVyLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50Lm1haW5DdHg7XHJcbiAgICB2YXIgc2VsZklkID0gdGhpcy5jbGllbnQuU0VMRl9JRDtcclxuICAgIHZhciBmaWxsQWxwaGE7XHJcbiAgICB2YXIgc3Ryb2tlQWxwaGE7XHJcbiAgICB2YXIgaTtcclxuXHJcblxyXG4gICAgZmlsbEFscGhhID0gdGhpcy5oZWFsdGggLyAoNCAqIHRoaXMubWF4SGVhbHRoKTtcclxuICAgIHN0cm9rZUFscGhhID0gMTtcclxuXHJcbiAgICBjdHguZm9udCA9IFwiMjBweCBBcmlhbFwiO1xyXG5cclxuXHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoMjUyLCAxMDIsIDM3LFwiICsgc3Ryb2tlQWxwaGEgKyBcIilcIjtcclxuICAgIGlmICh0aGlzLnNob290aW5nKSB7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiZ3JlZW5cIjtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHRoaXMudnVsbmVyYWJsZSkge1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcInJlZFwiO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwicmdiYSgxMjMsMCwwLFwiICsgZmlsbEFscGhhICsgXCIpXCI7XHJcbiAgICB9XHJcbiAgICBjdHgubGluZVdpZHRoID0gMTA7XHJcblxyXG5cclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuXHJcbiAgICBjdHgudHJhbnNsYXRlKHRoaXMueCwgdGhpcy55KTtcclxuICAgIGN0eC5yb3RhdGUodGhpcy50aGV0YSk7XHJcblxyXG4gICAgaWYgKHRoaXMudmVydGljZXMpIHtcclxuICAgICAgICB2YXIgdiA9IHRoaXMudmVydGljZXM7XHJcbiAgICAgICAgY3R4Lm1vdmVUbyh2WzBdWzBdICogdGhpcy5yYWRpdXMsIHZbMF1bMV0gKiB0aGlzLnJhZGl1cyk7XHJcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IHYubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgY3R4LmxpbmVUbyh2W2ldWzBdICogdGhpcy5yYWRpdXMsIHZbaV1bMV0gKiB0aGlzLnJhZGl1cyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGN0eC5saW5lVG8odlswXVswXSAqIHRoaXMucmFkaXVzLCB2WzBdWzFdICogdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgfVxyXG4gICAgY3R4LmZpbGwoKTtcclxuICAgIGN0eC5zdHJva2UoKTtcclxuXHJcbiAgICBjdHgucm90YXRlKDIgKiBNYXRoLlBJIC0gdGhpcy50aGV0YSk7XHJcblxyXG5cclxuICAgIGlmICghdGhpcy52dWxuZXJhYmxlKSB7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwicmdiYSgwLCAyNTUsIDAsIDAuMylcIjtcclxuICAgICAgICBjdHguYXJjKDAsIDAsIHRoaXMucmFkaXVzICogMiwgMCwgMiAqIE1hdGguUEkpO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICB9XHJcblxyXG4gICAgY3R4LnRyYW5zbGF0ZSgtdGhpcy54LCAtdGhpcy55KTtcclxuXHJcblxyXG4gICAgY3R4LmNsb3NlUGF0aCgpO1xyXG5cclxuXHJcbiAgICBpZiAoMSA9PT0gMykge1xyXG4gICAgICAgIHZhciByYWRpdXMgPSB0aGlzLnJhZGl1cztcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4Lm1vdmVUbyh0aGlzLnggKyByYWRpdXMsIHRoaXMueSk7XHJcbiAgICAgICAgdmFyIHRoZXRhLCB4LCB5O1xyXG4gICAgICAgIGZvciAoaSA9IE1hdGguUEkgLyA0OyBpIDw9IDIgKiBNYXRoLlBJIC0gTWF0aC5QSSAvIDQ7IGkgKz0gTWF0aC5QSSAvIDQpIHtcclxuICAgICAgICAgICAgdGhldGEgPSBpO1xyXG4gICAgICAgICAgICB4ID0gcmFkaXVzICogTWF0aC5jb3ModGhldGEpO1xyXG4gICAgICAgICAgICB5ID0gcmFkaXVzICogTWF0aC5zaW4odGhldGEpO1xyXG4gICAgICAgICAgICBjdHgubGluZVRvKHRoaXMueCArIHgsIHRoaXMueSArIHkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdHgubGluZVRvKHRoaXMueCArIHJhZGl1cywgdGhpcy55ICsgMyk7XHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGN0eC5maWxsU3R5bGUgPSBcIiNmZjlkNjBcIjtcclxuICAgIGN0eC5maWxsVGV4dCh0aGlzLm5hbWUsIHRoaXMueCwgdGhpcy55ICsgNzApO1xyXG5cclxuXHJcbiAgICBpZiAodGhpcy5oZWFsdGggJiYgdGhpcy5tYXhIZWFsdGggJiYgdGhpcy5oZWFsdGggPiAwKSB7IC8vaGVhbHRoIGJhclxyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAxMDtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJibGFja1wiO1xyXG4gICAgICAgIGN0eC5yZWN0KHRoaXMueCwgdGhpcy55LCAxMDAsIDIwKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG5cclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiZ3JlZW5cIjtcclxuICAgICAgICBjdHgucmVjdCh0aGlzLngsIHRoaXMueSwgMTAwICogdGhpcy5oZWFsdGggLyB0aGlzLm1heEhlYWx0aCwgMjApO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfSAvL2Rpc3BsYXkgaGVhbHRoIGJhclxyXG5cclxuXHJcbiAgICBjdHguY2xvc2VQYXRoKCk7XHJcbn07XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gbm9ybWFsKHgsIHkpIHtcclxuICAgIHJldHVybiBNYXRoLnNxcnQoeCAqIHggKyB5ICogeSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxlcnAoYSwgYiwgcmF0aW8pIHtcclxuICAgIHJldHVybiBhICsgcmF0aW8gKiAoYiAtIGEpO1xyXG59XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQbGF5ZXI7IiwiZnVuY3Rpb24gUm9jayhyZWFkZXIsIGNsaWVudCkge1xyXG4gICAgaWYgKCFyZWFkZXIpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIk1BS0lORyBORVcgRkFLRSBST0NLXCIpO1xyXG4gICAgICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgICAgIHJldHVybjsgLy9mb3IgZmFrZSByb2NrIHB1cnBvc2VzXHJcbiAgICB9XHJcbiAgICB2YXIgcHJldiA9IHJlYWRlci5fb2Zmc2V0O1xyXG5cclxuXHJcbiAgICB0aGlzLmlkID0gcmVhZGVyLnJlYWRVSW50MzIoKTtcclxuICAgIC8vY29uc29sZS5sb2coXCJORVcgUk9DSzogXCIgKyB0aGlzLmlkKTtcclxuXHJcbiAgICB0aGlzLm93bmVyID0gcmVhZGVyLnJlYWRVSW50MzIoKTtcclxuICAgIHRoaXMueCA9IHJlYWRlci5yZWFkVUludDMyKCkgLyAxMDA7XHJcbiAgICB0aGlzLnkgPSByZWFkZXIucmVhZFVJbnQzMigpIC8gMTAwO1xyXG5cclxuICAgIHRoaXMudmVydGljZXMgPSBbXTtcclxuICAgIHZhciBjb3VudCA9IHJlYWRlci5yZWFkVUludDE2KCk7XHJcbiAgICAvL2NvbnNvbGUubG9nKFwiQ09VTlQ6IFwiICsgY291bnQpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXSA9IFtdO1xyXG4gICAgICAgIHRoaXMudmVydGljZXNbaV1bMF0gPSByZWFkZXIucmVhZEludDE2KCkgLyAxMDAwO1xyXG4gICAgICAgIHRoaXMudmVydGljZXNbaV1bMV0gPSByZWFkZXIucmVhZEludDE2KCkgLyAxMDAwO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuaGVhbHRoID0gcmVhZGVyLnJlYWRJbnQxNigpO1xyXG4gICAgdGhpcy5tYXhIZWFsdGggPSByZWFkZXIucmVhZEludDE2KCk7XHJcblxyXG4gICAgdGhpcy50aGV0YSA9IHJlYWRlci5yZWFkSW50MTYoKSAvIDEwMDtcclxuICAgIHRoaXMudGV4dHVyZSA9IHJlYWRlci5yZWFkVUludDgoKTtcclxuXHJcbiAgICBzd2l0Y2ggKHJlYWRlci5yZWFkVUludDgoKSkge1xyXG4gICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgdGhpcy5uZXV0cmFsID0gdHJ1ZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAxNjpcclxuICAgICAgICAgICAgdGhpcy5mYXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAxNzpcclxuICAgICAgICAgICAgdGhpcy5uZXV0cmFsID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5mYXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgICB2YXIgZGVsdGEgPSByZWFkZXIuX29mZnNldCAtIHByZXY7XHJcbiAgICAvL2NvbnNvbGUubG9nKFwiREVMVEE6IFwiICsgZGVsdGEpO1xyXG5cclxuICAgIHRoaXMudXBkYXRlcyA9IFtdO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5cclxuUm9jay5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKHJlYWRlcikge1xyXG4gICAgdGhpcy51cGRhdGVUaW1lciA9IDUwO1xyXG5cclxuICAgIHRoaXMub3duZXIgPSByZWFkZXIucmVhZFVJbnQzMigpO1xyXG4gICAgdGhpcy54ID0gcmVhZGVyLnJlYWRVSW50MzIoKSAvIDEwMDtcclxuICAgIHRoaXMueSA9IHJlYWRlci5yZWFkVUludDMyKCkgLyAxMDA7XHJcblxyXG4gICAgdGhpcy5oZWFsdGggPSByZWFkZXIucmVhZEludDE2KCk7XHJcbiAgICB0aGlzLm1heEhlYWx0aCA9IHJlYWRlci5yZWFkSW50MTYoKTtcclxuXHJcbiAgICB0aGlzLnRoZXRhID0gcmVhZGVyLnJlYWRJbnQxNigpIC8gMTAwO1xyXG5cclxuICAgIHRoaXMubmV1dHJhbCA9IGZhbHNlO1xyXG4gICAgdGhpcy5mYXN0ID0gZmFsc2U7XHJcbiAgICBzd2l0Y2ggKHJlYWRlci5yZWFkVUludDgoKSkgeyAvL2ZsYWdzXHJcbiAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICB0aGlzLm5ldXRyYWwgPSB0cnVlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDE2OlxyXG4gICAgICAgICAgICB0aGlzLmZhc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDE3OlxyXG4gICAgICAgICAgICB0aGlzLm5ldXRyYWwgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLmZhc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5Sb2NrLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy51cGRhdGVUaW1lciAtPSAxO1xyXG5cclxuICAgIGlmICh0aGlzLnVwZGF0ZVRpbWVyIDw9IDApIHtcclxuICAgICAgICBkZWxldGUgdGhpcy5jbGllbnQuUk9DS19MSVNUW3RoaXMuaWRdO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgY3R4ID0gdGhpcy5jbGllbnQubWFpbkN0eDtcclxuICAgIHZhciBTQ0FMRSA9IDEwMDtcclxuXHJcblxyXG4gICAgY3R4LmZpbGxTdHlsZSA9IFwicGlua1wiOyAvL2RlZmF1bHQgY29sb3JcclxuICAgIHN3aXRjaCAodGhpcy50ZXh0dXJlKSB7XHJcbiAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJicm93blwiO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImdyZXlcIjtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAzOlxyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJ5ZWxsb3dcIjtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSA0OlxyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJncmVlblwiO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgIH1cclxuXHJcblxyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gIXRoaXMub3duZXIgPyBcImJsdWVcIiA6IFwiZ3JlZW5cIjtcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IHRoaXMuZmFzdCA/IFwicmVkXCIgOiBjdHguc3Ryb2tlU3R5bGU7XHJcblxyXG5cclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuXHJcbiAgICBjdHgudHJhbnNsYXRlKHRoaXMueCwgdGhpcy55KTtcclxuICAgIGN0eC5yb3RhdGUodGhpcy50aGV0YSk7XHJcblxyXG4gICAgaWYgKHRoaXMudmVydGljZXMpIHtcclxuICAgICAgICB2YXIgdiA9IHRoaXMudmVydGljZXM7XHJcbiAgICAgICAgY3R4Lm1vdmVUbyh2WzBdWzBdICogU0NBTEUsIHZbMF1bMV0gKiBTQ0FMRSk7XHJcblxyXG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgdi5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBjdHgubGluZVRvKHZbaV1bMF0gKiBTQ0FMRSwgdltpXVsxXSAqIFNDQUxFKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3R4LmxpbmVUbyh2WzBdWzBdICogU0NBTEUsIHZbMF1bMV0gKiBTQ0FMRSk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgMzAsIDMwKTtcclxuICAgIH1cclxuXHJcbiAgICBjdHguZmlsbCgpO1xyXG4gICAgY3R4LnN0cm9rZSgpO1xyXG5cclxuICAgIGN0eC5yb3RhdGUoMiAqIE1hdGguUEkgLSB0aGlzLnRoZXRhKTtcclxuICAgIGN0eC50cmFuc2xhdGUoLXRoaXMueCwgLXRoaXMueSk7XHJcblxyXG4gICAgY3R4LmNsb3NlUGF0aCgpO1xyXG5cclxuICAgIGlmICh0aGlzLmhlYWx0aCAmJiB0aGlzLm1heEhlYWx0aCAmJiB0aGlzLmhlYWx0aCA+IDApIHsgLy9oZWFsdGggYmFyXHJcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDEwO1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcImJsYWNrXCI7XHJcbiAgICAgICAgY3R4LnJlY3QodGhpcy54LCB0aGlzLnksIDEwMCwgMjApO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcblxyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJncmVlblwiO1xyXG4gICAgICAgIGN0eC5yZWN0KHRoaXMueCwgdGhpcy55LCAxMDAgKiB0aGlzLmhlYWx0aCAvIHRoaXMubWF4SGVhbHRoLCAyMCk7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICB9IC8vZGlzcGxheSBoZWFsdGggYmFyXHJcbn07XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJvY2s7IiwiZnVuY3Rpb24gVGlsZSh0aGlzSW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gdGhpc0luZm8uaWQ7XHJcbiAgICB0aGlzLnggPSB0aGlzSW5mby54O1xyXG4gICAgdGhpcy55ID0gdGhpc0luZm8ueTtcclxuICAgIHRoaXMubGVuZ3RoID0gdGhpc0luZm8ubGVuZ3RoO1xyXG4gICAgdGhpcy5jb2xvciA9IHRoaXNJbmZvLmNvbG9yO1xyXG4gICAgdGhpcy50b3BDb2xvciA9IHtcclxuICAgICAgICByOiB0aGlzLmNvbG9yLnIgKyAxMCxcclxuICAgICAgICBnOiB0aGlzLmNvbG9yLmcgKyAxMCxcclxuICAgICAgICBiOiB0aGlzLmNvbG9yLmIgKyAxMFxyXG4gICAgfTtcclxuICAgIHRoaXMuYm9yZGVyQ29sb3IgPSB7XHJcbiAgICAgICAgcjogdGhpcy5jb2xvci5yIC0gMTAsXHJcbiAgICAgICAgZzogdGhpcy5jb2xvci5nIC0gMTAsXHJcbiAgICAgICAgYjogdGhpcy5jb2xvci5iIC0gMTBcclxuICAgIH07XHJcbiAgICB0aGlzLmFsZXJ0ID0gdGhpc0luZm8uYWxlcnQ7XHJcbiAgICB0aGlzLnJhbmRvbSA9IE1hdGguZmxvb3IoZ2V0UmFuZG9tKDAsIDMpKTtcclxuXHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuVGlsZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKHRoaXNJbmZvKSB7XHJcbiAgICB0aGlzLmNvbG9yID0gdGhpc0luZm8uY29sb3I7XHJcbiAgICB0aGlzLnRvcENvbG9yID0ge1xyXG4gICAgICAgIHI6IHRoaXMuY29sb3IuciArIDEwMCxcclxuICAgICAgICBnOiB0aGlzLmNvbG9yLmcgKyAxMDAsXHJcbiAgICAgICAgYjogdGhpcy5jb2xvci5iICsgMTAwXHJcbiAgICB9O1xyXG4gICAgdGhpcy5ib3JkZXJDb2xvciA9IHtcclxuICAgICAgICByOiB0aGlzLmNvbG9yLnIgLSAxMCxcclxuICAgICAgICBnOiB0aGlzLmNvbG9yLmcgLSAxMCxcclxuICAgICAgICBiOiB0aGlzLmNvbG9yLmIgLSAxMFxyXG4gICAgfTtcclxuICAgIHRoaXMuYWxlcnQgPSB0aGlzSW5mby5hbGVydDtcclxufTtcclxuXHJcblRpbGUucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgY3R4ID0gdGhpcy5jbGllbnQubWFpbkN0eDtcclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuXHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYihcIiArIHRoaXMuYm9yZGVyQ29sb3IuciArIFwiLFwiICsgdGhpcy5ib3JkZXJDb2xvci5nICsgXCIsXCIgKyB0aGlzLmJvcmRlckNvbG9yLmIgKyBcIilcIjtcclxuICAgIGN0eC5saW5lV2lkdGggPSAyMDtcclxuXHJcblxyXG4gICAgdmFyIGdyZCA9IGN0eC5jcmVhdGVMaW5lYXJHcmFkaWVudCh0aGlzLnggKyB0aGlzLmxlbmd0aCAqIDMvNCwgdGhpcy55LCB0aGlzLnggKyB0aGlzLmxlbmd0aC80LCB0aGlzLnkgKyB0aGlzLmxlbmd0aCk7XHJcbiAgICBncmQuYWRkQ29sb3JTdG9wKDAsIFwicmdiKFwiICsgdGhpcy50b3BDb2xvci5yICsgXCIsXCIgKyB0aGlzLnRvcENvbG9yLmcgKyBcIixcIiArIHRoaXMudG9wQ29sb3IuYiArIFwiKVwiKTtcclxuICAgIGdyZC5hZGRDb2xvclN0b3AoMSwgXCJyZ2IoXCIgKyB0aGlzLmNvbG9yLnIgKyBcIixcIiArIHRoaXMuY29sb3IuZyArIFwiLFwiICsgdGhpcy5jb2xvci5iICsgXCIpXCIpO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IGdyZDtcclxuXHJcblxyXG4gICAgY3R4LnJlY3QodGhpcy54ICsgMzAsIHRoaXMueSArIDMwLCB0aGlzLmxlbmd0aCAtIDMwLCB0aGlzLmxlbmd0aCAtIDMwKTtcclxuXHJcbiAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICBjdHguZmlsbCgpO1xyXG5cclxuXHJcbn07XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBUaWxlO1xyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbShtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbjtcclxufSIsIm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgQW5pbWF0aW9uOiByZXF1aXJlKCcuL0FuaW1hdGlvbicpLFxyXG4gICAgUGxheWVyOiByZXF1aXJlKCcuL1BsYXllcicpLFxyXG4gICAgTWluaU1hcDogcmVxdWlyZSgnLi9NaW5pTWFwJyksXHJcbiAgICBUaWxlOiByZXF1aXJlKCcuL1RpbGUnKSxcclxuICAgIFJvY2s6IHJlcXVpcmUoJy4vUm9jaycpXHJcbn07IiwidmFyIENsaWVudCA9IHJlcXVpcmUoJy4vQ2xpZW50LmpzJyk7XHJcbnZhciBNYWluVUkgPSByZXF1aXJlKCcuL3VpL01haW5VSScpO1xyXG5cclxudmFyIGNsaWVudCA9IG5ldyBDbGllbnQoKTtcclxuY2xpZW50LnN0YXJ0KCk7XHJcblxyXG5cclxuXHJcbmRvY3VtZW50Lm9ua2V5ZG93biA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgY2xpZW50LmtleXNbZXZlbnQua2V5Q29kZV0gPSB0cnVlO1xyXG5cclxuICAgIGlmIChldmVudC5rZXlDb2RlID09PSAzMikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiU1BBQ0VcIik7XHJcbiAgICAgICAgY2xpZW50LnNvY2tldC5lbWl0KFwic2hvb3RTZWxmXCIsIHtcclxuICAgICAgICAgICAgaWQ6IGNsaWVudC5TRUxGX0lEXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn0uYmluZCh0aGlzKTtcclxuXHJcbmRvY3VtZW50Lm9ua2V5dXAgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGlmIChldmVudC5rZXlDb2RlID09PSA4NCkge1xyXG4gICAgICAgIGNsaWVudC5tYWluVUkuZ2FtZVVJLmNoYXRVSS50ZXh0SW5wdXQuY2xpY2soKTtcclxuICAgIH1cclxuICAgIGNsaWVudC5rZXlzW2V2ZW50LmtleUNvZGVdID0gZmFsc2U7XHJcbiAgICBjbGllbnQuc29ja2V0LmVtaXQoJ2tleUV2ZW50Jywge2lkOiBldmVudC5rZXlDb2RlLCBzdGF0ZTogZmFsc2V9KTtcclxufTtcclxuXHJcblxyXG4kKHdpbmRvdykuYmluZCgnbW91c2V3aGVlbCBET01Nb3VzZVNjcm9sbCcsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgaWYgKGV2ZW50LmN0cmxLZXkgPT09IHRydWUpIHtcclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgfVxyXG4gICAgaWYgKGNsaWVudC5DSEFUX1NDUk9MTCkge1xyXG4gICAgICAgIGNsaWVudC5DSEFUX1NDUk9MTCA9IGZhbHNlO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBpZihldmVudC5vcmlnaW5hbEV2ZW50LndoZWVsRGVsdGEgLzEyMCA+IDAgJiYgY2xpZW50Lm1haW5TY2FsZUZhY3RvciA8IDIpIHtcclxuICAgICAgICBjbGllbnQubWFpblNjYWxlRmFjdG9yICs9IDAuMDU7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChjbGllbnQubWFpblNjYWxlRmFjdG9yID4gMC4yNSkge1xyXG4gICAgICAgIGNsaWVudC5tYWluU2NhbGVGYWN0b3IgLT0gMC4wNTtcclxuICAgIH1cclxufSk7XHJcblxyXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjb250ZXh0bWVudScsIGZ1bmN0aW9uIChlKSB7IC8vcHJldmVudCByaWdodC1jbGljayBjb250ZXh0IG1lbnVcclxuICAgIGUucHJldmVudERlZmF1bHQoKTtcclxufSwgZmFsc2UpOyIsImRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nOyAgLy8gZmlyZWZveCwgY2hyb21lXHJcbmRvY3VtZW50LmJvZHkuc2Nyb2xsID0gXCJub1wiO1xyXG5cclxudmFyIFBsYXllck5hbWVyVUkgPSByZXF1aXJlKCcuL1BsYXllck5hbWVyVUknKTtcclxudmFyIEdhbWVVSSA9IHJlcXVpcmUoJy4vZ2FtZS9HYW1lVUknKTtcclxuXHJcbmZ1bmN0aW9uIE1haW5VSShjbGllbnQsIHNvY2tldCkge1xyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbiAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcclxuXHJcbiAgICB0aGlzLmdhbWVVSSA9IG5ldyBHYW1lVUkodGhpcy5jbGllbnQsIHRoaXMuc29ja2V0LCB0aGlzKTtcclxuXHJcbiAgICB0aGlzLnBsYXllck5hbWVyVUkgPSBuZXcgUGxheWVyTmFtZXJVSSh0aGlzLmNsaWVudCwgdGhpcy5zb2NrZXQpO1xyXG59XHJcblxyXG5NYWluVUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoaW5mbykge1xyXG4gICAgdmFyIGFjdGlvbiA9IGluZm8uYWN0aW9uO1xyXG4gICAgdmFyIGhvbWU7XHJcbiAgICBpZiAoYWN0aW9uID09PSBcImdhbWVNc2dQcm9tcHRcIikge1xyXG4gICAgICAgIHRoaXMuZ2FtZVVJLmdhbWVNc2dQcm9tcHQub3BlbihpbmZvLm1lc3NhZ2UpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbk1haW5VSS5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoYWN0aW9uKSB7XHJcbiAgICBpZiAoYWN0aW9uID09PSBcImdhbWVNc2dQcm9tcHRcIikge1xyXG4gICAgICAgIHRoaXMuZ2FtZVVJLmdhbWVNc2dQcm9tcHQuY2xvc2UoKTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5NYWluVUkucHJvdG90eXBlLnVwZGF0ZUxlYWRlckJvYXJkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGxlYWRlcmJvYXJkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsZWFkZXJib2FyZFwiKTtcclxuICAgIHZhciBQTEFZRVJfQVJSQVkgPSB0aGlzLmNsaWVudC5QTEFZRVJfQVJSQVk7XHJcblxyXG5cclxuICAgIHZhciBwbGF5ZXJTb3J0ID0gZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgICAgICB2YXIgcGxheWVyQSA9IHRoaXMuY2xpZW50LlBMQVlFUl9MSVNUW2FdO1xyXG4gICAgICAgIHZhciBwbGF5ZXJCID0gdGhpcy5jbGllbnQuUExBWUVSX0xJU1RbYl07XHJcbiAgICAgICAgcmV0dXJuIHBsYXllckEucmFkaXVzIC0gcGxheWVyQi5yYWRpdXM7XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG4gICAgUExBWUVSX0FSUkFZLnNvcnQocGxheWVyU29ydCk7XHJcblxyXG5cclxuICAgIGxlYWRlcmJvYXJkLmlubmVySFRNTCA9IFwiXCI7XHJcbiAgICBmb3IgKHZhciBpID0gUExBWUVSX0FSUkFZLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcbiAgICAgICAgdmFyIHBsYXllciA9IHRoaXMuY2xpZW50LlBMQVlFUl9MSVNUW1BMQVlFUl9BUlJBWVtpXV07XHJcbiAgICAgICAgdmFyIGVudHJ5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcclxuICAgICAgICBlbnRyeS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShwbGF5ZXIubmFtZSArIFwiIC0gXCIgKyBwbGF5ZXIucmFkaXVzKSk7XHJcbiAgICAgICAgbGVhZGVyYm9hcmQuYXBwZW5kQ2hpbGQoZW50cnkpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE1haW5VSTsiLCJmdW5jdGlvbiBQbGF5ZXJOYW1lclVJIChjbGllbnQsIHNvY2tldCkge1xyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbiAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcclxuXHJcbiAgICB0aGlzLmxlYWRlcmJvYXJkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsZWFkZXJib2FyZF9jb250YWluZXJcIik7XHJcbiAgICB0aGlzLm5hbWVCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5hbWVTdWJtaXRcIik7XHJcbiAgICB0aGlzLnBsYXllck5hbWVJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxheWVyTmFtZUlucHV0XCIpO1xyXG4gICAgdGhpcy5wbGF5ZXJOYW1lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxheWVyX25hbWVyXCIpO1xyXG59XHJcblxyXG5QbGF5ZXJOYW1lclVJLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5wbGF5ZXJOYW1lSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDEzKSB7XHJcbiAgICAgICAgICAgIHRoaXMubmFtZUJ0bi5jbGljaygpO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgdGhpcy5uYW1lQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5jbGllbnQubWFpbkNhbnZhcy5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgdGhpcy5sZWFkZXJib2FyZC5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcIm5ld1BsYXllclwiLFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiB0aGlzLnBsYXllck5hbWVJbnB1dC52YWx1ZSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5wbGF5ZXJOYW1lci5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB0aGlzLnBsYXllck5hbWVyLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgIHRoaXMucGxheWVyTmFtZUlucHV0LmZvY3VzKCk7XHJcbiAgICB0aGlzLmxlYWRlcmJvYXJkLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQbGF5ZXJOYW1lclVJOyIsImZ1bmN0aW9uIENoYXRVSShwYXJlbnQpIHtcclxuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xyXG4gICAgdGhpcy50ZW1wbGF0ZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2hhdF9jb250YWluZXJcIik7XHJcbiAgICB0aGlzLnRleHRJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGF0X2lucHV0Jyk7XHJcbiAgICB0aGlzLmNoYXRMaXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NoYXRfbGlzdCcpO1xyXG5cclxuXHJcbiAgICB0aGlzLnRleHRJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnRleHRJbnB1dC5mb2N1cygpO1xyXG5cclxuICAgICAgICB0aGlzLnBhcmVudC5jbGllbnQuQ0hBVF9PUEVOID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLmNoYXRMaXN0LnN0eWxlLmhlaWdodCA9IFwiODAlXCI7XHJcbiAgICAgICAgdGhpcy5jaGF0TGlzdC5zdHlsZS5vdmVyZmxvd1kgPSBcImF1dG9cIjtcclxuXHJcbiAgICAgICAgdGhpcy50ZXh0SW5wdXQuc3R5bGUuYmFja2dyb3VuZCA9IFwicmdiYSgzNCwgNDgsIDcxLCAxKVwiO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuICAgIHRoaXMudGV4dElucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2VuZE1lc3NhZ2UoKTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuXHJcbiAgICB0aGlzLnRlbXBsYXRlLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNld2hlZWwnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5wYXJlbnQuY2xpZW50LkNIQVRfU0NST0xMID0gdHJ1ZTtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgdGhpcy50ZW1wbGF0ZS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5wYXJlbnQuY2xpZW50LkNIQVRfQ0xJQ0sgPSB0cnVlO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxufVxyXG5cclxuQ2hhdFVJLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKG1lc3NhZ2UpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuICAgIHRoaXMuY2xvc2UoKTtcclxufTtcclxuXHJcblxyXG5DaGF0VUkucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy50ZXh0SW5wdXQuYmx1cigpO1xyXG4gICAgdGhpcy5wYXJlbnQuY2xpZW50LkNIQVRfT1BFTiA9IGZhbHNlO1xyXG4gICAgdGhpcy5jaGF0TGlzdC5zdHlsZS5oZWlnaHQgPSBcIjMwJVwiO1xyXG4gICAgdGhpcy5jaGF0TGlzdC5zdHlsZS5iYWNrZ3JvdW5kID0gXCJyZ2JhKDE4MiwgMTkzLCAyMTEsIDAuMDIpXCI7XHJcbiAgICB0aGlzLnRleHRJbnB1dC5zdHlsZS5iYWNrZ3JvdW5kID0gXCJyZ2JhKDE4MiwgMTkzLCAyMTEsIDAuMSlcIjtcclxuICAgIHRoaXMucGFyZW50LmNsaWVudC5DSEFUX1NDUk9MTCA9IGZhbHNlO1xyXG4gICAgJCgnI2NoYXRfbGlzdCcpLmFuaW1hdGUoe3Njcm9sbFRvcDogJCgnI2NoYXRfbGlzdCcpLnByb3AoXCJzY3JvbGxIZWlnaHRcIil9LCAxMDApO1xyXG4gICAgdGhpcy5jaGF0TGlzdC5zdHlsZS5vdmVyZmxvd1kgPSBcIm5vbmVcIjtcclxufTtcclxuXHJcblxyXG5DaGF0VUkucHJvdG90eXBlLmFkZE1lc3NhZ2UgPSBmdW5jdGlvbiAocGFja2V0KSB7XHJcbiAgICB2YXIgZW50cnkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG4gICAgZW50cnkuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUocGFja2V0Lm5hbWUgKyBcIiA6IFwiICsgcGFja2V0LmNoYXRNZXNzYWdlKSk7XHJcbiAgICB0aGlzLmNoYXRMaXN0LmFwcGVuZENoaWxkKGVudHJ5KTtcclxuXHJcbiAgICAkKCcjY2hhdF9saXN0JykuYW5pbWF0ZSh7c2Nyb2xsVG9wOiAkKCcjY2hhdF9saXN0JykucHJvcChcInNjcm9sbEhlaWdodFwiKX0sIDEwMCk7XHJcbn07XHJcblxyXG5cclxuQ2hhdFVJLnByb3RvdHlwZS5zZW5kTWVzc2FnZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBzb2NrZXQgPSB0aGlzLnBhcmVudC5zb2NrZXQ7XHJcblxyXG5cclxuICAgIGlmICh0aGlzLnRleHRJbnB1dC52YWx1ZSAmJiB0aGlzLnRleHRJbnB1dC52YWx1ZSAhPT0gXCJcIikge1xyXG4gICAgICAgIHNvY2tldC5lbWl0KCdjaGF0TWVzc2FnZScsIHtcclxuICAgICAgICAgICAgaWQ6IHRoaXMucGFyZW50LmNsaWVudC5TRUxGX0lELFxyXG4gICAgICAgICAgICBtZXNzYWdlOiB0aGlzLnRleHRJbnB1dC52YWx1ZVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMudGV4dElucHV0LnZhbHVlID0gXCJcIjtcclxuICAgIH1cclxuICAgIHRoaXMuY2xvc2UoKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2hhdFVJO1xyXG5cclxuXHJcbiIsImZ1bmN0aW9uIEdhbWVNc2dQcm9tcHQocGFyZW50KSB7XHJcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuICAgIHRoaXMudGVtcGxhdGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInByb21wdF9jb250YWluZXJcIik7XHJcbiAgICB0aGlzLm1lc3NhZ2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2FtZV9tc2dfcHJvbXB0Jyk7XHJcbn1cclxuXHJcbkdhbWVNc2dQcm9tcHQucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAobWVzc2FnZSkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xyXG4gICAgdGhpcy5tZXNzYWdlLmlubmVySFRNTCA9IG1lc3NhZ2U7XHJcbn07XHJcblxyXG5HYW1lTXNnUHJvbXB0LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBHYW1lTXNnUHJvbXB0O1xyXG5cclxuXHJcbiIsInZhciBHYW1lTXNnUHJvbXB0ID0gcmVxdWlyZSgnLi9HYW1lTXNnUHJvbXB0Jyk7XHJcbnZhciBDaGF0VUkgPSByZXF1aXJlKCcuL0NoYXRVSScpO1xyXG5cclxuZnVuY3Rpb24gR2FtZVVJKGNsaWVudCwgc29ja2V0LCBwYXJlbnQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuICAgIHRoaXMuZ2FtZU1zZ1Byb21wdCA9IG5ldyBHYW1lTXNnUHJvbXB0KHRoaXMpO1xyXG4gICAgdGhpcy5jaGF0VUkgPSBuZXcgQ2hhdFVJKHRoaXMpO1xyXG59XHJcblxyXG5HYW1lVUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBjb25zb2xlLmxvZyhcIk9QRU5JTkcgR0FNRSBVSVwiKTtcclxuICAgIHRoaXMuY2hhdFVJLm9wZW4oKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gIEdhbWVVSTsiXX0=
