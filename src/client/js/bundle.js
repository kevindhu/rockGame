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

    this.SLASH = [];
    this.SLASH_ARRAY = [];
    this.mouseMoveTimer = 0;
    this.updates = [];
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
    var rockLength = reader.readUInt8();

    for (i = 0; i < rockLength; i++) {
        rock = new Entity.Rock(reader, this);
        this.ROCK_LIST[rock.id] = rock;
    }


    var playerLength = reader.readUInt8();

    for (i = 0; i < playerLength; i++) {
        player = new Entity.Player(reader, this);
        this.PLAYER_LIST[player.id] = player;
    }

    var rock2Length = reader.readUInt8();
    for (i = 0; i < rock2Length; i++) {
        var id = reader.readUInt32();
        rock = this.ROCK_LIST[id];


        if (rock) {
            rock.update(reader);
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

    var rock3Length = reader.readUInt8(); //delete rocks
    for (i = 0; i < rock3Length; i++) {
        id = reader.readUInt32();
        delete this.ROCK_LIST[id];
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
    //console.log("LAST STEP: "  + step);


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
    if (!stepRange) {
        return;
    }

    //console.log("CURR STEP: "  + this.currStep);

    if (this.currStep > this.lastStep) {
        console.log("STEP RANGE TOO SMALL: SERVER TOO SLOW");
        return;
    }
    if (this.lastStep - this.currStep > 6) {
        console.log("STEP RANGE TOO LARGE: CLIENT IS TOO SLOW");
        var update = this.findUpdatePacket(this.currStep);
        if (!update) {
            this.currStep += 1;
            return;
        }

        if (update.reader._offset > 10) {
            console.log(this.updates);
        }
        this.applyUpdate(update.reader);
        this.currStep += 1;


        this.updateStep();

    }

    var update = this.findUpdatePacket(this.currStep);
    if (!update) {
        this.currStep += 1;
        return;
    }

    if (update.reader._offset > 10) {
        console.log(this.updates);
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
    this.id = reader.readUInt32();
    this.owner = reader.readUInt32();

    this.x = reader.readUInt32() / 100;
    this.y = reader.readUInt32() / 100;

    this.vertices = [];
    var count = reader.readUInt8();
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

    this.updates = [];

    this.client = client;
}



Rock.prototype.update = function (reader) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2xpZW50L2pzL0JpbmFyeVJlYWRlci5qcyIsInNyYy9jbGllbnQvanMvQ2xpZW50LmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvQW5pbWF0aW9uLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvTWluaU1hcC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L1BsYXllci5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L1JvY2suanMiLCJzcmMvY2xpZW50L2pzL2VudGl0eS9UaWxlLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvaW5kZXguanMiLCJzcmMvY2xpZW50L2pzL2luZGV4LmpzIiwic3JjL2NsaWVudC9qcy91aS9NYWluVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL1BsYXllck5hbWVyVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvQ2hhdFVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9nYW1lL0dhbWVNc2dQcm9tcHQuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvR2FtZVVJLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hnQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL09BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiZnVuY3Rpb24gQmluYXJ5UmVhZGVyKGRhdGEpIHtcclxuICAgIHRoaXMuX29mZnNldCA9IDA7XHJcbiAgICB0aGlzLl9idWZmZXIgPSBuZXcgRGF0YVZpZXcoZGF0YSk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQmluYXJ5UmVhZGVyO1xyXG5cclxuXHJcbkJpbmFyeVJlYWRlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9idWZmZXIuZ2V0SW50OCh0aGlzLl9vZmZzZXQpO1xyXG4gICAgdGhpcy5fb2Zmc2V0ICs9IDE7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn07XHJcblxyXG5CaW5hcnlSZWFkZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB2YWx1ZSA9IHRoaXMuX2J1ZmZlci5nZXRVaW50OCh0aGlzLl9vZmZzZXQpO1xyXG4gICAgdGhpcy5fb2Zmc2V0ICs9IDE7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn07XHJcblxyXG5cclxuQmluYXJ5UmVhZGVyLnByb3RvdHlwZS5yZWFkSW50MTYgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9idWZmZXIuZ2V0SW50MTYodGhpcy5fb2Zmc2V0KTtcclxuICAgIHRoaXMuX29mZnNldCArPSAyO1xyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG59O1xyXG5cclxuQmluYXJ5UmVhZGVyLnByb3RvdHlwZS5yZWFkVUludDE2ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHZhbHVlID0gdGhpcy5fYnVmZmVyLmdldFVpbnQxNih0aGlzLl9vZmZzZXQpO1xyXG4gICAgdGhpcy5fb2Zmc2V0ICs9IDI7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn07XHJcblxyXG5cclxuXHJcbkJpbmFyeVJlYWRlci5wcm90b3R5cGUucmVhZEludDMyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHZhbHVlID0gdGhpcy5fYnVmZmVyLmdldEludDMyKHRoaXMuX29mZnNldCk7XHJcbiAgICB0aGlzLl9vZmZzZXQgKz0gNDtcclxuICAgIHJldHVybiB2YWx1ZTtcclxufTtcclxuXHJcblxyXG5CaW5hcnlSZWFkZXIucHJvdG90eXBlLnJlYWRVSW50MzIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9idWZmZXIuZ2V0VWludDMyKHRoaXMuX29mZnNldCk7XHJcbiAgICB0aGlzLl9vZmZzZXQgKz0gNDtcclxuICAgIHJldHVybiB2YWx1ZTtcclxufTtcclxuXHJcbkJpbmFyeVJlYWRlci5wcm90b3R5cGUuc2tpcEJ5dGVzID0gZnVuY3Rpb24gKGxlbmd0aCkge1xyXG4gICAgdGhpcy5fb2Zmc2V0ICs9IGxlbmd0aDtcclxufTtcclxuXHJcbkJpbmFyeVJlYWRlci5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2J1ZmZlci5ieXRlTGVuZ3RoO1xyXG59O1xyXG5cclxuIiwidmFyIEVudGl0eSA9IHJlcXVpcmUoJy4vZW50aXR5Jyk7XHJcbnZhciBNYWluVUkgPSByZXF1aXJlKCcuL3VpL01haW5VSScpO1xyXG52YXIgQmluYXJ5UmVhZGVyID0gcmVxdWlyZSgnLi9CaW5hcnlSZWFkZXInKTtcclxuXHJcbmZ1bmN0aW9uIENsaWVudCgpIHtcclxuICAgIHRoaXMuU0VMRl9JRCA9IG51bGw7XHJcbiAgICB0aGlzLlNFTEZfUExBWUVSID0gbnVsbDtcclxuICAgIHRoaXMuVFJBSUwgPSBudWxsO1xyXG5cclxuICAgIHRoaXMuU0xBU0ggPSBbXTtcclxuICAgIHRoaXMuU0xBU0hfQVJSQVkgPSBbXTtcclxuICAgIHRoaXMubW91c2VNb3ZlVGltZXIgPSAwO1xyXG4gICAgdGhpcy51cGRhdGVzID0gW107XHJcbiAgICB0aGlzLmluaXQoKTtcclxufVxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5pbml0U29ja2V0KCk7XHJcbiAgICB0aGlzLmluaXRDYW52YXNlcygpO1xyXG4gICAgdGhpcy5pbml0TGlzdHMoKTtcclxuICAgIHRoaXMuaW5pdFZpZXdlcnMoKTtcclxufTtcclxuQ2xpZW50LnByb3RvdHlwZS5pbml0U29ja2V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5zb2NrZXQgPSBpbygpO1xyXG4gICAgdGhpcy5zb2NrZXQudmVyaWZpZWQgPSBmYWxzZTtcclxuXHJcbiAgICB0aGlzLnNvY2tldC5vbignaW5pdFZlcmlmaWNhdGlvbicsIHRoaXMudmVyaWZ5LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMuc29ja2V0Lm9uKCd1cGRhdGVFbnRpdGllcycsIHRoaXMuaGFuZGxlUGFja2V0LmJpbmQodGhpcykpO1xyXG4gICAgdGhpcy5zb2NrZXQub24oJ3VwZGF0ZUJpbmFyeScsIHRoaXMuaGFuZGxlQmluYXJ5LmJpbmQodGhpcykpO1xyXG5cclxuXHJcbiAgICB0aGlzLnNvY2tldC5vbignY2hhdE1lc3NhZ2UnLCB0aGlzLm1haW5VSSk7XHJcbiAgICB0aGlzLnNvY2tldC5vbigncGluZycsIHRoaXMuc2VuZFBvbmcuYmluZCh0aGlzKSk7XHJcbiAgICB0aGlzLnNvY2tldC5vbignZmluYWxQaW5nJywgZnVuY3Rpb24gKG1lc3NhZ2UpIHtcclxuICAgICAgICAvL2NvbnNvbGUubG9nKFwiUElORzogXCIgKyBtZXNzYWdlKTtcclxuICAgIH0pO1xyXG5cclxuXHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLnNlbmRQb25nID0gZnVuY3Rpb24gKG1lc3NhZ2UpIHtcclxuICAgIHRoaXMuc29ja2V0LmVtaXQoXCJwb25nMTIzXCIsIG1lc3NhZ2UpO1xyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdENhbnZhc2VzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5tYWluQ2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtYWluX2NhbnZhc1wiKTtcclxuICAgIHRoaXMubWFpbkNhbnZhcy5zdHlsZS5ib3JkZXIgPSAnMXB4IHNvbGlkICMwMDAwMDAnO1xyXG4gICAgdGhpcy5tYWluQ2FudmFzLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgdGhpcy5tYWluQ3R4ID0gdGhpcy5tYWluQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuXHJcblxyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBpZiAoIXRoaXMuU0VMRl9JRCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciB4ID0gKChldmVudC54IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldFdpZHRoICogMTAwMCkgLSB0aGlzLm1haW5DYW52YXMud2lkdGggLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcbiAgICAgICAgdmFyIHkgPSAoKGV2ZW50LnkgLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0SGVpZ2h0ICogNTAwKSAtIHRoaXMubWFpbkNhbnZhcy5oZWlnaHQgLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcblxyXG5cclxuICAgICAgICBpZiAoTWF0aC5hYnMoeCkgKyBNYXRoLmFicyh5KSA8IDIwMCkge1xyXG4gICAgICAgICAgICB0aGlzLnBsYXllckNsaWNrZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLmNpcmNsZUNvbnN0cnVjdCA9IFtdO1xyXG4gICAgICAgICAgICB0aGlzLmNpcmNsZVN0YWdlQ291bnQgPSAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5jbGlja1RlbXAgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLmNsaWNrVGltZXIgPSAwO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKSk7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBpZiAoIXRoaXMuU0VMRl9JRCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciB4ID0gKChldmVudC54IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldFdpZHRoICogMTAwMCkgLSB0aGlzLm1haW5DYW52YXMud2lkdGggLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcbiAgICAgICAgdmFyIHkgPSAoKGV2ZW50LnkgLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0SGVpZ2h0ICogNTAwKSAtIHRoaXMubWFpbkNhbnZhcy5oZWlnaHQgLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcblxyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJzaG9vdFNlbGZcIiwge1xyXG4gICAgICAgICAgICBpZDogdGhpcy5TRUxGX0lELFxyXG4gICAgICAgICAgICB4OiB4LFxyXG4gICAgICAgICAgICB5OiB5XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuY2xpY2tUZW1wID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5jbGlja1RpbWVyID0gMDtcclxuXHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGlmICghdGhpcy5TRUxGX1BMQVlFUikge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgeCA9ICgoZXZlbnQueCAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRXaWR0aCAqIDEwMDApIC1cclxuICAgICAgICAgICAgdGhpcy5tYWluQ2FudmFzLndpZHRoIC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yO1xyXG4gICAgICAgIHZhciB5ID0gKChldmVudC55IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldEhlaWdodCAqIDUwMCkgLVxyXG4gICAgICAgICAgICB0aGlzLm1haW5DYW52YXMuaGVpZ2h0IC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yO1xyXG5cclxuICAgICAgICBpZiAoc3F1YXJlKHgpICsgc3F1YXJlKHkpID4gc3F1YXJlKHRoaXMuU0VMRl9QTEFZRVIucmFuZ2UpKSB7IC8vaWYgbm90IGluIHJhbmdlXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5wcmUpIHtcclxuICAgICAgICAgICAgdGhpcy5wcmUgPSB7eDogeCwgeTogeX1cclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoc3F1YXJlKHRoaXMucHJlLnggLSB4KSArIHNxdWFyZSh0aGlzLnByZS55IC0geSkgPiA4MCkge1xyXG4gICAgICAgICAgICB0aGlzLnByZSA9IHt4OiB4LCB5OiB5fTtcclxuXHJcbiAgICAgICAgICAgIGlmIChNYXRoLmFicyh4KSA8IDUwICYmIE1hdGguYWJzKHkpIDwgNTApIHtcclxuICAgICAgICAgICAgICAgIHggPSAwO1xyXG4gICAgICAgICAgICAgICAgeSA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuc29ja2V0LmVtaXQoJ21vdmUnLCB7XHJcbiAgICAgICAgICAgICAgICBpZDogdGhpcy5TRUxGX0lELFxyXG4gICAgICAgICAgICAgICAgeDogeCxcclxuICAgICAgICAgICAgICAgIHk6IHlcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLlNFTEZfUExBWUVSLnNldE1vdmUoeCwgeSk7XHJcbiAgICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxufTtcclxuXHJcblxyXG5DbGllbnQucHJvdG90eXBlLnNlbmRDaXJjbGUgPSBmdW5jdGlvbiAoY29uc3RydWN0KSB7XHJcblxyXG4gICAgdmFyIHJhZGlpTm9ybWFsID0gZnVuY3Rpb24gKHZlY3Rvcikge1xyXG4gICAgICAgIGlmICghdmVjdG9yKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gKHZlY3Rvci54ICogdmVjdG9yLnggKyB2ZWN0b3IueSAqIHZlY3Rvci55KTtcclxuICAgIH07XHJcblxyXG4gICAgdmFyIG1heFJhZGl1cyA9IE1hdGguc3FydChNYXRoLm1heChcclxuICAgICAgICByYWRpaU5vcm1hbChjb25zdHJ1Y3RbMF0pLFxyXG4gICAgICAgIHJhZGlpTm9ybWFsKGNvbnN0cnVjdFsxXSksXHJcbiAgICAgICAgcmFkaWlOb3JtYWwoY29uc3RydWN0WzJdKSxcclxuICAgICAgICByYWRpaU5vcm1hbChjb25zdHJ1Y3RbM10pKSk7XHJcblxyXG4gICAgaWYgKG1heFJhZGl1cykge1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJjcmVhdGVDaXJjbGVcIiwge1xyXG4gICAgICAgICAgICBpZDogdGhpcy5TRUxGX0lELFxyXG4gICAgICAgICAgICByYWRpdXM6IG1heFJhZGl1c1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5pbml0TGlzdHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLlBMQVlFUl9MSVNUID0ge307XHJcbiAgICB0aGlzLlRJTEVfTElTVCA9IHt9O1xyXG4gICAgdGhpcy5ST0NLX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuQVNURVJPSURfTElTVCA9IHt9O1xyXG4gICAgdGhpcy5BTklNQVRJT05fTElTVCA9IHt9O1xyXG5cclxuICAgIHRoaXMuUExBWUVSX0FSUkFZID0gW107XHJcbn07XHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdFZpZXdlcnMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmtleXMgPSBbXTtcclxuICAgIHRoaXMuc2NhbGVGYWN0b3IgPSAxO1xyXG4gICAgdGhpcy5tYWluU2NhbGVGYWN0b3IgPSAwLjU7XHJcbiAgICB0aGlzLm1haW5VSSA9IG5ldyBNYWluVUkodGhpcywgdGhpcy5zb2NrZXQpO1xyXG4gICAgdGhpcy5tYWluVUkucGxheWVyTmFtZXJVSS5vcGVuKCk7XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLnZlcmlmeSA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICBpZiAoIXRoaXMuc29ja2V0LnZlcmlmaWVkKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJWRVJJRklFRCBDTElFTlRcIik7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcInZlcmlmeVwiLCB7fSk7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQudmVyaWZpZWQgPSB0cnVlO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuYXBwbHlVcGRhdGUgPSBmdW5jdGlvbiAocmVhZGVyKSB7XHJcbiAgICB2YXIgcm9ja0xlbmd0aCA9IHJlYWRlci5yZWFkVUludDgoKTtcclxuXHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgcm9ja0xlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgcm9jayA9IG5ldyBFbnRpdHkuUm9jayhyZWFkZXIsIHRoaXMpO1xyXG4gICAgICAgIHRoaXMuUk9DS19MSVNUW3JvY2suaWRdID0gcm9jaztcclxuICAgIH1cclxuXHJcblxyXG4gICAgdmFyIHBsYXllckxlbmd0aCA9IHJlYWRlci5yZWFkVUludDgoKTtcclxuXHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgcGxheWVyTGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBwbGF5ZXIgPSBuZXcgRW50aXR5LlBsYXllcihyZWFkZXIsIHRoaXMpO1xyXG4gICAgICAgIHRoaXMuUExBWUVSX0xJU1RbcGxheWVyLmlkXSA9IHBsYXllcjtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgcm9jazJMZW5ndGggPSByZWFkZXIucmVhZFVJbnQ4KCk7XHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgcm9jazJMZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBpZCA9IHJlYWRlci5yZWFkVUludDMyKCk7XHJcbiAgICAgICAgcm9jayA9IHRoaXMuUk9DS19MSVNUW2lkXTtcclxuXHJcblxyXG4gICAgICAgIGlmIChyb2NrKSB7XHJcbiAgICAgICAgICAgIHJvY2sudXBkYXRlKHJlYWRlcik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHZhciBwbGF5ZXIyTGVuZ3RoID0gcmVhZGVyLnJlYWRVSW50OCgpO1xyXG4gICAgZm9yIChpID0gMDsgaSA8IHBsYXllcjJMZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGlkID0gcmVhZGVyLnJlYWRVSW50MzIoKTtcclxuICAgICAgICB2YXIgcGxheWVyID0gdGhpcy5QTEFZRVJfTElTVFtpZF07XHJcbiAgICAgICAgaWYgKHBsYXllcikge1xyXG4gICAgICAgICAgICBwbGF5ZXIudXBkYXRlKHJlYWRlcik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHZhciByb2NrM0xlbmd0aCA9IHJlYWRlci5yZWFkVUludDgoKTsgLy9kZWxldGUgcm9ja3NcclxuICAgIGZvciAoaSA9IDA7IGkgPCByb2NrM0xlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWQgPSByZWFkZXIucmVhZFVJbnQzMigpO1xyXG4gICAgICAgIGRlbGV0ZSB0aGlzLlJPQ0tfTElTVFtpZF07XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHBsYXllcjNMZW5ndGggPSByZWFkZXIucmVhZFVJbnQ4KCk7XHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgcGxheWVyM0xlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWQgPSByZWFkZXIucmVhZFVJbnQzMigpO1xyXG4gICAgICAgIGRlbGV0ZSB0aGlzLlBMQVlFUl9MSVNUW2lkXTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5DbGllbnQucHJvdG90eXBlLmhhbmRsZUJpbmFyeSA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICB2YXIgcmVhZGVyID0gbmV3IEJpbmFyeVJlYWRlcihkYXRhKTtcclxuICAgIGlmIChyZWFkZXIubGVuZ3RoKCkgPCAxKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBzdGVwID0gcmVhZGVyLnJlYWRVSW50MzIoKTtcclxuXHJcbiAgICBpZiAoIXRoaXMuaW5pdGlhbFN0ZXApIHtcclxuICAgICAgICB0aGlzLmluaXRpYWxTdGVwID0gc3RlcDtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHRoaXMuaW5pdGlhbFN0ZXAgPT09IHN0ZXApIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG5cclxuICAgIHRoaXMubGFzdFN0ZXAgPSBzdGVwO1xyXG4gICAgLy9jb25zb2xlLmxvZyhcIkxBU1QgU1RFUDogXCIgICsgc3RlcCk7XHJcblxyXG5cclxuICAgIGlmICghdGhpcy5jdXJyU3RlcCkge1xyXG4gICAgICAgIHRoaXMuY3VyclN0ZXAgPSBzdGVwIC0gMztcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnVwZGF0ZXMucHVzaCh7XHJcbiAgICAgICAgc3RlcDogc3RlcCxcclxuICAgICAgICByZWFkZXI6IHJlYWRlclxyXG4gICAgfSk7XHJcblxyXG4gICAgcmVhZGVyLnN0ZXAgPSBzdGVwO1xyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaGFuZGxlUGFja2V0ID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgIHZhciBwYWNrZXQsIGk7XHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHBhY2tldCA9IGRhdGFbaV07XHJcbiAgICAgICAgc3dpdGNoIChwYWNrZXQubWFzdGVyKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJhZGRcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMuYWRkRW50aXRpZXMocGFja2V0KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwiZGVsZXRlXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRlbGV0ZUVudGl0aWVzKHBhY2tldCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcInVwZGF0ZVwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVFbnRpdGllcyhwYWNrZXQpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuYWRkRW50aXRpZXMgPSBmdW5jdGlvbiAocGFja2V0KSB7XHJcbiAgICB2YXIgYWRkRW50aXR5ID0gZnVuY3Rpb24gKHBhY2tldCwgbGlzdCwgZW50aXR5LCBhcnJheSkge1xyXG4gICAgICAgIGlmICghcGFja2V0KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGlzdFtwYWNrZXQuaWRdID0gbmV3IGVudGl0eShwYWNrZXQsIHRoaXMpO1xyXG4gICAgICAgIGlmIChhcnJheSAmJiBhcnJheS5pbmRleE9mKHBhY2tldC5pZCkgPT09IC0xKSB7XHJcbiAgICAgICAgICAgIGFycmF5LnB1c2gocGFja2V0LmlkKTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG4gICAgc3dpdGNoIChwYWNrZXQuY2xhc3MpIHtcclxuICAgICAgICBjYXNlIFwidGlsZUluZm9cIjpcclxuICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5USUxFX0xJU1QsIEVudGl0eS5UaWxlKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInBsYXllckluZm9cIjpcclxuICAgICAgICAgICAgLy9hZGRFbnRpdHkocGFja2V0LCB0aGlzLlBMQVlFUl9MSVNULCBFbnRpdHkuUGxheWVyLCB0aGlzLlBMQVlFUl9BUlJBWSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJhbmltYXRpb25JbmZvXCI6XHJcbiAgICAgICAgICAgIGlmIChwYWNrZXQuaWQgPT09IHRoaXMuU0VMRl9JRCkge1xyXG4gICAgICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5BTklNQVRJT05fTElTVCwgRW50aXR5LkFuaW1hdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcIlVJSW5mb1wiOlxyXG4gICAgICAgICAgICBpZiAodGhpcy5TRUxGX0lEID09PSBwYWNrZXQucGxheWVySWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFpblVJLm9wZW4ocGFja2V0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwic2VsZklkXCI6XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5TRUxGX0lEKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLlNFTEZfSUQgPSBwYWNrZXQuc2VsZklkO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tYWluVUkuZ2FtZVVJLm9wZW4oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiY2hhdEluZm9cIjpcclxuICAgICAgICAgICAgdGhpcy5tYWluVUkuZ2FtZVVJLmNoYXRVSS5hZGRNZXNzYWdlKHBhY2tldCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS51cGRhdGVFbnRpdGllcyA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcclxuICAgIGZ1bmN0aW9uIHVwZGF0ZUVudGl0eShwYWNrZXQsIGxpc3QpIHtcclxuICAgICAgICBpZiAoIXBhY2tldCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBlbnRpdHkgPSBsaXN0W3BhY2tldC5pZF07XHJcbiAgICAgICAgaWYgKCFlbnRpdHkpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbnRpdHkudXBkYXRlKHBhY2tldCk7XHJcbiAgICB9XHJcblxyXG4gICAgc3dpdGNoIChwYWNrZXQuY2xhc3MpIHtcclxuICAgICAgICBjYXNlIFwicGxheWVySW5mb1wiOlxyXG4gICAgICAgICAgICAvL3VwZGF0ZUVudGl0eShwYWNrZXQsIHRoaXMuUExBWUVSX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwidGlsZUluZm9cIjpcclxuICAgICAgICAgICAgdXBkYXRlRW50aXR5KHBhY2tldCwgdGhpcy5USUxFX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiVUlJbmZvXCI6XHJcbiAgICAgICAgICAgIGlmICh0aGlzLlNFTEZfSUQgPT09IHBhY2tldC5wbGF5ZXJJZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tYWluVUkudXBkYXRlKHBhY2tldCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmRlbGV0ZUVudGl0aWVzID0gZnVuY3Rpb24gKHBhY2tldCkge1xyXG4gICAgdmFyIGRlbGV0ZUVudGl0eSA9IGZ1bmN0aW9uIChwYWNrZXQsIGxpc3QsIGFycmF5KSB7XHJcbiAgICAgICAgaWYgKCFwYWNrZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYXJyYXkpIHtcclxuICAgICAgICAgICAgdmFyIGluZGV4ID0gYXJyYXkuaW5kZXhPZihwYWNrZXQuaWQpO1xyXG4gICAgICAgICAgICBhcnJheS5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkZWxldGUgbGlzdFtwYWNrZXQuaWRdO1xyXG4gICAgfTtcclxuXHJcbiAgICBzd2l0Y2ggKHBhY2tldC5jbGFzcykge1xyXG4gICAgICAgIGNhc2UgXCJ0aWxlSW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLlRJTEVfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJwbGF5ZXJJbmZvXCI6XHJcbiAgICAgICAgICAgIC8vZGVsZXRlRW50aXR5KHBhY2tldCwgdGhpcy5QTEFZRVJfTElTVCwgdGhpcy5QTEFZRVJfQVJSQVkpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiYW5pbWF0aW9uSW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLkFOSU1BVElPTl9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcIlVJSW5mb1wiOlxyXG4gICAgICAgICAgICBpZiAodGhpcy5TRUxGX0lEID09PSBwYWNrZXQuaWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFpblVJLmNsb3NlKHBhY2tldC5hY3Rpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5kcmF3U2NlbmUgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgdGhpcy5tYWluVUkudXBkYXRlTGVhZGVyQm9hcmQoKTtcclxuXHJcbiAgICB2YXIgaWQ7XHJcbiAgICB2YXIgZW50aXR5TGlzdCA9IFtcclxuICAgICAgICB0aGlzLlRJTEVfTElTVCxcclxuICAgICAgICB0aGlzLlBMQVlFUl9MSVNULFxyXG4gICAgICAgIHRoaXMuQVNURVJPSURfTElTVCxcclxuICAgICAgICB0aGlzLkFOSU1BVElPTl9MSVNULFxyXG4gICAgICAgIHRoaXMuUk9DS19MSVNUXHJcbiAgICBdO1xyXG5cclxuICAgIHZhciBpbkJvdW5kcyA9IGZ1bmN0aW9uIChwbGF5ZXIsIHgsIHkpIHtcclxuICAgICAgICB2YXIgcmFuZ2UgPSB0aGlzLm1haW5DYW52YXMud2lkdGggLyAoMC43ICogdGhpcy5zY2FsZUZhY3Rvcik7XHJcbiAgICAgICAgcmV0dXJuIHggPCAocGxheWVyLnggKyByYW5nZSkgJiYgeCA+IChwbGF5ZXIueCAtIHJhbmdlKVxyXG4gICAgICAgICAgICAmJiB5IDwgKHBsYXllci55ICsgcmFuZ2UpICYmIHkgPiAocGxheWVyLnkgLSByYW5nZSk7XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG4gICAgdmFyIHRyYW5zbGF0ZVNjZW5lID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMubWFpbkN0eC5zZXRUcmFuc2Zvcm0oMSwgMCwgMCwgMSwgMCwgMCk7XHJcbiAgICAgICAgdGhpcy5zY2FsZUZhY3RvciA9IGxlcnAodGhpcy5zY2FsZUZhY3RvciwgdGhpcy5tYWluU2NhbGVGYWN0b3IsIDAuMyk7XHJcbiAgICAgICAgdGhpcy5tYWluQ3R4LnRyYW5zbGF0ZSh0aGlzLm1haW5DYW52YXMud2lkdGggLyAyLCB0aGlzLm1haW5DYW52YXMuaGVpZ2h0IC8gMik7XHJcbiAgICAgICAgdGhpcy5tYWluQ3R4LnNjYWxlKHRoaXMuc2NhbGVGYWN0b3IsIHRoaXMuc2NhbGVGYWN0b3IpO1xyXG4gICAgICAgIHRoaXMubWFpbkN0eC50cmFuc2xhdGUoLXRoaXMuU0VMRl9QTEFZRVIueCwgLXRoaXMuU0VMRl9QTEFZRVIueSk7XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG5cclxuICAgIHRoaXMuU0VMRl9QTEFZRVIudGljaygpO1xyXG5cclxuXHJcbiAgICB0cmFuc2xhdGVTY2VuZSgpO1xyXG4gICAgdGhpcy5tYWluQ3R4LmNsZWFyUmVjdCgwLCAwLCAxMTAwMCwgMTEwMDApO1xyXG5cclxuICAgIHRoaXMubWFpbkN0eC5maWxsU3R5bGUgPSBcIiMxZDFmMjFcIjtcclxuICAgIHRoaXMubWFpbkN0eC5maWxsUmVjdCgwLCAwLCAyMDAwMCwgMjAwMDApO1xyXG5cclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVudGl0eUxpc3QubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgbGlzdCA9IGVudGl0eUxpc3RbaV07XHJcbiAgICAgICAgZm9yIChpZCBpbiBsaXN0KSB7XHJcbiAgICAgICAgICAgIHZhciBlbnRpdHkgPSBsaXN0W2lkXTtcclxuICAgICAgICAgICAgaWYgKGluQm91bmRzKHRoaXMuU0VMRl9QTEFZRVIsIGVudGl0eS54LCBlbnRpdHkueSkpIHtcclxuICAgICAgICAgICAgICAgIGVudGl0eS5zaG93KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5UUkFJTCAmJiAhdGhpcy5hY3RpdmUpIHtcclxuICAgICAgICB0aGlzLlRSQUlMLnNob3coKTtcclxuICAgIH1cclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuY2xpZW50VXBkYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy51cGRhdGVTdGVwKCk7XHJcblxyXG5cclxuICAgIGlmICghdGhpcy5TRUxGX1BMQVlFUikge1xyXG4gICAgICAgIGlmICh0aGlzLlNFTEZfSUQpIHtcclxuICAgICAgICAgICAgdGhpcy5TRUxGX1BMQVlFUiA9IHRoaXMuUExBWUVSX0xJU1RbdGhpcy5TRUxGX0lEXTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHRoaXMuZHJhd1NjZW5lKCk7XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLnVwZGF0ZVN0ZXAgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgc3RlcFJhbmdlID0gdGhpcy5sYXN0U3RlcCAtIHRoaXMuY3VyclN0ZXA7XHJcbiAgICBpZiAoIXN0ZXBSYW5nZSkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvL2NvbnNvbGUubG9nKFwiQ1VSUiBTVEVQOiBcIiAgKyB0aGlzLmN1cnJTdGVwKTtcclxuXHJcbiAgICBpZiAodGhpcy5jdXJyU3RlcCA+IHRoaXMubGFzdFN0ZXApIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlNURVAgUkFOR0UgVE9PIFNNQUxMOiBTRVJWRVIgVE9PIFNMT1dcIik7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMubGFzdFN0ZXAgLSB0aGlzLmN1cnJTdGVwID4gNikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiU1RFUCBSQU5HRSBUT08gTEFSR0U6IENMSUVOVCBJUyBUT08gU0xPV1wiKTtcclxuICAgICAgICB2YXIgdXBkYXRlID0gdGhpcy5maW5kVXBkYXRlUGFja2V0KHRoaXMuY3VyclN0ZXApO1xyXG4gICAgICAgIGlmICghdXBkYXRlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3VyclN0ZXAgKz0gMTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHVwZGF0ZS5yZWFkZXIuX29mZnNldCA+IDEwKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMudXBkYXRlcyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuYXBwbHlVcGRhdGUodXBkYXRlLnJlYWRlcik7XHJcbiAgICAgICAgdGhpcy5jdXJyU3RlcCArPSAxO1xyXG5cclxuXHJcbiAgICAgICAgdGhpcy51cGRhdGVTdGVwKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHZhciB1cGRhdGUgPSB0aGlzLmZpbmRVcGRhdGVQYWNrZXQodGhpcy5jdXJyU3RlcCk7XHJcbiAgICBpZiAoIXVwZGF0ZSkge1xyXG4gICAgICAgIHRoaXMuY3VyclN0ZXAgKz0gMTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHVwZGF0ZS5yZWFkZXIuX29mZnNldCA+IDEwKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2codGhpcy51cGRhdGVzKTtcclxuICAgIH1cclxuICAgIHRoaXMuYXBwbHlVcGRhdGUodXBkYXRlLnJlYWRlcik7XHJcbiAgICB0aGlzLmN1cnJTdGVwICs9IDE7XHJcbn07XHJcblxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5maW5kVXBkYXRlUGFja2V0ID0gZnVuY3Rpb24gKHN0ZXApIHtcclxuICAgIHZhciBsZW5ndGggPSB0aGlzLnVwZGF0ZXMubGVuZ3RoO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSBsZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgIHZhciB1cGRhdGUgPSB0aGlzLnVwZGF0ZXNbaV07XHJcblxyXG4gICAgICAgIGlmICh1cGRhdGUuc3RlcCA9PT0gc3RlcCkge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZXMuc3BsaWNlKDAsIGkpO1xyXG4gICAgICAgICAgICByZXR1cm4gdXBkYXRlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNvbnNvbGUubG9nKCdDT1VMRCBOT1QgRklORCBQQUNLRVQgRk9SIFNURVA6ICcgKyBzdGVwKTtcclxuICAgIHJldHVybiBudWxsO1xyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBzZXRJbnRlcnZhbCh0aGlzLmNsaWVudFVwZGF0ZS5iaW5kKHRoaXMpLCAxMDAwIC8gMjUpO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gbGVycChhLCBiLCByYXRpbykge1xyXG4gICAgcmV0dXJuIGEgKyByYXRpbyAqIChiIC0gYSk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBzcXVhcmUoYSkge1xyXG4gICAgcmV0dXJuIGEgKiBhO1xyXG59XHJcblxyXG5mdW5jdGlvbiB2ZWN0b3JOb3JtYWwoYSkge1xyXG4gICAgcmV0dXJuIGEueCAqIGEueCArIGEueSAqIGEueTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDbGllbnQ7IiwiZnVuY3Rpb24gQW5pbWF0aW9uKGFuaW1hdGlvbkluZm8sIGNsaWVudCkge1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy50eXBlID0gYW5pbWF0aW9uSW5mby50eXBlO1xyXG4gICAgdGhpcy5pZCA9IGFuaW1hdGlvbkluZm8uaWQ7XHJcbiAgICB0aGlzLnggPSBhbmltYXRpb25JbmZvLng7XHJcbiAgICB0aGlzLnkgPSBhbmltYXRpb25JbmZvLnk7XHJcbiAgICAvL3RoaXMudGhldGEgPSAxNTtcclxuICAgIHRoaXMudGltZXIgPSBnZXRSYW5kb20oMTAsIDE0KTtcclxuXHJcbiAgICBpZiAodGhpcy50eXBlID09PSBcInNsYXNoXCIpIHtcclxuICAgICAgICB0aGlzLnNsYXNoSWQgPSBhbmltYXRpb25JbmZvLnNsYXNoSWQ7XHJcbiAgICAgICAgdmFyIHNsYXNoID0gdGhpcy5jbGllbnQuZmluZFNsYXNoKHRoaXMuc2xhc2hJZCk7XHJcbiAgICAgICAgdGhpcy5wcmUgPSBzbGFzaFswXTtcclxuICAgICAgICB0aGlzLnBvc3QgPSBzbGFzaFsxXTtcclxuICAgIH1cclxufVxyXG5cclxuXHJcbkFuaW1hdGlvbi5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5tYWluQ3R4O1xyXG4gICAgdmFyIHBsYXllciA9IHRoaXMuY2xpZW50LlNFTEZfUExBWUVSO1xyXG5cclxuICAgIGlmICh0aGlzLnR5cGUgPT09IFwic2xhc2hcIiAmJiBwbGF5ZXIpIHtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcblxyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiYSgyNDIsIDMxLCA2NiwgMC42KVwiO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAxNTtcclxuXHJcbiAgICAgICAgY3R4Lm1vdmVUbyhwbGF5ZXIueCArIHRoaXMucHJlLngsIHBsYXllci55ICsgdGhpcy5wcmUueSk7XHJcbiAgICAgICAgY3R4LmxpbmVUbyhwbGF5ZXIueCArIHRoaXMucG9zdC54LCBwbGF5ZXIueSArIHRoaXMucG9zdC55KTtcclxuXHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIH1cclxuICAgIFxyXG5cclxuICAgIGlmICh0aGlzLnR5cGUgPT09IFwic2hhcmREZWF0aFwiKSB7IC8vZGVwcmVjYXRlZCBidXQgY291bGQgcHVsbCBzb21lIGdvb2QgY29kZSBmcm9tIGhlcmVcclxuICAgICAgICBjdHguZm9udCA9IDYwIC0gdGhpcy50aW1lciArIFwicHggQXJpYWxcIjtcclxuICAgICAgICBjdHguc2F2ZSgpO1xyXG4gICAgICAgIGN0eC50cmFuc2xhdGUodGhpcy54LCB0aGlzLnkpO1xyXG4gICAgICAgIGN0eC5yb3RhdGUoLU1hdGguUEkgLyA1MCAqIHRoaXMudGhldGEpO1xyXG4gICAgICAgIGN0eC50ZXh0QWxpZ24gPSBcImNlbnRlclwiO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcInJnYmEoMjU1LCAxNjgsIDg2LCBcIiArIHRoaXMudGltZXIgKiAxMCAvIDEwMCArIFwiKVwiO1xyXG4gICAgICAgIGN0eC5maWxsVGV4dCh0aGlzLm5hbWUsIDAsIDE1KTtcclxuICAgICAgICBjdHgucmVzdG9yZSgpO1xyXG5cclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCIjMDAwMDAwXCI7XHJcbiAgICAgICAgdGhpcy50aGV0YSA9IGxlcnAodGhpcy50aGV0YSwgMCwgMC4wOCk7XHJcbiAgICAgICAgdGhpcy54ID0gbGVycCh0aGlzLngsIHRoaXMuZW5kWCwgMC4xKTtcclxuICAgICAgICB0aGlzLnkgPSBsZXJwKHRoaXMueSwgdGhpcy5lbmRZLCAwLjEpO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICB0aGlzLnRpbWVyLS07XHJcbiAgICBpZiAodGhpcy50aW1lciA8PSAwKSB7XHJcbiAgICAgICAgZGVsZXRlIHRoaXMuY2xpZW50LkFOSU1BVElPTl9MSVNUW3RoaXMuaWRdO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbShtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbjtcclxufVxyXG5cclxuZnVuY3Rpb24gbGVycChhLCBiLCByYXRpbykge1xyXG4gICAgcmV0dXJuIGEgKyByYXRpbyAqIChiIC0gYSk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQW5pbWF0aW9uO1xyXG5cclxuXHJcbiIsImZ1bmN0aW9uIE1pbmlNYXAoKSB7IC8vZGVwcmVjYXRlZCwgcGxlYXNlIHVwZGF0ZVxyXG59XHJcblxyXG5NaW5pTWFwLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgaWYgKG1hcFRpbWVyIDw9IDAgfHwgc2VydmVyTWFwID09PSBudWxsKSB7XHJcbiAgICAgICAgdmFyIHRpbGVMZW5ndGggPSBNYXRoLnNxcnQoT2JqZWN0LnNpemUoVElMRV9MSVNUKSk7XHJcbiAgICAgICAgaWYgKHRpbGVMZW5ndGggPT09IDAgfHwgIXNlbGZQbGF5ZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgaW1nRGF0YSA9IG1haW5DdHguY3JlYXRlSW1hZ2VEYXRhKHRpbGVMZW5ndGgsIHRpbGVMZW5ndGgpO1xyXG4gICAgICAgIHZhciB0aWxlO1xyXG4gICAgICAgIHZhciB0aWxlUkdCO1xyXG4gICAgICAgIHZhciBpID0gMDtcclxuXHJcblxyXG4gICAgICAgIGZvciAodmFyIGlkIGluIFRJTEVfTElTVCkge1xyXG4gICAgICAgICAgICB0aWxlUkdCID0ge307XHJcbiAgICAgICAgICAgIHRpbGUgPSBUSUxFX0xJU1RbaWRdO1xyXG4gICAgICAgICAgICBpZiAodGlsZS5jb2xvciAmJiB0aWxlLmFsZXJ0IHx8IGluQm91bmRzKHNlbGZQbGF5ZXIsIHRpbGUueCwgdGlsZS55KSkge1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5yID0gdGlsZS5jb2xvci5yO1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5nID0gdGlsZS5jb2xvci5nO1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5iID0gdGlsZS5jb2xvci5iO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5yID0gMDtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuZyA9IDA7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLmIgPSAwO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpbWdEYXRhLmRhdGFbaV0gPSB0aWxlUkdCLnI7XHJcbiAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpICsgMV0gPSB0aWxlUkdCLmc7XHJcbiAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpICsgMl0gPSB0aWxlUkdCLmI7XHJcbiAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpICsgM10gPSAyNTU7XHJcbiAgICAgICAgICAgIGkgKz0gNDtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc29sZS5sb2coNDAwIC8gT2JqZWN0LnNpemUoVElMRV9MSVNUKSk7XHJcbiAgICAgICAgaW1nRGF0YSA9IHNjYWxlSW1hZ2VEYXRhKGltZ0RhdGEsIE1hdGguZmxvb3IoNDAwIC8gT2JqZWN0LnNpemUoVElMRV9MSVNUKSksIG1haW5DdHgpO1xyXG5cclxuICAgICAgICBtTWFwQ3R4LnB1dEltYWdlRGF0YShpbWdEYXRhLCAwLCAwKTtcclxuXHJcbiAgICAgICAgbU1hcEN0eFJvdC5yb3RhdGUoOTAgKiBNYXRoLlBJIC8gMTgwKTtcclxuICAgICAgICBtTWFwQ3R4Um90LnNjYWxlKDEsIC0xKTtcclxuICAgICAgICBtTWFwQ3R4Um90LmRyYXdJbWFnZShtTWFwLCAwLCAwKTtcclxuICAgICAgICBtTWFwQ3R4Um90LnNjYWxlKDEsIC0xKTtcclxuICAgICAgICBtTWFwQ3R4Um90LnJvdGF0ZSgyNzAgKiBNYXRoLlBJIC8gMTgwKTtcclxuXHJcbiAgICAgICAgc2VydmVyTWFwID0gbU1hcFJvdDtcclxuICAgICAgICBtYXBUaW1lciA9IDI1O1xyXG4gICAgfVxyXG5cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIG1hcFRpbWVyIC09IDE7XHJcbiAgICB9XHJcblxyXG4gICAgbWFpbkN0eC5kcmF3SW1hZ2Uoc2VydmVyTWFwLCA4MDAsIDQwMCk7XHJcbn07IC8vZGVwcmVjYXRlZFxyXG5cclxuTWluaU1hcC5wcm90b3R5cGUuc2NhbGVJbWFnZURhdGEgPSBmdW5jdGlvbiAoaW1hZ2VEYXRhLCBzY2FsZSwgbWFpbkN0eCkge1xyXG4gICAgdmFyIHNjYWxlZCA9IG1haW5DdHguY3JlYXRlSW1hZ2VEYXRhKGltYWdlRGF0YS53aWR0aCAqIHNjYWxlLCBpbWFnZURhdGEuaGVpZ2h0ICogc2NhbGUpO1xyXG4gICAgdmFyIHN1YkxpbmUgPSBtYWluQ3R4LmNyZWF0ZUltYWdlRGF0YShzY2FsZSwgMSkuZGF0YTtcclxuICAgIGZvciAodmFyIHJvdyA9IDA7IHJvdyA8IGltYWdlRGF0YS5oZWlnaHQ7IHJvdysrKSB7XHJcbiAgICAgICAgZm9yICh2YXIgY29sID0gMDsgY29sIDwgaW1hZ2VEYXRhLndpZHRoOyBjb2wrKykge1xyXG4gICAgICAgICAgICB2YXIgc291cmNlUGl4ZWwgPSBpbWFnZURhdGEuZGF0YS5zdWJhcnJheShcclxuICAgICAgICAgICAgICAgIChyb3cgKiBpbWFnZURhdGEud2lkdGggKyBjb2wpICogNCxcclxuICAgICAgICAgICAgICAgIChyb3cgKiBpbWFnZURhdGEud2lkdGggKyBjb2wpICogNCArIDRcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgZm9yICh2YXIgeCA9IDA7IHggPCBzY2FsZTsgeCsrKSBzdWJMaW5lLnNldChzb3VyY2VQaXhlbCwgeCAqIDQpXHJcbiAgICAgICAgICAgIGZvciAodmFyIHkgPSAwOyB5IDwgc2NhbGU7IHkrKykge1xyXG4gICAgICAgICAgICAgICAgdmFyIGRlc3RSb3cgPSByb3cgKiBzY2FsZSArIHk7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGVzdENvbCA9IGNvbCAqIHNjYWxlO1xyXG4gICAgICAgICAgICAgICAgc2NhbGVkLmRhdGEuc2V0KHN1YkxpbmUsIChkZXN0Um93ICogc2NhbGVkLndpZHRoICsgZGVzdENvbCkgKiA0KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzY2FsZWQ7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE1pbmlNYXA7IiwiZnVuY3Rpb24gUGxheWVyKHJlYWRlciwgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gcmVhZGVyLnJlYWRVSW50MzIoKTsgLy9wbGF5ZXIgaWRcclxuICAgIHRoaXMueCA9IHJlYWRlci5yZWFkVUludDMyKCkgLyAxMDA7IC8vcmVhbCB4XHJcbiAgICB0aGlzLnkgPSByZWFkZXIucmVhZFVJbnQzMigpIC8gMTAwOyAvL3JlYWwgeVxyXG5cclxuICAgIHRoaXMucmFkaXVzID0gcmVhZGVyLnJlYWRVSW50MTYoKTsgLy9yYWRpdXNcclxuICAgIHRoaXMubmFtZSA9IHJlYWRlci5yZWFkVUludDMyKCk7IC8vbmFtZVxyXG5cclxuICAgIHRoaXMudmVydGljZXMgPSBbXTsgICAgICAgICAgICAvL3ZlcnRpY2VzXHJcbiAgICB2YXIgY291bnQgPSByZWFkZXIucmVhZFVJbnQ4KCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcclxuICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0gW107XHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXVswXSA9IHJlYWRlci5yZWFkSW50MTYoKSAvIDEwMDA7XHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXVsxXSA9IHJlYWRlci5yZWFkSW50MTYoKSAvIDEwMDA7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5oZWFsdGggPSByZWFkZXIucmVhZFVJbnQ4KCk7IC8vaGVhbHRoXHJcbiAgICB0aGlzLm1heEhlYWx0aCA9IHJlYWRlci5yZWFkVUludDgoKTsgLy9tYXhIZWFsdGhcclxuXHJcbiAgICB0aGlzLnRoZXRhID0gcmVhZGVyLnJlYWRJbnQxNigpIC8gMTAwOyAvL3RoZXRhXHJcbiAgICB0aGlzLmxldmVsID0gcmVhZGVyLnJlYWRVSW50OCgpOyAvL2xldmVsXHJcblxyXG4gICAgc3dpdGNoIChyZWFkZXIucmVhZFVJbnQ4KCkpIHsgICAgLy9mbGFnc1xyXG4gICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgdGhpcy52dWxuZXJhYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAxNjpcclxuICAgICAgICAgICAgdGhpcy5zaG9vdGluZyA9IHRydWU7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMTc6XHJcbiAgICAgICAgICAgIHRoaXMudnVsbmVyYWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvb3RpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxuXHJcbiAgICBpZiAoIXRoaXMuY2xpZW50LlNFTEZfUExBWUVSICYmIHRoaXMuaWQgPT09IHRoaXMuY2xpZW50LlNFTEZfSUQpIHtcclxuICAgICAgICB0aGlzLmNsaWVudC5TRUxGX1BMQVlFUiA9IHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5jb2xsaXNpb25UaW1lciA9IDA7XHJcblxyXG4gICAgdGhpcy5tb3ZlciA9IHtcclxuICAgICAgICB4OiAwLFxyXG4gICAgICAgIHk6IDBcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5yZWFsTW92ZXIgPSB7XHJcbiAgICAgICAgeDogMCxcclxuICAgICAgICB5OiAwXHJcbiAgICB9O1xyXG59XHJcblxyXG5cclxuUGxheWVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAocmVhZGVyKSB7XHJcbiAgICB0aGlzLnggPSByZWFkZXIucmVhZFVJbnQzMigpIC8gMTAwOyAvL3JlYWwgeFxyXG4gICAgdGhpcy55ID0gcmVhZGVyLnJlYWRVSW50MzIoKSAvIDEwMDsgLy9yZWFsIHlcclxuXHJcbiAgICB0aGlzLnJhZGl1cyA9IHJlYWRlci5yZWFkVUludDE2KCk7IC8vcmFkaXVzXHJcbiAgICB0aGlzLm5hbWUgPSByZWFkZXIucmVhZEludDMyKCk7IC8vbmFtZVxyXG5cclxuICAgIHRoaXMuaGVhbHRoID0gcmVhZGVyLnJlYWRVSW50OCgpOyAvL2hlYWx0aFxyXG4gICAgdGhpcy5tYXhIZWFsdGggPSByZWFkZXIucmVhZFVJbnQ4KCk7IC8vbWF4SGVhbHRoXHJcblxyXG4gICAgdGhpcy50aGV0YSA9IHJlYWRlci5yZWFkSW50MTYoKSAvIDEwMDsgLy90aGV0YVxyXG4gICAgdGhpcy5sZXZlbCA9IHJlYWRlci5yZWFkVUludDgoKTsgLy9sZXZlbFxyXG5cclxuICAgIHZhciBmbGFncyA9IHJlYWRlci5yZWFkVUludDE2KCk7XHJcblxyXG4gICAgdGhpcy5zaG9vdGluZyA9IE51bWJlcihTdHJpbmcoZmxhZ3MpLmNoYXJBdCgwKSkgPT09IDE7XHJcbiAgICB0aGlzLnZ1bG5lcmFibGUgPSBOdW1iZXIoU3RyaW5nKGZsYWdzKS5jaGFyQXQoMSkpID09PSAxO1xyXG4gICAgdGhpcy5jb2xsaWRpbmcgPSBOdW1iZXIoU3RyaW5nKGZsYWdzKS5jaGFyQXQoMikpID09PSAxO1xyXG5cclxufTtcclxuXHJcblxyXG5QbGF5ZXIucHJvdG90eXBlLnRpY2sgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAodGhpcy5yZWFsTW92ZXIpIHtcclxuICAgICAgICB0aGlzLm1vdmVyLnggPSBsZXJwKHRoaXMubW92ZXIueCwgdGhpcy5yZWFsTW92ZXIueCwgMC4xNSk7XHJcbiAgICAgICAgdGhpcy5tb3Zlci55ID0gbGVycCh0aGlzLm1vdmVyLnksIHRoaXMucmVhbE1vdmVyLnksIDAuMTUpO1xyXG4gICAgfVxyXG4gICAgLy90aGlzLm1vdmUodGhpcy5tb3Zlci54LCB0aGlzLm1vdmVyLnkpO1xyXG59O1xyXG5cclxuXHJcblBsYXllci5wcm90b3R5cGUuc2V0TW92ZSA9IGZ1bmN0aW9uICh4LCB5KSB7XHJcbiAgICB0aGlzLnJlYWxNb3ZlciA9IHtcclxuICAgICAgICB4OiB4LFxyXG4gICAgICAgIHk6IHlcclxuICAgIH07XHJcbn07XHJcblxyXG5cclxuUGxheWVyLnByb3RvdHlwZS5nZXRUaGV0YSA9IGZ1bmN0aW9uICh0YXJnZXQsIG9yaWdpbikge1xyXG4gICAgdGhpcy50aGV0YSA9IE1hdGguYXRhbjIodGFyZ2V0LnkgLSBvcmlnaW4ueSwgdGFyZ2V0LnggLSBvcmlnaW4ueCkgJSAoMiAqIE1hdGguUEkpO1xyXG59O1xyXG5cclxuUGxheWVyLnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24gKHgsIHkpIHtcclxuICAgIHZhciB0YXJnZXQgPSB7XHJcbiAgICAgICAgeDogdGhpcy54ICsgeCxcclxuICAgICAgICB5OiB0aGlzLnkgKyB5XHJcbiAgICB9O1xyXG4gICAgdmFyIG9yaWdpbiA9IHtcclxuICAgICAgICB4OiB0aGlzLngsXHJcbiAgICAgICAgeTogdGhpcy55XHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuZ2V0VGhldGEodGFyZ2V0LCBvcmlnaW4pO1xyXG5cclxuXHJcbiAgICB2YXIgbm9ybWFsVmVsID0gbm9ybWFsKHgsIHkpO1xyXG4gICAgaWYgKG5vcm1hbFZlbCA8IDEpIHtcclxuICAgICAgICBub3JtYWxWZWwgPSAxO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciB2ZWxCdWZmZXIgPSAzOyAvL2NoYW5nZSBzb29uXHJcblxyXG4gICAgdGhpcy54ICs9IDEwMCAqIHggLyBub3JtYWxWZWwgLyB2ZWxCdWZmZXI7XHJcbiAgICB0aGlzLnkgKz0gMTAwICogeSAvIG5vcm1hbFZlbCAvIHZlbEJ1ZmZlcjtcclxuXHJcbn07XHJcblxyXG5cclxuUGxheWVyLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50Lm1haW5DdHg7XHJcbiAgICB2YXIgc2VsZklkID0gdGhpcy5jbGllbnQuU0VMRl9JRDtcclxuICAgIHZhciBmaWxsQWxwaGE7XHJcbiAgICB2YXIgc3Ryb2tlQWxwaGE7XHJcbiAgICB2YXIgaTtcclxuXHJcblxyXG4gICAgZmlsbEFscGhhID0gdGhpcy5oZWFsdGggLyAoNCAqIHRoaXMubWF4SGVhbHRoKTtcclxuICAgIHN0cm9rZUFscGhhID0gMTtcclxuXHJcbiAgICBjdHguZm9udCA9IFwiMjBweCBBcmlhbFwiO1xyXG5cclxuXHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoMjUyLCAxMDIsIDM3LFwiICsgc3Ryb2tlQWxwaGEgKyBcIilcIjtcclxuICAgIGlmICh0aGlzLnNob290aW5nKSB7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiZ3JlZW5cIjtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHRoaXMudnVsbmVyYWJsZSkge1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcInJlZFwiO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwicmdiYSgxMjMsMCwwLFwiICsgZmlsbEFscGhhICsgXCIpXCI7XHJcbiAgICB9XHJcbiAgICBjdHgubGluZVdpZHRoID0gMTA7XHJcblxyXG5cclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuXHJcbiAgICBjdHgudHJhbnNsYXRlKHRoaXMueCwgdGhpcy55KTtcclxuICAgIGN0eC5yb3RhdGUodGhpcy50aGV0YSk7XHJcblxyXG4gICAgaWYgKHRoaXMudmVydGljZXMpIHtcclxuICAgICAgICB2YXIgdiA9IHRoaXMudmVydGljZXM7XHJcbiAgICAgICAgY3R4Lm1vdmVUbyh2WzBdWzBdICogdGhpcy5yYWRpdXMsIHZbMF1bMV0gKiB0aGlzLnJhZGl1cyk7XHJcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IHYubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgY3R4LmxpbmVUbyh2W2ldWzBdICogdGhpcy5yYWRpdXMsIHZbaV1bMV0gKiB0aGlzLnJhZGl1cyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGN0eC5saW5lVG8odlswXVswXSAqIHRoaXMucmFkaXVzLCB2WzBdWzFdICogdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgfVxyXG4gICAgY3R4LmZpbGwoKTtcclxuICAgIGN0eC5zdHJva2UoKTtcclxuXHJcbiAgICBjdHgucm90YXRlKDIgKiBNYXRoLlBJIC0gdGhpcy50aGV0YSk7XHJcblxyXG5cclxuICAgIGlmICghdGhpcy52dWxuZXJhYmxlKSB7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwicmdiYSgwLCAyNTUsIDAsIDAuMylcIjtcclxuICAgICAgICBjdHguYXJjKDAsIDAsIHRoaXMucmFkaXVzICogMiwgMCwgMiAqIE1hdGguUEkpO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICB9XHJcblxyXG4gICAgY3R4LnRyYW5zbGF0ZSgtdGhpcy54LCAtdGhpcy55KTtcclxuXHJcblxyXG4gICAgY3R4LmNsb3NlUGF0aCgpO1xyXG5cclxuXHJcbiAgICBpZiAoMSA9PT0gMykge1xyXG4gICAgICAgIHZhciByYWRpdXMgPSB0aGlzLnJhZGl1cztcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4Lm1vdmVUbyh0aGlzLnggKyByYWRpdXMsIHRoaXMueSk7XHJcbiAgICAgICAgdmFyIHRoZXRhLCB4LCB5O1xyXG4gICAgICAgIGZvciAoaSA9IE1hdGguUEkgLyA0OyBpIDw9IDIgKiBNYXRoLlBJIC0gTWF0aC5QSSAvIDQ7IGkgKz0gTWF0aC5QSSAvIDQpIHtcclxuICAgICAgICAgICAgdGhldGEgPSBpO1xyXG4gICAgICAgICAgICB4ID0gcmFkaXVzICogTWF0aC5jb3ModGhldGEpO1xyXG4gICAgICAgICAgICB5ID0gcmFkaXVzICogTWF0aC5zaW4odGhldGEpO1xyXG4gICAgICAgICAgICBjdHgubGluZVRvKHRoaXMueCArIHgsIHRoaXMueSArIHkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdHgubGluZVRvKHRoaXMueCArIHJhZGl1cywgdGhpcy55ICsgMyk7XHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGN0eC5maWxsU3R5bGUgPSBcIiNmZjlkNjBcIjtcclxuICAgIGN0eC5maWxsVGV4dCh0aGlzLm5hbWUsIHRoaXMueCwgdGhpcy55ICsgNzApO1xyXG5cclxuXHJcbiAgICBpZiAodGhpcy5oZWFsdGggJiYgdGhpcy5tYXhIZWFsdGggJiYgdGhpcy5oZWFsdGggPiAwKSB7IC8vaGVhbHRoIGJhclxyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAxMDtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJibGFja1wiO1xyXG4gICAgICAgIGN0eC5yZWN0KHRoaXMueCwgdGhpcy55LCAxMDAsIDIwKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG5cclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiZ3JlZW5cIjtcclxuICAgICAgICBjdHgucmVjdCh0aGlzLngsIHRoaXMueSwgMTAwICogdGhpcy5oZWFsdGggLyB0aGlzLm1heEhlYWx0aCwgMjApO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfSAvL2Rpc3BsYXkgaGVhbHRoIGJhclxyXG5cclxuXHJcbiAgICBjdHguY2xvc2VQYXRoKCk7XHJcbn07XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gbm9ybWFsKHgsIHkpIHtcclxuICAgIHJldHVybiBNYXRoLnNxcnQoeCAqIHggKyB5ICogeSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxlcnAoYSwgYiwgcmF0aW8pIHtcclxuICAgIHJldHVybiBhICsgcmF0aW8gKiAoYiAtIGEpO1xyXG59XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQbGF5ZXI7IiwiZnVuY3Rpb24gUm9jayhyZWFkZXIsIGNsaWVudCkge1xyXG4gICAgdGhpcy5pZCA9IHJlYWRlci5yZWFkVUludDMyKCk7XHJcbiAgICB0aGlzLm93bmVyID0gcmVhZGVyLnJlYWRVSW50MzIoKTtcclxuXHJcbiAgICB0aGlzLnggPSByZWFkZXIucmVhZFVJbnQzMigpIC8gMTAwO1xyXG4gICAgdGhpcy55ID0gcmVhZGVyLnJlYWRVSW50MzIoKSAvIDEwMDtcclxuXHJcbiAgICB0aGlzLnZlcnRpY2VzID0gW107XHJcbiAgICB2YXIgY291bnQgPSByZWFkZXIucmVhZFVJbnQ4KCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcclxuICAgICAgICB0aGlzLnZlcnRpY2VzW2ldID0gW107XHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXVswXSA9IHJlYWRlci5yZWFkSW50MTYoKSAvIDEwMDA7XHJcbiAgICAgICAgdGhpcy52ZXJ0aWNlc1tpXVsxXSA9IHJlYWRlci5yZWFkSW50MTYoKSAvIDEwMDA7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5oZWFsdGggPSByZWFkZXIucmVhZEludDE2KCk7XHJcbiAgICB0aGlzLm1heEhlYWx0aCA9IHJlYWRlci5yZWFkSW50MTYoKTtcclxuXHJcbiAgICB0aGlzLnRoZXRhID0gcmVhZGVyLnJlYWRJbnQxNigpIC8gMTAwO1xyXG4gICAgdGhpcy50ZXh0dXJlID0gcmVhZGVyLnJlYWRVSW50OCgpO1xyXG5cclxuICAgIHN3aXRjaCAocmVhZGVyLnJlYWRVSW50OCgpKSB7XHJcbiAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICB0aGlzLm5ldXRyYWwgPSB0cnVlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDE2OlxyXG4gICAgICAgICAgICB0aGlzLmZhc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDE3OlxyXG4gICAgICAgICAgICB0aGlzLm5ldXRyYWwgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLmZhc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnVwZGF0ZXMgPSBbXTtcclxuXHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuXHJcblxyXG5Sb2NrLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAocmVhZGVyKSB7XHJcbiAgICB0aGlzLm93bmVyID0gcmVhZGVyLnJlYWRVSW50MzIoKTtcclxuICAgIHRoaXMueCA9IHJlYWRlci5yZWFkVUludDMyKCkgLyAxMDA7XHJcbiAgICB0aGlzLnkgPSByZWFkZXIucmVhZFVJbnQzMigpIC8gMTAwO1xyXG5cclxuICAgIHRoaXMuaGVhbHRoID0gcmVhZGVyLnJlYWRJbnQxNigpO1xyXG4gICAgdGhpcy5tYXhIZWFsdGggPSByZWFkZXIucmVhZEludDE2KCk7XHJcblxyXG4gICAgdGhpcy50aGV0YSA9IHJlYWRlci5yZWFkSW50MTYoKSAvIDEwMDtcclxuXHJcbiAgICB0aGlzLm5ldXRyYWwgPSBmYWxzZTtcclxuICAgIHRoaXMuZmFzdCA9IGZhbHNlO1xyXG4gICAgc3dpdGNoIChyZWFkZXIucmVhZFVJbnQ4KCkpIHsgLy9mbGFnc1xyXG4gICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgdGhpcy5uZXV0cmFsID0gdHJ1ZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAxNjpcclxuICAgICAgICAgICAgdGhpcy5mYXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAxNzpcclxuICAgICAgICAgICAgdGhpcy5uZXV0cmFsID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5mYXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuUm9jay5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5tYWluQ3R4O1xyXG4gICAgdmFyIFNDQUxFID0gMTAwO1xyXG5cclxuXHJcbiAgICBjdHguZmlsbFN0eWxlID0gXCJwaW5rXCI7IC8vZGVmYXVsdCBjb2xvclxyXG4gICAgc3dpdGNoICh0aGlzLnRleHR1cmUpIHtcclxuICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImJyb3duXCI7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiZ3JleVwiO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDM6XHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcInllbGxvd1wiO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDQ6XHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImdyZWVuXCI7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSAhdGhpcy5vd25lciA/IFwiYmx1ZVwiIDogXCJncmVlblwiO1xyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5mYXN0ID8gXCJyZWRcIiA6IGN0eC5zdHJva2VTdHlsZTtcclxuXHJcblxyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG5cclxuICAgIGN0eC50cmFuc2xhdGUodGhpcy54LCB0aGlzLnkpO1xyXG4gICAgY3R4LnJvdGF0ZSh0aGlzLnRoZXRhKTtcclxuXHJcbiAgICBpZiAodGhpcy52ZXJ0aWNlcykge1xyXG4gICAgICAgIHZhciB2ID0gdGhpcy52ZXJ0aWNlcztcclxuICAgICAgICBjdHgubW92ZVRvKHZbMF1bMF0gKiBTQ0FMRSwgdlswXVsxXSAqIFNDQUxFKTtcclxuXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCB2Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGN0eC5saW5lVG8odltpXVswXSAqIFNDQUxFLCB2W2ldWzFdICogU0NBTEUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdHgubGluZVRvKHZbMF1bMF0gKiBTQ0FMRSwgdlswXVsxXSAqIFNDQUxFKTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCAzMCwgMzApO1xyXG4gICAgfVxyXG5cclxuICAgIGN0eC5maWxsKCk7XHJcbiAgICBjdHguc3Ryb2tlKCk7XHJcblxyXG4gICAgY3R4LnJvdGF0ZSgyICogTWF0aC5QSSAtIHRoaXMudGhldGEpO1xyXG4gICAgY3R4LnRyYW5zbGF0ZSgtdGhpcy54LCAtdGhpcy55KTtcclxuXHJcbiAgICBjdHguY2xvc2VQYXRoKCk7XHJcblxyXG4gICAgaWYgKHRoaXMuaGVhbHRoICYmIHRoaXMubWF4SGVhbHRoICYmIHRoaXMuaGVhbHRoID4gMCkgeyAvL2hlYWx0aCBiYXJcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gMTA7XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiYmxhY2tcIjtcclxuICAgICAgICBjdHgucmVjdCh0aGlzLngsIHRoaXMueSwgMTAwLCAyMCk7XHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuXHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImdyZWVuXCI7XHJcbiAgICAgICAgY3R4LnJlY3QodGhpcy54LCB0aGlzLnksIDEwMCAqIHRoaXMuaGVhbHRoIC8gdGhpcy5tYXhIZWFsdGgsIDIwKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIH0gLy9kaXNwbGF5IGhlYWx0aCBiYXJcclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb20obWluLCBtYXgpIHtcclxuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW47XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUm9jazsiLCJmdW5jdGlvbiBUaWxlKHRoaXNJbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMuaWQgPSB0aGlzSW5mby5pZDtcclxuICAgIHRoaXMueCA9IHRoaXNJbmZvLng7XHJcbiAgICB0aGlzLnkgPSB0aGlzSW5mby55O1xyXG4gICAgdGhpcy5sZW5ndGggPSB0aGlzSW5mby5sZW5ndGg7XHJcbiAgICB0aGlzLmNvbG9yID0gdGhpc0luZm8uY29sb3I7XHJcbiAgICB0aGlzLnRvcENvbG9yID0ge1xyXG4gICAgICAgIHI6IHRoaXMuY29sb3IuciArIDEwLFxyXG4gICAgICAgIGc6IHRoaXMuY29sb3IuZyArIDEwLFxyXG4gICAgICAgIGI6IHRoaXMuY29sb3IuYiArIDEwXHJcbiAgICB9O1xyXG4gICAgdGhpcy5ib3JkZXJDb2xvciA9IHtcclxuICAgICAgICByOiB0aGlzLmNvbG9yLnIgLSAxMCxcclxuICAgICAgICBnOiB0aGlzLmNvbG9yLmcgLSAxMCxcclxuICAgICAgICBiOiB0aGlzLmNvbG9yLmIgLSAxMFxyXG4gICAgfTtcclxuICAgIHRoaXMuYWxlcnQgPSB0aGlzSW5mby5hbGVydDtcclxuICAgIHRoaXMucmFuZG9tID0gTWF0aC5mbG9vcihnZXRSYW5kb20oMCwgMykpO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5UaWxlLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAodGhpc0luZm8pIHtcclxuICAgIHRoaXMuY29sb3IgPSB0aGlzSW5mby5jb2xvcjtcclxuICAgIHRoaXMudG9wQ29sb3IgPSB7XHJcbiAgICAgICAgcjogdGhpcy5jb2xvci5yICsgMTAwLFxyXG4gICAgICAgIGc6IHRoaXMuY29sb3IuZyArIDEwMCxcclxuICAgICAgICBiOiB0aGlzLmNvbG9yLmIgKyAxMDBcclxuICAgIH07XHJcbiAgICB0aGlzLmJvcmRlckNvbG9yID0ge1xyXG4gICAgICAgIHI6IHRoaXMuY29sb3IuciAtIDEwLFxyXG4gICAgICAgIGc6IHRoaXMuY29sb3IuZyAtIDEwLFxyXG4gICAgICAgIGI6IHRoaXMuY29sb3IuYiAtIDEwXHJcbiAgICB9O1xyXG4gICAgdGhpcy5hbGVydCA9IHRoaXNJbmZvLmFsZXJ0O1xyXG59O1xyXG5cclxuVGlsZS5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5tYWluQ3R4O1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG5cclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiKFwiICsgdGhpcy5ib3JkZXJDb2xvci5yICsgXCIsXCIgKyB0aGlzLmJvcmRlckNvbG9yLmcgKyBcIixcIiArIHRoaXMuYm9yZGVyQ29sb3IuYiArIFwiKVwiO1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IDIwO1xyXG5cclxuXHJcbiAgICB2YXIgZ3JkID0gY3R4LmNyZWF0ZUxpbmVhckdyYWRpZW50KHRoaXMueCArIHRoaXMubGVuZ3RoICogMy80LCB0aGlzLnksIHRoaXMueCArIHRoaXMubGVuZ3RoLzQsIHRoaXMueSArIHRoaXMubGVuZ3RoKTtcclxuICAgIGdyZC5hZGRDb2xvclN0b3AoMCwgXCJyZ2IoXCIgKyB0aGlzLnRvcENvbG9yLnIgKyBcIixcIiArIHRoaXMudG9wQ29sb3IuZyArIFwiLFwiICsgdGhpcy50b3BDb2xvci5iICsgXCIpXCIpO1xyXG4gICAgZ3JkLmFkZENvbG9yU3RvcCgxLCBcInJnYihcIiArIHRoaXMuY29sb3IuciArIFwiLFwiICsgdGhpcy5jb2xvci5nICsgXCIsXCIgKyB0aGlzLmNvbG9yLmIgKyBcIilcIik7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gZ3JkO1xyXG5cclxuXHJcbiAgICBjdHgucmVjdCh0aGlzLnggKyAzMCwgdGhpcy55ICsgMzAsIHRoaXMubGVuZ3RoIC0gMzAsIHRoaXMubGVuZ3RoIC0gMzApO1xyXG5cclxuICAgIGN0eC5zdHJva2UoKTtcclxuICAgIGN0eC5maWxsKCk7XHJcblxyXG5cclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRpbGU7XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59IiwibW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICBBbmltYXRpb246IHJlcXVpcmUoJy4vQW5pbWF0aW9uJyksXHJcbiAgICBQbGF5ZXI6IHJlcXVpcmUoJy4vUGxheWVyJyksXHJcbiAgICBNaW5pTWFwOiByZXF1aXJlKCcuL01pbmlNYXAnKSxcclxuICAgIFRpbGU6IHJlcXVpcmUoJy4vVGlsZScpLFxyXG4gICAgUm9jazogcmVxdWlyZSgnLi9Sb2NrJylcclxufTsiLCJ2YXIgQ2xpZW50ID0gcmVxdWlyZSgnLi9DbGllbnQuanMnKTtcclxudmFyIE1haW5VSSA9IHJlcXVpcmUoJy4vdWkvTWFpblVJJyk7XHJcblxyXG52YXIgY2xpZW50ID0gbmV3IENsaWVudCgpO1xyXG5jbGllbnQuc3RhcnQoKTtcclxuXHJcblxyXG5cclxuZG9jdW1lbnQub25rZXlkb3duID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBjbGllbnQua2V5c1tldmVudC5rZXlDb2RlXSA9IHRydWU7XHJcblxyXG4gICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDMyKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJTUEFDRVwiKTtcclxuICAgICAgICBjbGllbnQuc29ja2V0LmVtaXQoXCJzaG9vdFNlbGZcIiwge1xyXG4gICAgICAgICAgICBpZDogY2xpZW50LlNFTEZfSURcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufS5iaW5kKHRoaXMpO1xyXG5cclxuZG9jdW1lbnQub25rZXl1cCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDg0KSB7XHJcbiAgICAgICAgY2xpZW50Lm1haW5VSS5nYW1lVUkuY2hhdFVJLnRleHRJbnB1dC5jbGljaygpO1xyXG4gICAgfVxyXG4gICAgY2xpZW50LmtleXNbZXZlbnQua2V5Q29kZV0gPSBmYWxzZTtcclxuICAgIGNsaWVudC5zb2NrZXQuZW1pdCgna2V5RXZlbnQnLCB7aWQ6IGV2ZW50LmtleUNvZGUsIHN0YXRlOiBmYWxzZX0pO1xyXG59O1xyXG5cclxuXHJcbiQod2luZG93KS5iaW5kKCdtb3VzZXdoZWVsIERPTU1vdXNlU2Nyb2xsJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBpZiAoZXZlbnQuY3RybEtleSA9PT0gdHJ1ZSkge1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICB9XHJcbiAgICBpZiAoY2xpZW50LkNIQVRfU0NST0xMKSB7XHJcbiAgICAgICAgY2xpZW50LkNIQVRfU0NST0xMID0gZmFsc2U7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGlmKGV2ZW50Lm9yaWdpbmFsRXZlbnQud2hlZWxEZWx0YSAvMTIwID4gMCAmJiBjbGllbnQubWFpblNjYWxlRmFjdG9yIDwgMikge1xyXG4gICAgICAgIGNsaWVudC5tYWluU2NhbGVGYWN0b3IgKz0gMC4wNTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGNsaWVudC5tYWluU2NhbGVGYWN0b3IgPiAwLjI1KSB7XHJcbiAgICAgICAgY2xpZW50Lm1haW5TY2FsZUZhY3RvciAtPSAwLjA1O1xyXG4gICAgfVxyXG59KTtcclxuXHJcbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NvbnRleHRtZW51JywgZnVuY3Rpb24gKGUpIHsgLy9wcmV2ZW50IHJpZ2h0LWNsaWNrIGNvbnRleHQgbWVudVxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG59LCBmYWxzZSk7IiwiZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbic7ICAvLyBmaXJlZm94LCBjaHJvbWVcclxuZG9jdW1lbnQuYm9keS5zY3JvbGwgPSBcIm5vXCI7XHJcblxyXG52YXIgUGxheWVyTmFtZXJVSSA9IHJlcXVpcmUoJy4vUGxheWVyTmFtZXJVSScpO1xyXG52YXIgR2FtZVVJID0gcmVxdWlyZSgnLi9nYW1lL0dhbWVVSScpO1xyXG5cclxuZnVuY3Rpb24gTWFpblVJKGNsaWVudCwgc29ja2V0KSB7XHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxuICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xyXG5cclxuICAgIHRoaXMuZ2FtZVVJID0gbmV3IEdhbWVVSSh0aGlzLmNsaWVudCwgdGhpcy5zb2NrZXQsIHRoaXMpO1xyXG5cclxuICAgIHRoaXMucGxheWVyTmFtZXJVSSA9IG5ldyBQbGF5ZXJOYW1lclVJKHRoaXMuY2xpZW50LCB0aGlzLnNvY2tldCk7XHJcbn1cclxuXHJcbk1haW5VSS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uIChpbmZvKSB7XHJcbiAgICB2YXIgYWN0aW9uID0gaW5mby5hY3Rpb247XHJcbiAgICB2YXIgaG9tZTtcclxuICAgIGlmIChhY3Rpb24gPT09IFwiZ2FtZU1zZ1Byb21wdFwiKSB7XHJcbiAgICAgICAgdGhpcy5nYW1lVUkuZ2FtZU1zZ1Byb21wdC5vcGVuKGluZm8ubWVzc2FnZSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuTWFpblVJLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uIChhY3Rpb24pIHtcclxuICAgIGlmIChhY3Rpb24gPT09IFwiZ2FtZU1zZ1Byb21wdFwiKSB7XHJcbiAgICAgICAgdGhpcy5nYW1lVUkuZ2FtZU1zZ1Byb21wdC5jbG9zZSgpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbk1haW5VSS5wcm90b3R5cGUudXBkYXRlTGVhZGVyQm9hcmQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgbGVhZGVyYm9hcmQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxlYWRlcmJvYXJkXCIpO1xyXG4gICAgdmFyIFBMQVlFUl9BUlJBWSA9IHRoaXMuY2xpZW50LlBMQVlFUl9BUlJBWTtcclxuXHJcblxyXG4gICAgdmFyIHBsYXllclNvcnQgPSBmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgICAgIHZhciBwbGF5ZXJBID0gdGhpcy5jbGllbnQuUExBWUVSX0xJU1RbYV07XHJcbiAgICAgICAgdmFyIHBsYXllckIgPSB0aGlzLmNsaWVudC5QTEFZRVJfTElTVFtiXTtcclxuICAgICAgICByZXR1cm4gcGxheWVyQS5yYWRpdXMgLSBwbGF5ZXJCLnJhZGl1cztcclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcbiAgICBQTEFZRVJfQVJSQVkuc29ydChwbGF5ZXJTb3J0KTtcclxuXHJcblxyXG4gICAgbGVhZGVyYm9hcmQuaW5uZXJIVE1MID0gXCJcIjtcclxuICAgIGZvciAodmFyIGkgPSBQTEFZRVJfQVJSQVkubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgICAgICB2YXIgcGxheWVyID0gdGhpcy5jbGllbnQuUExBWUVSX0xJU1RbUExBWUVSX0FSUkFZW2ldXTtcclxuICAgICAgICB2YXIgZW50cnkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG4gICAgICAgIGVudHJ5LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHBsYXllci5uYW1lICsgXCIgLSBcIiArIHBsYXllci5yYWRpdXMpKTtcclxuICAgICAgICBsZWFkZXJib2FyZC5hcHBlbmRDaGlsZChlbnRyeSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWFpblVJOyIsImZ1bmN0aW9uIFBsYXllck5hbWVyVUkgKGNsaWVudCwgc29ja2V0KSB7XHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxuICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xyXG5cclxuICAgIHRoaXMubGVhZGVyYm9hcmQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxlYWRlcmJvYXJkX2NvbnRhaW5lclwiKTtcclxuICAgIHRoaXMubmFtZUJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibmFtZVN1Ym1pdFwiKTtcclxuICAgIHRoaXMucGxheWVyTmFtZUlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbGF5ZXJOYW1lSW5wdXRcIik7XHJcbiAgICB0aGlzLnBsYXllck5hbWVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbGF5ZXJfbmFtZXJcIik7XHJcbn1cclxuXHJcblBsYXllck5hbWVyVUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnBsYXllck5hbWVJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcclxuICAgICAgICAgICAgdGhpcy5uYW1lQnRuLmNsaWNrKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB0aGlzLm5hbWVCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLmNsaWVudC5tYWluQ2FudmFzLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICB0aGlzLmxlYWRlcmJvYXJkLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICB0aGlzLnNvY2tldC5lbWl0KFwibmV3UGxheWVyXCIsXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IHRoaXMucGxheWVyTmFtZUlucHV0LnZhbHVlLFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLnBsYXllck5hbWVyLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMucGxheWVyTmFtZXIuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgdGhpcy5wbGF5ZXJOYW1lSW5wdXQuZm9jdXMoKTtcclxuICAgIHRoaXMubGVhZGVyYm9hcmQuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBsYXllck5hbWVyVUk7IiwiZnVuY3Rpb24gQ2hhdFVJKHBhcmVudCkge1xyXG4gICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XHJcbiAgICB0aGlzLnRlbXBsYXRlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjaGF0X2NvbnRhaW5lclwiKTtcclxuICAgIHRoaXMudGV4dElucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NoYXRfaW5wdXQnKTtcclxuICAgIHRoaXMuY2hhdExpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hhdF9saXN0Jyk7XHJcblxyXG5cclxuICAgIHRoaXMudGV4dElucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMudGV4dElucHV0LmZvY3VzKCk7XHJcblxyXG4gICAgICAgIHRoaXMucGFyZW50LmNsaWVudC5DSEFUX09QRU4gPSB0cnVlO1xyXG4gICAgICAgIHRoaXMuY2hhdExpc3Quc3R5bGUuaGVpZ2h0ID0gXCI4MCVcIjtcclxuICAgICAgICB0aGlzLmNoYXRMaXN0LnN0eWxlLm92ZXJmbG93WSA9IFwiYXV0b1wiO1xyXG5cclxuICAgICAgICB0aGlzLnRleHRJbnB1dC5zdHlsZS5iYWNrZ3JvdW5kID0gXCJyZ2JhKDM0LCA0OCwgNzEsIDEpXCI7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG4gICAgdGhpcy50ZXh0SW5wdXQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMTMpIHtcclxuICAgICAgICAgICAgdGhpcy5zZW5kTWVzc2FnZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG5cclxuICAgIHRoaXMudGVtcGxhdGUuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V3aGVlbCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnBhcmVudC5jbGllbnQuQ0hBVF9TQ1JPTEwgPSB0cnVlO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB0aGlzLnRlbXBsYXRlLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnBhcmVudC5jbGllbnQuQ0hBVF9DTElDSyA9IHRydWU7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG59XHJcblxyXG5DaGF0VUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAobWVzc2FnZSkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xyXG4gICAgdGhpcy5jbG9zZSgpO1xyXG59O1xyXG5cclxuXHJcbkNoYXRVSS5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnRleHRJbnB1dC5ibHVyKCk7XHJcbiAgICB0aGlzLnBhcmVudC5jbGllbnQuQ0hBVF9PUEVOID0gZmFsc2U7XHJcbiAgICB0aGlzLmNoYXRMaXN0LnN0eWxlLmhlaWdodCA9IFwiMzAlXCI7XHJcbiAgICB0aGlzLmNoYXRMaXN0LnN0eWxlLmJhY2tncm91bmQgPSBcInJnYmEoMTgyLCAxOTMsIDIxMSwgMC4wMilcIjtcclxuICAgIHRoaXMudGV4dElucHV0LnN0eWxlLmJhY2tncm91bmQgPSBcInJnYmEoMTgyLCAxOTMsIDIxMSwgMC4xKVwiO1xyXG4gICAgdGhpcy5wYXJlbnQuY2xpZW50LkNIQVRfU0NST0xMID0gZmFsc2U7XHJcbiAgICAkKCcjY2hhdF9saXN0JykuYW5pbWF0ZSh7c2Nyb2xsVG9wOiAkKCcjY2hhdF9saXN0JykucHJvcChcInNjcm9sbEhlaWdodFwiKX0sIDEwMCk7XHJcbiAgICB0aGlzLmNoYXRMaXN0LnN0eWxlLm92ZXJmbG93WSA9IFwibm9uZVwiO1xyXG59O1xyXG5cclxuXHJcbkNoYXRVSS5wcm90b3R5cGUuYWRkTWVzc2FnZSA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcclxuICAgIHZhciBlbnRyeSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcbiAgICBlbnRyeS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShwYWNrZXQubmFtZSArIFwiIDogXCIgKyBwYWNrZXQuY2hhdE1lc3NhZ2UpKTtcclxuICAgIHRoaXMuY2hhdExpc3QuYXBwZW5kQ2hpbGQoZW50cnkpO1xyXG5cclxuICAgICQoJyNjaGF0X2xpc3QnKS5hbmltYXRlKHtzY3JvbGxUb3A6ICQoJyNjaGF0X2xpc3QnKS5wcm9wKFwic2Nyb2xsSGVpZ2h0XCIpfSwgMTAwKTtcclxufTtcclxuXHJcblxyXG5DaGF0VUkucHJvdG90eXBlLnNlbmRNZXNzYWdlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHNvY2tldCA9IHRoaXMucGFyZW50LnNvY2tldDtcclxuXHJcblxyXG4gICAgaWYgKHRoaXMudGV4dElucHV0LnZhbHVlICYmIHRoaXMudGV4dElucHV0LnZhbHVlICE9PSBcIlwiKSB7XHJcbiAgICAgICAgc29ja2V0LmVtaXQoJ2NoYXRNZXNzYWdlJywge1xyXG4gICAgICAgICAgICBpZDogdGhpcy5wYXJlbnQuY2xpZW50LlNFTEZfSUQsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6IHRoaXMudGV4dElucHV0LnZhbHVlXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy50ZXh0SW5wdXQudmFsdWUgPSBcIlwiO1xyXG4gICAgfVxyXG4gICAgdGhpcy5jbG9zZSgpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDaGF0VUk7XHJcblxyXG5cclxuIiwiZnVuY3Rpb24gR2FtZU1zZ1Byb21wdChwYXJlbnQpIHtcclxuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xyXG4gICAgdGhpcy50ZW1wbGF0ZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicHJvbXB0X2NvbnRhaW5lclwiKTtcclxuICAgIHRoaXMubWVzc2FnZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdnYW1lX21zZ19wcm9tcHQnKTtcclxufVxyXG5cclxuR2FtZU1zZ1Byb21wdC5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcbiAgICB0aGlzLm1lc3NhZ2UuaW5uZXJIVE1MID0gbWVzc2FnZTtcclxufTtcclxuXHJcbkdhbWVNc2dQcm9tcHQucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEdhbWVNc2dQcm9tcHQ7XHJcblxyXG5cclxuIiwidmFyIEdhbWVNc2dQcm9tcHQgPSByZXF1aXJlKCcuL0dhbWVNc2dQcm9tcHQnKTtcclxudmFyIENoYXRVSSA9IHJlcXVpcmUoJy4vQ2hhdFVJJyk7XHJcblxyXG5mdW5jdGlvbiBHYW1lVUkoY2xpZW50LCBzb2NrZXQsIHBhcmVudCkge1xyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbiAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcclxuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xyXG4gICAgdGhpcy5nYW1lTXNnUHJvbXB0ID0gbmV3IEdhbWVNc2dQcm9tcHQodGhpcyk7XHJcbiAgICB0aGlzLmNoYXRVSSA9IG5ldyBDaGF0VUkodGhpcyk7XHJcbn1cclxuXHJcbkdhbWVVSS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGNvbnNvbGUubG9nKFwiT1BFTklORyBHQU1FIFVJXCIpO1xyXG4gICAgdGhpcy5jaGF0VUkub3BlbigpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSAgR2FtZVVJOyJdfQ==
