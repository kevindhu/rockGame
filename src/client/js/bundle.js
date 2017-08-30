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

BinaryReader.prototype.readInt16 = function () {
    var value = this._buffer.getInt16(this._offset);
    this._offset += 2;
    return value;
};



BinaryReader.prototype.readInt32 = function () {
    var value = this._buffer.getInt32(this._offset);
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
    this.socket.on('chatMessage', this.mainUI);
    this.socket.on('updateLOL', this.handleLOL.bind(this));
    this.socket.on('ping', this.sendPong.bind(this));


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

        if (this.playerClicked) {
            if (this.circleStageCount >= 3) { //made a full circle (at least 3 quadrants covered)
                this.sendCircle(this.circleConstruct);
            }
            else if (this.circleStageCount <= 1) {
                this.socket.emit("createDefault", {});
            }
            this.playerClicked = false;
            this.circleConstruct = [];
            this.circleStageCount = 0;

            this.TRAIL = new Entity.Trail(this);
        }
        else if (this.mining) {
            this.mining = false;
        }
        else {
            this.socket.emit("shootRock", {
                id: this.SELF_ID,
                x: x,
                y: y
            });

            this.clickTemp = false;
            this.clickTimer = 0;
        }
        if (!this.CHAT_CLICK) {
            this.mainUI.gameUI.chatUI.close();
        }
        this.CHAT_CLICK = false;
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

       if (this.clickTemp) { //see if shooting or mining
            this.clickTimer += 1;
            if (this.clickTimer > 3) {
                this.clickTimer = 0;
                this.clickTemp = false;
                this.mining = true;
            }
        }

        if (!this.pre) {
            this.pre = {x: x, y: y}
        }
        else if (square(this.pre.x - x) + square(this.pre.y - y) > 80) {
            this.pre = {x: x, y: y};

            if (Math.abs(x) < 50 && Math.abs(y) < 50) {
                console.log("WETE");
                x = 0;
                y = 0;
            }
            console.log(x,y);
            this.socket.emit('move', {
                id: this.SELF_ID,
                x: x,
                y: y
            });
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
    this.CONTROLLER_LIST = {};
    this.TILE_LIST = {};
    this.ROCK_LIST = {};
    this.ASTEROID_LIST = {};
    this.ANIMATION_LIST = {};
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


Client.prototype.handleLOL = function (data) {
    var reader = new BinaryReader(data);

    if (reader.length() > 20) {
        console.log(reader.readInt8());

        //console.log(reader.readInt32()); //asteroid id
        //console.log(reader.readInt32()); //owner id

        //console.log(reader.readInt32()); //real x
        //console.log(reader.readInt32()); //real y
    }
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
        case "rockInfo":
            addEntity(packet, this.ROCK_LIST, Entity.Rock);
            break;
        case "tileInfo":
            addEntity(packet, this.TILE_LIST, Entity.Tile);
            break;
        case "playerInfo":
            addEntity(packet, this.CONTROLLER_LIST, Entity.Player);
            break;
        case "asteroidInfo":
            addEntity(packet, this.ASTEROID_LIST, Entity.Asteroid);
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
                this.TRAIL = new Entity.Trail(this);
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
            updateEntity(packet, this.CONTROLLER_LIST);
            break;
        case "tileInfo":
            updateEntity(packet, this.TILE_LIST);
            break;
        case "asteroidInfo":
            updateEntity(packet, this.ASTEROID_LIST);
            break;
        case "homeInfo":
            updateEntity(packet, this.HOME_LIST);
            break;
        case "factionInfo":
            updateEntity(packet, this.FACTION_LIST);
            this.mainUI.updateLeaderBoard();
            break;
        case "rockInfo":
            updateEntity(packet, this.ROCK_LIST);
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
            deleteEntity(packet, this.CONTROLLER_LIST);
            break;
        case "asteroidInfo":
            deleteEntity(packet, this.ASTEROID_LIST);
            break;
        case "rockInfo":
            deleteEntity(packet, this.ROCK_LIST);
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
    var id;
    var entityList = [
        this.TILE_LIST,
        this.CONTROLLER_LIST,
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


    if (!this.SELF_PLAYER) {
        return;
    }

    translateScene();
    this.mainCtx.clearRect(0, 0, 11000, 11000);

    this.mainCtx.fillStyle = "#1d1f21";
    this.mainCtx.fillRect(0, 0, 10000, 10000);


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



Client.prototype.start = function () {
    setInterval(this.drawScene.bind(this), 1000 / 25);
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
function Player(playerInfo, client) {
    this.id = playerInfo.id;
    this.name = playerInfo.name;
    this.x = playerInfo.x;
    this.y = playerInfo.y;
    this.health = playerInfo.health;
    this.maxHealth = playerInfo.maxHealth;
    this.theta = playerInfo.theta;
    this.level = playerInfo.level; //need to implement again
    this.radius = playerInfo.radius;
    this.client = client;

    if (!this.SELF_PLAYER && this.id === this.client.SELF_ID) {
        this.client.active = this.active; //probably should change this
        this.client.SELF_PLAYER = this;
    }
}

Player.prototype.update = function (playerInfo) {
    this.x = playerInfo.x;
    this.y = playerInfo.y;
    this.health = playerInfo.health;
    this.maxHealth = playerInfo.maxHealth;
    this.theta = playerInfo.theta;
    this.level = playerInfo.level;
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


    if (this.range && this.id === selfId) {
        ctx.beginPath();

        if (this.active) {
            ctx.fillStyle = "rgba(196, 41, 54, 0.2)";
        }
        else {
            ctx.fillStyle = "rgba(66, 108, 175, 0.2)";
        }
        ctx.arc(this.x, this.y, this.range, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.closePath();
    }


    ctx.strokeStyle = "rgba(252, 102, 37," + strokeAlpha + ")";
    ctx.fillStyle = "rgba(123,0,0," + fillAlpha + ")";
    ctx.lineWidth = 10;


    var radius = this.radius * 5;

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

module.exports = Player;
},{}],6:[function(require,module,exports){
function Rock(rockInfo, client) {
    this.x = rockInfo.x;
    this.y = rockInfo.y;
    this.vertices = rockInfo.vertices;
    this.theta = rockInfo.theta;
    this.texture = rockInfo.texture;
    this.neutral = rockInfo.neutral;
    this.client = client;
}

Rock.prototype.update = function (rockInfo) {
    this.x = rockInfo.x;
    this.y = rockInfo.y;
    this.queuePosition = rockInfo.queuePosition; //delete
    this.theta = rockInfo.theta;
    this.owner = rockInfo.owner;
    this.neutral = rockInfo.neutral;
    this.health = rockInfo.health;
    this.maxHealth = rockInfo.maxHealth;
    this.fast = rockInfo.fast;
};


Rock.prototype.show = function () {
    var ctx = this.client.mainCtx;
    var SCALE = 100;


    ctx.fillStyle = "pink"; //default color
    switch (this.texture) {
        case "bronze":
            ctx.fillStyle = "brown";
            break;
        case "silver":
            ctx.fillStyle = "grey";
            break;
        case "gold":
            ctx.fillStyle = "yellow";
            break;
    }


    ctx.strokeStyle = !this.owner ? "blue" : "green";
    ctx.strokeStyle = this.fast ? "red" : ctx.strokeStyle;
    ctx.strokeStyle = this.neutral ? "pink" : ctx.strokeStyle;


    if (!this.vertices) {
        //console.log(this.x, this.y);
    }

    ctx.translate(this.x, this.y);
    ctx.beginPath();
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

    ctx.rotate(2 * Math.PI - this.theta);
    ctx.fill();
    ctx.stroke();

    ctx.closePath();
    ctx.translate(-this.x, -this.y);


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
    if (client.CHAT_OPEN) {
        return;
    }
    client.keys[event.keyCode] = true;
    client.socket.emit('keyEvent', {id: event.keyCode, state: true});
};

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
        client.mainScaleFactor += 0.2;
    }
    else if (client.mainScaleFactor > 0.3) {
        client.mainScaleFactor -= 0.2;
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
    var PLAYER_ARRAY = this.client.PLAYEr_ARRAY;


    var playerSort = function (a, b) {
        var factionA = this.client.CONTROLLER_LIST[a];
        var factionB = this.client.CONTROLLER_LIST[b];
        return factionA.score - factionB.score;
    }.bind(this);

    PLAYER_ARRAY.sort(playerSort);
    leaderboard.innerHTML = "";

    for (var i = PLAYER_ARRAY.length - 1; i >= 0; i--) {
        var player = this.client.CONTROLLER_LIST[PLAYER_ARRAY[i]];

        var entry = document.createElement('li');
        entry.appendChild(document.createTextNode(player.name + " - " + player.score));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2xpZW50L2pzL0JpbmFyeVJlYWRlci5qcyIsInNyYy9jbGllbnQvanMvQ2xpZW50LmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvQW5pbWF0aW9uLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvTWluaU1hcC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L1BsYXllci5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L1JvY2suanMiLCJzcmMvY2xpZW50L2pzL2VudGl0eS9UaWxlLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvaW5kZXguanMiLCJzcmMvY2xpZW50L2pzL2luZGV4LmpzIiwic3JjL2NsaWVudC9qcy91aS9NYWluVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL1BsYXllck5hbWVyVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvQ2hhdFVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9nYW1lL0dhbWVNc2dQcm9tcHQuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvR2FtZVVJLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcGFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJmdW5jdGlvbiBCaW5hcnlSZWFkZXIoZGF0YSkge1xyXG4gICAgdGhpcy5fb2Zmc2V0ID0gMDtcclxuICAgIHRoaXMuX2J1ZmZlciA9IG5ldyBEYXRhVmlldyhkYXRhKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBCaW5hcnlSZWFkZXI7XHJcblxyXG5cclxuQmluYXJ5UmVhZGVyLnByb3RvdHlwZS5yZWFkSW50OCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB2YWx1ZSA9IHRoaXMuX2J1ZmZlci5nZXRJbnQ4KHRoaXMuX29mZnNldCk7XHJcbiAgICB0aGlzLl9vZmZzZXQgKz0gMTtcclxuICAgIHJldHVybiB2YWx1ZTtcclxufTtcclxuXHJcbkJpbmFyeVJlYWRlci5wcm90b3R5cGUucmVhZEludDE2ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHZhbHVlID0gdGhpcy5fYnVmZmVyLmdldEludDE2KHRoaXMuX29mZnNldCk7XHJcbiAgICB0aGlzLl9vZmZzZXQgKz0gMjtcclxuICAgIHJldHVybiB2YWx1ZTtcclxufTtcclxuXHJcblxyXG5cclxuQmluYXJ5UmVhZGVyLnByb3RvdHlwZS5yZWFkSW50MzIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9idWZmZXIuZ2V0SW50MzIodGhpcy5fb2Zmc2V0KTtcclxuICAgIHRoaXMuX29mZnNldCArPSA0O1xyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG5cclxufTtcclxuXHJcbkJpbmFyeVJlYWRlci5wcm90b3R5cGUuc2tpcEJ5dGVzID0gZnVuY3Rpb24gKGxlbmd0aCkge1xyXG4gICAgdGhpcy5fb2Zmc2V0ICs9IGxlbmd0aDtcclxufTtcclxuXHJcbkJpbmFyeVJlYWRlci5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2J1ZmZlci5ieXRlTGVuZ3RoO1xyXG59O1xyXG5cclxuIiwidmFyIEVudGl0eSA9IHJlcXVpcmUoJy4vZW50aXR5Jyk7XHJcbnZhciBNYWluVUkgPSByZXF1aXJlKCcuL3VpL01haW5VSScpO1xyXG52YXIgQmluYXJ5UmVhZGVyID0gcmVxdWlyZSgnLi9CaW5hcnlSZWFkZXInKTtcclxuXHJcbmZ1bmN0aW9uIENsaWVudCgpIHtcclxuICAgIHRoaXMuU0VMRl9JRCA9IG51bGw7XHJcbiAgICB0aGlzLlNFTEZfUExBWUVSID0gbnVsbDtcclxuICAgIHRoaXMuVFJBSUwgPSBudWxsO1xyXG5cclxuICAgIHRoaXMuU0xBU0ggPSBbXTtcclxuICAgIHRoaXMuU0xBU0hfQVJSQVkgPSBbXTtcclxuICAgIHRoaXMubW91c2VNb3ZlVGltZXIgPSAwO1xyXG4gICAgdGhpcy5pbml0KCk7XHJcbn1cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuaW5pdFNvY2tldCgpO1xyXG4gICAgdGhpcy5pbml0Q2FudmFzZXMoKTtcclxuICAgIHRoaXMuaW5pdExpc3RzKCk7XHJcbiAgICB0aGlzLmluaXRWaWV3ZXJzKCk7XHJcbn07XHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdFNvY2tldCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuc29ja2V0ID0gaW8oKTtcclxuICAgIHRoaXMuc29ja2V0LnZlcmlmaWVkID0gZmFsc2U7XHJcblxyXG4gICAgdGhpcy5zb2NrZXQub24oJ2luaXRWZXJpZmljYXRpb24nLCB0aGlzLnZlcmlmeS5iaW5kKHRoaXMpKTtcclxuICAgIHRoaXMuc29ja2V0Lm9uKCd1cGRhdGVFbnRpdGllcycsIHRoaXMuaGFuZGxlUGFja2V0LmJpbmQodGhpcykpO1xyXG4gICAgdGhpcy5zb2NrZXQub24oJ2NoYXRNZXNzYWdlJywgdGhpcy5tYWluVUkpO1xyXG4gICAgdGhpcy5zb2NrZXQub24oJ3VwZGF0ZUxPTCcsIHRoaXMuaGFuZGxlTE9MLmJpbmQodGhpcykpO1xyXG4gICAgdGhpcy5zb2NrZXQub24oJ3BpbmcnLCB0aGlzLnNlbmRQb25nLmJpbmQodGhpcykpO1xyXG5cclxuXHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLnNlbmRQb25nID0gZnVuY3Rpb24gKG1lc3NhZ2UpIHtcclxuICAgIHRoaXMuc29ja2V0LmVtaXQoXCJwb25nMTIzXCIsIG1lc3NhZ2UpO1xyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdENhbnZhc2VzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5tYWluQ2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtYWluX2NhbnZhc1wiKTtcclxuICAgIHRoaXMubWFpbkNhbnZhcy5zdHlsZS5ib3JkZXIgPSAnMXB4IHNvbGlkICMwMDAwMDAnO1xyXG4gICAgdGhpcy5tYWluQ2FudmFzLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgdGhpcy5tYWluQ3R4ID0gdGhpcy5tYWluQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuXHJcblxyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBpZiAoIXRoaXMuU0VMRl9JRCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciB4ID0gKChldmVudC54IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldFdpZHRoICogMTAwMCkgLSB0aGlzLm1haW5DYW52YXMud2lkdGggLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcbiAgICAgICAgdmFyIHkgPSAoKGV2ZW50LnkgLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0SGVpZ2h0ICogNTAwKSAtIHRoaXMubWFpbkNhbnZhcy5oZWlnaHQgLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcblxyXG5cclxuICAgICAgICBpZiAoTWF0aC5hYnMoeCkgKyBNYXRoLmFicyh5KSA8IDIwMCkge1xyXG4gICAgICAgICAgICB0aGlzLnBsYXllckNsaWNrZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLmNpcmNsZUNvbnN0cnVjdCA9IFtdO1xyXG4gICAgICAgICAgICB0aGlzLmNpcmNsZVN0YWdlQ291bnQgPSAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5jbGlja1RlbXAgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLmNsaWNrVGltZXIgPSAwO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKSk7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBpZiAoIXRoaXMuU0VMRl9JRCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciB4ID0gKChldmVudC54IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldFdpZHRoICogMTAwMCkgLSB0aGlzLm1haW5DYW52YXMud2lkdGggLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcbiAgICAgICAgdmFyIHkgPSAoKGV2ZW50LnkgLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0SGVpZ2h0ICogNTAwKSAtIHRoaXMubWFpbkNhbnZhcy5oZWlnaHQgLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnBsYXllckNsaWNrZWQpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY2lyY2xlU3RhZ2VDb3VudCA+PSAzKSB7IC8vbWFkZSBhIGZ1bGwgY2lyY2xlIChhdCBsZWFzdCAzIHF1YWRyYW50cyBjb3ZlcmVkKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5zZW5kQ2lyY2xlKHRoaXMuY2lyY2xlQ29uc3RydWN0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmICh0aGlzLmNpcmNsZVN0YWdlQ291bnQgPD0gMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcImNyZWF0ZURlZmF1bHRcIiwge30pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMucGxheWVyQ2xpY2tlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLmNpcmNsZUNvbnN0cnVjdCA9IFtdO1xyXG4gICAgICAgICAgICB0aGlzLmNpcmNsZVN0YWdlQ291bnQgPSAwO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5UUkFJTCA9IG5ldyBFbnRpdHkuVHJhaWwodGhpcyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKHRoaXMubWluaW5nKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWluaW5nID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnNvY2tldC5lbWl0KFwic2hvb3RSb2NrXCIsIHtcclxuICAgICAgICAgICAgICAgIGlkOiB0aGlzLlNFTEZfSUQsXHJcbiAgICAgICAgICAgICAgICB4OiB4LFxyXG4gICAgICAgICAgICAgICAgeTogeVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY2xpY2tUZW1wID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuY2xpY2tUaW1lciA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghdGhpcy5DSEFUX0NMSUNLKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWFpblVJLmdhbWVVSS5jaGF0VUkuY2xvc2UoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5DSEFUX0NMSUNLID0gZmFsc2U7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLlNFTEZfUExBWUVSKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciB4ID0gKChldmVudC54IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldFdpZHRoICogMTAwMCkgLVxyXG4gICAgICAgICAgICB0aGlzLm1haW5DYW52YXMud2lkdGggLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcbiAgICAgICAgdmFyIHkgPSAoKGV2ZW50LnkgLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0SGVpZ2h0ICogNTAwKSAtXHJcbiAgICAgICAgICAgIHRoaXMubWFpbkNhbnZhcy5oZWlnaHQgLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcblxyXG4gICAgICAgIGlmIChzcXVhcmUoeCkgKyBzcXVhcmUoeSkgPiBzcXVhcmUodGhpcy5TRUxGX1BMQVlFUi5yYW5nZSkpIHsgLy9pZiBub3QgaW4gcmFuZ2VcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICBpZiAodGhpcy5jbGlja1RlbXApIHsgLy9zZWUgaWYgc2hvb3Rpbmcgb3IgbWluaW5nXHJcbiAgICAgICAgICAgIHRoaXMuY2xpY2tUaW1lciArPSAxO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jbGlja1RpbWVyID4gMykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbGlja1RpbWVyID0gMDtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2xpY2tUZW1wID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1pbmluZyA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5wcmUpIHtcclxuICAgICAgICAgICAgdGhpcy5wcmUgPSB7eDogeCwgeTogeX1cclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoc3F1YXJlKHRoaXMucHJlLnggLSB4KSArIHNxdWFyZSh0aGlzLnByZS55IC0geSkgPiA4MCkge1xyXG4gICAgICAgICAgICB0aGlzLnByZSA9IHt4OiB4LCB5OiB5fTtcclxuXHJcbiAgICAgICAgICAgIGlmIChNYXRoLmFicyh4KSA8IDUwICYmIE1hdGguYWJzKHkpIDwgNTApIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiV0VURVwiKTtcclxuICAgICAgICAgICAgICAgIHggPSAwO1xyXG4gICAgICAgICAgICAgICAgeSA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc29sZS5sb2coeCx5KTtcclxuICAgICAgICAgICAgdGhpcy5zb2NrZXQuZW1pdCgnbW92ZScsIHtcclxuICAgICAgICAgICAgICAgIGlkOiB0aGlzLlNFTEZfSUQsXHJcbiAgICAgICAgICAgICAgICB4OiB4LFxyXG4gICAgICAgICAgICAgICAgeTogeVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuc2VuZENpcmNsZSA9IGZ1bmN0aW9uIChjb25zdHJ1Y3QpIHtcclxuXHJcbiAgICB2YXIgcmFkaWlOb3JtYWwgPSBmdW5jdGlvbiAodmVjdG9yKSB7XHJcbiAgICAgICAgaWYgKCF2ZWN0b3IpIHtcclxuICAgICAgICAgICAgcmV0dXJuIDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiAodmVjdG9yLnggKiB2ZWN0b3IueCArIHZlY3Rvci55ICogdmVjdG9yLnkpO1xyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgbWF4UmFkaXVzID0gTWF0aC5zcXJ0KE1hdGgubWF4KFxyXG4gICAgICAgIHJhZGlpTm9ybWFsKGNvbnN0cnVjdFswXSksXHJcbiAgICAgICAgcmFkaWlOb3JtYWwoY29uc3RydWN0WzFdKSxcclxuICAgICAgICByYWRpaU5vcm1hbChjb25zdHJ1Y3RbMl0pLFxyXG4gICAgICAgIHJhZGlpTm9ybWFsKGNvbnN0cnVjdFszXSkpKTtcclxuXHJcbiAgICBpZiAobWF4UmFkaXVzKSB7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcImNyZWF0ZUNpcmNsZVwiLCB7XHJcbiAgICAgICAgICAgIGlkOiB0aGlzLlNFTEZfSUQsXHJcbiAgICAgICAgICAgIHJhZGl1czogbWF4UmFkaXVzXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmluaXRMaXN0cyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuQ09OVFJPTExFUl9MSVNUID0ge307XHJcbiAgICB0aGlzLlRJTEVfTElTVCA9IHt9O1xyXG4gICAgdGhpcy5ST0NLX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuQVNURVJPSURfTElTVCA9IHt9O1xyXG4gICAgdGhpcy5BTklNQVRJT05fTElTVCA9IHt9O1xyXG59O1xyXG5DbGllbnQucHJvdG90eXBlLmluaXRWaWV3ZXJzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5rZXlzID0gW107XHJcbiAgICB0aGlzLnNjYWxlRmFjdG9yID0gMTtcclxuICAgIHRoaXMubWFpblNjYWxlRmFjdG9yID0gMC41O1xyXG4gICAgdGhpcy5tYWluVUkgPSBuZXcgTWFpblVJKHRoaXMsIHRoaXMuc29ja2V0KTtcclxuICAgIHRoaXMubWFpblVJLnBsYXllck5hbWVyVUkub3BlbigpO1xyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS52ZXJpZnkgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgaWYgKCF0aGlzLnNvY2tldC52ZXJpZmllZCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiVkVSSUZJRUQgQ0xJRU5UXCIpO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJ2ZXJpZnlcIiwge30pO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LnZlcmlmaWVkID0gdHJ1ZTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5DbGllbnQucHJvdG90eXBlLmhhbmRsZUxPTCA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICB2YXIgcmVhZGVyID0gbmV3IEJpbmFyeVJlYWRlcihkYXRhKTtcclxuXHJcbiAgICBpZiAocmVhZGVyLmxlbmd0aCgpID4gMjApIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhyZWFkZXIucmVhZEludDgoKSk7XHJcblxyXG4gICAgICAgIC8vY29uc29sZS5sb2cocmVhZGVyLnJlYWRJbnQzMigpKTsgLy9hc3Rlcm9pZCBpZFxyXG4gICAgICAgIC8vY29uc29sZS5sb2cocmVhZGVyLnJlYWRJbnQzMigpKTsgLy9vd25lciBpZFxyXG5cclxuICAgICAgICAvL2NvbnNvbGUubG9nKHJlYWRlci5yZWFkSW50MzIoKSk7IC8vcmVhbCB4XHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhyZWFkZXIucmVhZEludDMyKCkpOyAvL3JlYWwgeVxyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaGFuZGxlUGFja2V0ID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgIHZhciBwYWNrZXQsIGk7XHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHBhY2tldCA9IGRhdGFbaV07XHJcbiAgICAgICAgc3dpdGNoIChwYWNrZXQubWFzdGVyKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJhZGRcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMuYWRkRW50aXRpZXMocGFja2V0KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwiZGVsZXRlXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRlbGV0ZUVudGl0aWVzKHBhY2tldCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcInVwZGF0ZVwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVFbnRpdGllcyhwYWNrZXQpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuYWRkRW50aXRpZXMgPSBmdW5jdGlvbiAocGFja2V0KSB7XHJcbiAgICB2YXIgYWRkRW50aXR5ID0gZnVuY3Rpb24gKHBhY2tldCwgbGlzdCwgZW50aXR5LCBhcnJheSkge1xyXG4gICAgICAgIGlmICghcGFja2V0KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGlzdFtwYWNrZXQuaWRdID0gbmV3IGVudGl0eShwYWNrZXQsIHRoaXMpO1xyXG4gICAgICAgIGlmIChhcnJheSAmJiBhcnJheS5pbmRleE9mKHBhY2tldC5pZCkgPT09IC0xKSB7XHJcbiAgICAgICAgICAgIGFycmF5LnB1c2gocGFja2V0LmlkKTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG4gICAgc3dpdGNoIChwYWNrZXQuY2xhc3MpIHtcclxuICAgICAgICBjYXNlIFwicm9ja0luZm9cIjpcclxuICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5ST0NLX0xJU1QsIEVudGl0eS5Sb2NrKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInRpbGVJbmZvXCI6XHJcbiAgICAgICAgICAgIGFkZEVudGl0eShwYWNrZXQsIHRoaXMuVElMRV9MSVNULCBFbnRpdHkuVGlsZSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJwbGF5ZXJJbmZvXCI6XHJcbiAgICAgICAgICAgIGFkZEVudGl0eShwYWNrZXQsIHRoaXMuQ09OVFJPTExFUl9MSVNULCBFbnRpdHkuUGxheWVyKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImFzdGVyb2lkSW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLkFTVEVST0lEX0xJU1QsIEVudGl0eS5Bc3Rlcm9pZCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJhbmltYXRpb25JbmZvXCI6XHJcbiAgICAgICAgICAgIGlmIChwYWNrZXQuaWQgPT09IHRoaXMuU0VMRl9JRCkge1xyXG4gICAgICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5BTklNQVRJT05fTElTVCwgRW50aXR5LkFuaW1hdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcIlVJSW5mb1wiOlxyXG4gICAgICAgICAgICBpZiAodGhpcy5TRUxGX0lEID09PSBwYWNrZXQucGxheWVySWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFpblVJLm9wZW4ocGFja2V0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwic2VsZklkXCI6XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5TRUxGX0lEKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLlNFTEZfSUQgPSBwYWNrZXQuc2VsZklkO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tYWluVUkuZ2FtZVVJLm9wZW4oKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuVFJBSUwgPSBuZXcgRW50aXR5LlRyYWlsKHRoaXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJjaGF0SW5mb1wiOlxyXG4gICAgICAgICAgICB0aGlzLm1haW5VSS5nYW1lVUkuY2hhdFVJLmFkZE1lc3NhZ2UocGFja2V0KTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLnVwZGF0ZUVudGl0aWVzID0gZnVuY3Rpb24gKHBhY2tldCkge1xyXG4gICAgZnVuY3Rpb24gdXBkYXRlRW50aXR5KHBhY2tldCwgbGlzdCkge1xyXG4gICAgICAgIGlmICghcGFja2V0KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGVudGl0eSA9IGxpc3RbcGFja2V0LmlkXTtcclxuICAgICAgICBpZiAoIWVudGl0eSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVudGl0eS51cGRhdGUocGFja2V0KTtcclxuICAgIH1cclxuXHJcbiAgICBzd2l0Y2ggKHBhY2tldC5jbGFzcykge1xyXG4gICAgICAgIGNhc2UgXCJwbGF5ZXJJbmZvXCI6XHJcbiAgICAgICAgICAgIHVwZGF0ZUVudGl0eShwYWNrZXQsIHRoaXMuQ09OVFJPTExFUl9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInRpbGVJbmZvXCI6XHJcbiAgICAgICAgICAgIHVwZGF0ZUVudGl0eShwYWNrZXQsIHRoaXMuVElMRV9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImFzdGVyb2lkSW5mb1wiOlxyXG4gICAgICAgICAgICB1cGRhdGVFbnRpdHkocGFja2V0LCB0aGlzLkFTVEVST0lEX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiaG9tZUluZm9cIjpcclxuICAgICAgICAgICAgdXBkYXRlRW50aXR5KHBhY2tldCwgdGhpcy5IT01FX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiZmFjdGlvbkluZm9cIjpcclxuICAgICAgICAgICAgdXBkYXRlRW50aXR5KHBhY2tldCwgdGhpcy5GQUNUSU9OX0xJU1QpO1xyXG4gICAgICAgICAgICB0aGlzLm1haW5VSS51cGRhdGVMZWFkZXJCb2FyZCgpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwicm9ja0luZm9cIjpcclxuICAgICAgICAgICAgdXBkYXRlRW50aXR5KHBhY2tldCwgdGhpcy5ST0NLX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiVUlJbmZvXCI6XHJcbiAgICAgICAgICAgIGlmICh0aGlzLlNFTEZfSUQgPT09IHBhY2tldC5wbGF5ZXJJZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tYWluVUkudXBkYXRlKHBhY2tldCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmRlbGV0ZUVudGl0aWVzID0gZnVuY3Rpb24gKHBhY2tldCkge1xyXG4gICAgdmFyIGRlbGV0ZUVudGl0eSA9IGZ1bmN0aW9uIChwYWNrZXQsIGxpc3QsIGFycmF5KSB7XHJcbiAgICAgICAgaWYgKCFwYWNrZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYXJyYXkpIHtcclxuICAgICAgICAgICAgdmFyIGluZGV4ID0gYXJyYXkuaW5kZXhPZihwYWNrZXQuaWQpO1xyXG4gICAgICAgICAgICBhcnJheS5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkZWxldGUgbGlzdFtwYWNrZXQuaWRdO1xyXG4gICAgfTtcclxuXHJcbiAgICBzd2l0Y2ggKHBhY2tldC5jbGFzcykge1xyXG4gICAgICAgIGNhc2UgXCJ0aWxlSW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLlRJTEVfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJwbGF5ZXJJbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuQ09OVFJPTExFUl9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImFzdGVyb2lkSW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLkFTVEVST0lEX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwicm9ja0luZm9cIjpcclxuICAgICAgICAgICAgZGVsZXRlRW50aXR5KHBhY2tldCwgdGhpcy5ST0NLX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiYW5pbWF0aW9uSW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLkFOSU1BVElPTl9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcIlVJSW5mb1wiOlxyXG4gICAgICAgICAgICBpZiAodGhpcy5TRUxGX0lEID09PSBwYWNrZXQuaWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFpblVJLmNsb3NlKHBhY2tldC5hY3Rpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5kcmF3U2NlbmUgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgdmFyIGlkO1xyXG4gICAgdmFyIGVudGl0eUxpc3QgPSBbXHJcbiAgICAgICAgdGhpcy5USUxFX0xJU1QsXHJcbiAgICAgICAgdGhpcy5DT05UUk9MTEVSX0xJU1QsXHJcbiAgICAgICAgdGhpcy5BU1RFUk9JRF9MSVNULFxyXG4gICAgICAgIHRoaXMuQU5JTUFUSU9OX0xJU1QsXHJcbiAgICAgICAgdGhpcy5ST0NLX0xJU1RcclxuICAgIF07XHJcblxyXG4gICAgdmFyIGluQm91bmRzID0gZnVuY3Rpb24gKHBsYXllciwgeCwgeSkge1xyXG4gICAgICAgIHZhciByYW5nZSA9IHRoaXMubWFpbkNhbnZhcy53aWR0aCAvICgwLjcgKiB0aGlzLnNjYWxlRmFjdG9yKTtcclxuICAgICAgICByZXR1cm4geCA8IChwbGF5ZXIueCArIHJhbmdlKSAmJiB4ID4gKHBsYXllci54IC0gcmFuZ2UpXHJcbiAgICAgICAgICAgICYmIHkgPCAocGxheWVyLnkgKyByYW5nZSkgJiYgeSA+IChwbGF5ZXIueSAtIHJhbmdlKTtcclxuICAgIH0uYmluZCh0aGlzKTtcclxuICAgIHZhciB0cmFuc2xhdGVTY2VuZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLm1haW5DdHguc2V0VHJhbnNmb3JtKDEsIDAsIDAsIDEsIDAsIDApO1xyXG4gICAgICAgIHRoaXMuc2NhbGVGYWN0b3IgPSBsZXJwKHRoaXMuc2NhbGVGYWN0b3IsIHRoaXMubWFpblNjYWxlRmFjdG9yLCAwLjMpO1xyXG4gICAgICAgIHRoaXMubWFpbkN0eC50cmFuc2xhdGUodGhpcy5tYWluQ2FudmFzLndpZHRoIC8gMiwgdGhpcy5tYWluQ2FudmFzLmhlaWdodCAvIDIpO1xyXG4gICAgICAgIHRoaXMubWFpbkN0eC5zY2FsZSh0aGlzLnNjYWxlRmFjdG9yLCB0aGlzLnNjYWxlRmFjdG9yKTtcclxuICAgICAgICB0aGlzLm1haW5DdHgudHJhbnNsYXRlKC10aGlzLlNFTEZfUExBWUVSLngsIC10aGlzLlNFTEZfUExBWUVSLnkpO1xyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuXHJcbiAgICBpZiAoIXRoaXMuU0VMRl9QTEFZRVIpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdHJhbnNsYXRlU2NlbmUoKTtcclxuICAgIHRoaXMubWFpbkN0eC5jbGVhclJlY3QoMCwgMCwgMTEwMDAsIDExMDAwKTtcclxuXHJcbiAgICB0aGlzLm1haW5DdHguZmlsbFN0eWxlID0gXCIjMWQxZjIxXCI7XHJcbiAgICB0aGlzLm1haW5DdHguZmlsbFJlY3QoMCwgMCwgMTAwMDAsIDEwMDAwKTtcclxuXHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbnRpdHlMaXN0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIGxpc3QgPSBlbnRpdHlMaXN0W2ldO1xyXG4gICAgICAgIGZvciAoaWQgaW4gbGlzdCkge1xyXG4gICAgICAgICAgICB2YXIgZW50aXR5ID0gbGlzdFtpZF07XHJcbiAgICAgICAgICAgIGlmIChpbkJvdW5kcyh0aGlzLlNFTEZfUExBWUVSLCBlbnRpdHkueCwgZW50aXR5LnkpKSB7XHJcbiAgICAgICAgICAgICAgICBlbnRpdHkuc2hvdygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuVFJBSUwgJiYgIXRoaXMuYWN0aXZlKSB7XHJcbiAgICAgICAgdGhpcy5UUkFJTC5zaG93KCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBzZXRJbnRlcnZhbCh0aGlzLmRyYXdTY2VuZS5iaW5kKHRoaXMpLCAxMDAwIC8gMjUpO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gbGVycChhLCBiLCByYXRpbykge1xyXG4gICAgcmV0dXJuIGEgKyByYXRpbyAqIChiIC0gYSk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBzcXVhcmUoYSkge1xyXG4gICAgcmV0dXJuIGEgKiBhO1xyXG59XHJcblxyXG5mdW5jdGlvbiB2ZWN0b3JOb3JtYWwoYSkge1xyXG4gICAgcmV0dXJuIGEueCAqIGEueCArIGEueSAqIGEueTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDbGllbnQ7IiwiZnVuY3Rpb24gQW5pbWF0aW9uKGFuaW1hdGlvbkluZm8sIGNsaWVudCkge1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy50eXBlID0gYW5pbWF0aW9uSW5mby50eXBlO1xyXG4gICAgdGhpcy5pZCA9IGFuaW1hdGlvbkluZm8uaWQ7XHJcbiAgICB0aGlzLnggPSBhbmltYXRpb25JbmZvLng7XHJcbiAgICB0aGlzLnkgPSBhbmltYXRpb25JbmZvLnk7XHJcbiAgICAvL3RoaXMudGhldGEgPSAxNTtcclxuICAgIHRoaXMudGltZXIgPSBnZXRSYW5kb20oMTAsIDE0KTtcclxuXHJcbiAgICBpZiAodGhpcy50eXBlID09PSBcInNsYXNoXCIpIHtcclxuICAgICAgICB0aGlzLnNsYXNoSWQgPSBhbmltYXRpb25JbmZvLnNsYXNoSWQ7XHJcbiAgICAgICAgdmFyIHNsYXNoID0gdGhpcy5jbGllbnQuZmluZFNsYXNoKHRoaXMuc2xhc2hJZCk7XHJcbiAgICAgICAgdGhpcy5wcmUgPSBzbGFzaFswXTtcclxuICAgICAgICB0aGlzLnBvc3QgPSBzbGFzaFsxXTtcclxuICAgIH1cclxufVxyXG5cclxuXHJcbkFuaW1hdGlvbi5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5tYWluQ3R4O1xyXG4gICAgdmFyIHBsYXllciA9IHRoaXMuY2xpZW50LlNFTEZfUExBWUVSO1xyXG5cclxuICAgIGlmICh0aGlzLnR5cGUgPT09IFwic2xhc2hcIiAmJiBwbGF5ZXIpIHtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcblxyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiYSgyNDIsIDMxLCA2NiwgMC42KVwiO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAxNTtcclxuXHJcbiAgICAgICAgY3R4Lm1vdmVUbyhwbGF5ZXIueCArIHRoaXMucHJlLngsIHBsYXllci55ICsgdGhpcy5wcmUueSk7XHJcbiAgICAgICAgY3R4LmxpbmVUbyhwbGF5ZXIueCArIHRoaXMucG9zdC54LCBwbGF5ZXIueSArIHRoaXMucG9zdC55KTtcclxuXHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIH1cclxuICAgIFxyXG5cclxuICAgIGlmICh0aGlzLnR5cGUgPT09IFwic2hhcmREZWF0aFwiKSB7IC8vZGVwcmVjYXRlZCBidXQgY291bGQgcHVsbCBzb21lIGdvb2QgY29kZSBmcm9tIGhlcmVcclxuICAgICAgICBjdHguZm9udCA9IDYwIC0gdGhpcy50aW1lciArIFwicHggQXJpYWxcIjtcclxuICAgICAgICBjdHguc2F2ZSgpO1xyXG4gICAgICAgIGN0eC50cmFuc2xhdGUodGhpcy54LCB0aGlzLnkpO1xyXG4gICAgICAgIGN0eC5yb3RhdGUoLU1hdGguUEkgLyA1MCAqIHRoaXMudGhldGEpO1xyXG4gICAgICAgIGN0eC50ZXh0QWxpZ24gPSBcImNlbnRlclwiO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcInJnYmEoMjU1LCAxNjgsIDg2LCBcIiArIHRoaXMudGltZXIgKiAxMCAvIDEwMCArIFwiKVwiO1xyXG4gICAgICAgIGN0eC5maWxsVGV4dCh0aGlzLm5hbWUsIDAsIDE1KTtcclxuICAgICAgICBjdHgucmVzdG9yZSgpO1xyXG5cclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCIjMDAwMDAwXCI7XHJcbiAgICAgICAgdGhpcy50aGV0YSA9IGxlcnAodGhpcy50aGV0YSwgMCwgMC4wOCk7XHJcbiAgICAgICAgdGhpcy54ID0gbGVycCh0aGlzLngsIHRoaXMuZW5kWCwgMC4xKTtcclxuICAgICAgICB0aGlzLnkgPSBsZXJwKHRoaXMueSwgdGhpcy5lbmRZLCAwLjEpO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICB0aGlzLnRpbWVyLS07XHJcbiAgICBpZiAodGhpcy50aW1lciA8PSAwKSB7XHJcbiAgICAgICAgZGVsZXRlIHRoaXMuY2xpZW50LkFOSU1BVElPTl9MSVNUW3RoaXMuaWRdO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbShtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbjtcclxufVxyXG5cclxuZnVuY3Rpb24gbGVycChhLCBiLCByYXRpbykge1xyXG4gICAgcmV0dXJuIGEgKyByYXRpbyAqIChiIC0gYSk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQW5pbWF0aW9uO1xyXG5cclxuXHJcbiIsImZ1bmN0aW9uIE1pbmlNYXAoKSB7IC8vZGVwcmVjYXRlZCwgcGxlYXNlIHVwZGF0ZVxyXG59XHJcblxyXG5NaW5pTWFwLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgaWYgKG1hcFRpbWVyIDw9IDAgfHwgc2VydmVyTWFwID09PSBudWxsKSB7XHJcbiAgICAgICAgdmFyIHRpbGVMZW5ndGggPSBNYXRoLnNxcnQoT2JqZWN0LnNpemUoVElMRV9MSVNUKSk7XHJcbiAgICAgICAgaWYgKHRpbGVMZW5ndGggPT09IDAgfHwgIXNlbGZQbGF5ZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgaW1nRGF0YSA9IG1haW5DdHguY3JlYXRlSW1hZ2VEYXRhKHRpbGVMZW5ndGgsIHRpbGVMZW5ndGgpO1xyXG4gICAgICAgIHZhciB0aWxlO1xyXG4gICAgICAgIHZhciB0aWxlUkdCO1xyXG4gICAgICAgIHZhciBpID0gMDtcclxuXHJcblxyXG4gICAgICAgIGZvciAodmFyIGlkIGluIFRJTEVfTElTVCkge1xyXG4gICAgICAgICAgICB0aWxlUkdCID0ge307XHJcbiAgICAgICAgICAgIHRpbGUgPSBUSUxFX0xJU1RbaWRdO1xyXG4gICAgICAgICAgICBpZiAodGlsZS5jb2xvciAmJiB0aWxlLmFsZXJ0IHx8IGluQm91bmRzKHNlbGZQbGF5ZXIsIHRpbGUueCwgdGlsZS55KSkge1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5yID0gdGlsZS5jb2xvci5yO1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5nID0gdGlsZS5jb2xvci5nO1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5iID0gdGlsZS5jb2xvci5iO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5yID0gMDtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuZyA9IDA7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLmIgPSAwO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpbWdEYXRhLmRhdGFbaV0gPSB0aWxlUkdCLnI7XHJcbiAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpICsgMV0gPSB0aWxlUkdCLmc7XHJcbiAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpICsgMl0gPSB0aWxlUkdCLmI7XHJcbiAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpICsgM10gPSAyNTU7XHJcbiAgICAgICAgICAgIGkgKz0gNDtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc29sZS5sb2coNDAwIC8gT2JqZWN0LnNpemUoVElMRV9MSVNUKSk7XHJcbiAgICAgICAgaW1nRGF0YSA9IHNjYWxlSW1hZ2VEYXRhKGltZ0RhdGEsIE1hdGguZmxvb3IoNDAwIC8gT2JqZWN0LnNpemUoVElMRV9MSVNUKSksIG1haW5DdHgpO1xyXG5cclxuICAgICAgICBtTWFwQ3R4LnB1dEltYWdlRGF0YShpbWdEYXRhLCAwLCAwKTtcclxuXHJcbiAgICAgICAgbU1hcEN0eFJvdC5yb3RhdGUoOTAgKiBNYXRoLlBJIC8gMTgwKTtcclxuICAgICAgICBtTWFwQ3R4Um90LnNjYWxlKDEsIC0xKTtcclxuICAgICAgICBtTWFwQ3R4Um90LmRyYXdJbWFnZShtTWFwLCAwLCAwKTtcclxuICAgICAgICBtTWFwQ3R4Um90LnNjYWxlKDEsIC0xKTtcclxuICAgICAgICBtTWFwQ3R4Um90LnJvdGF0ZSgyNzAgKiBNYXRoLlBJIC8gMTgwKTtcclxuXHJcbiAgICAgICAgc2VydmVyTWFwID0gbU1hcFJvdDtcclxuICAgICAgICBtYXBUaW1lciA9IDI1O1xyXG4gICAgfVxyXG5cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIG1hcFRpbWVyIC09IDE7XHJcbiAgICB9XHJcblxyXG4gICAgbWFpbkN0eC5kcmF3SW1hZ2Uoc2VydmVyTWFwLCA4MDAsIDQwMCk7XHJcbn07IC8vZGVwcmVjYXRlZFxyXG5cclxuTWluaU1hcC5wcm90b3R5cGUuc2NhbGVJbWFnZURhdGEgPSBmdW5jdGlvbiAoaW1hZ2VEYXRhLCBzY2FsZSwgbWFpbkN0eCkge1xyXG4gICAgdmFyIHNjYWxlZCA9IG1haW5DdHguY3JlYXRlSW1hZ2VEYXRhKGltYWdlRGF0YS53aWR0aCAqIHNjYWxlLCBpbWFnZURhdGEuaGVpZ2h0ICogc2NhbGUpO1xyXG4gICAgdmFyIHN1YkxpbmUgPSBtYWluQ3R4LmNyZWF0ZUltYWdlRGF0YShzY2FsZSwgMSkuZGF0YTtcclxuICAgIGZvciAodmFyIHJvdyA9IDA7IHJvdyA8IGltYWdlRGF0YS5oZWlnaHQ7IHJvdysrKSB7XHJcbiAgICAgICAgZm9yICh2YXIgY29sID0gMDsgY29sIDwgaW1hZ2VEYXRhLndpZHRoOyBjb2wrKykge1xyXG4gICAgICAgICAgICB2YXIgc291cmNlUGl4ZWwgPSBpbWFnZURhdGEuZGF0YS5zdWJhcnJheShcclxuICAgICAgICAgICAgICAgIChyb3cgKiBpbWFnZURhdGEud2lkdGggKyBjb2wpICogNCxcclxuICAgICAgICAgICAgICAgIChyb3cgKiBpbWFnZURhdGEud2lkdGggKyBjb2wpICogNCArIDRcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgZm9yICh2YXIgeCA9IDA7IHggPCBzY2FsZTsgeCsrKSBzdWJMaW5lLnNldChzb3VyY2VQaXhlbCwgeCAqIDQpXHJcbiAgICAgICAgICAgIGZvciAodmFyIHkgPSAwOyB5IDwgc2NhbGU7IHkrKykge1xyXG4gICAgICAgICAgICAgICAgdmFyIGRlc3RSb3cgPSByb3cgKiBzY2FsZSArIHk7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGVzdENvbCA9IGNvbCAqIHNjYWxlO1xyXG4gICAgICAgICAgICAgICAgc2NhbGVkLmRhdGEuc2V0KHN1YkxpbmUsIChkZXN0Um93ICogc2NhbGVkLndpZHRoICsgZGVzdENvbCkgKiA0KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzY2FsZWQ7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE1pbmlNYXA7IiwiZnVuY3Rpb24gUGxheWVyKHBsYXllckluZm8sIGNsaWVudCkge1xyXG4gICAgdGhpcy5pZCA9IHBsYXllckluZm8uaWQ7XHJcbiAgICB0aGlzLm5hbWUgPSBwbGF5ZXJJbmZvLm5hbWU7XHJcbiAgICB0aGlzLnggPSBwbGF5ZXJJbmZvLng7XHJcbiAgICB0aGlzLnkgPSBwbGF5ZXJJbmZvLnk7XHJcbiAgICB0aGlzLmhlYWx0aCA9IHBsYXllckluZm8uaGVhbHRoO1xyXG4gICAgdGhpcy5tYXhIZWFsdGggPSBwbGF5ZXJJbmZvLm1heEhlYWx0aDtcclxuICAgIHRoaXMudGhldGEgPSBwbGF5ZXJJbmZvLnRoZXRhO1xyXG4gICAgdGhpcy5sZXZlbCA9IHBsYXllckluZm8ubGV2ZWw7IC8vbmVlZCB0byBpbXBsZW1lbnQgYWdhaW5cclxuICAgIHRoaXMucmFkaXVzID0gcGxheWVySW5mby5yYWRpdXM7XHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxuXHJcbiAgICBpZiAoIXRoaXMuU0VMRl9QTEFZRVIgJiYgdGhpcy5pZCA9PT0gdGhpcy5jbGllbnQuU0VMRl9JRCkge1xyXG4gICAgICAgIHRoaXMuY2xpZW50LmFjdGl2ZSA9IHRoaXMuYWN0aXZlOyAvL3Byb2JhYmx5IHNob3VsZCBjaGFuZ2UgdGhpc1xyXG4gICAgICAgIHRoaXMuY2xpZW50LlNFTEZfUExBWUVSID0gdGhpcztcclxuICAgIH1cclxufVxyXG5cclxuUGxheWVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAocGxheWVySW5mbykge1xyXG4gICAgdGhpcy54ID0gcGxheWVySW5mby54O1xyXG4gICAgdGhpcy55ID0gcGxheWVySW5mby55O1xyXG4gICAgdGhpcy5oZWFsdGggPSBwbGF5ZXJJbmZvLmhlYWx0aDtcclxuICAgIHRoaXMubWF4SGVhbHRoID0gcGxheWVySW5mby5tYXhIZWFsdGg7XHJcbiAgICB0aGlzLnRoZXRhID0gcGxheWVySW5mby50aGV0YTtcclxuICAgIHRoaXMubGV2ZWwgPSBwbGF5ZXJJbmZvLmxldmVsO1xyXG59O1xyXG5cclxuUGxheWVyLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50Lm1haW5DdHg7XHJcbiAgICB2YXIgc2VsZklkID0gdGhpcy5jbGllbnQuU0VMRl9JRDtcclxuICAgIHZhciBmaWxsQWxwaGE7XHJcbiAgICB2YXIgc3Ryb2tlQWxwaGE7XHJcbiAgICB2YXIgaTtcclxuXHJcblxyXG4gICAgZmlsbEFscGhhID0gdGhpcy5oZWFsdGggLyAoNCAqIHRoaXMubWF4SGVhbHRoKTtcclxuICAgIHN0cm9rZUFscGhhID0gMTtcclxuXHJcbiAgICBjdHguZm9udCA9IFwiMjBweCBBcmlhbFwiO1xyXG5cclxuXHJcbiAgICBpZiAodGhpcy5yYW5nZSAmJiB0aGlzLmlkID09PSBzZWxmSWQpIHtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmFjdGl2ZSkge1xyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDE5NiwgNDEsIDU0LCAwLjIpXCI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDY2LCAxMDgsIDE3NSwgMC4yKVwiO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdHguYXJjKHRoaXMueCwgdGhpcy55LCB0aGlzLnJhbmdlLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoMjUyLCAxMDIsIDM3LFwiICsgc3Ryb2tlQWxwaGEgKyBcIilcIjtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBcInJnYmEoMTIzLDAsMCxcIiArIGZpbGxBbHBoYSArIFwiKVwiO1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IDEwO1xyXG5cclxuXHJcbiAgICB2YXIgcmFkaXVzID0gdGhpcy5yYWRpdXMgKiA1O1xyXG5cclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5tb3ZlVG8odGhpcy54ICsgcmFkaXVzLCB0aGlzLnkpO1xyXG5cclxuICAgIHZhciB0aGV0YSwgeCwgeTtcclxuICAgIGZvciAoaSA9IE1hdGguUEkgLyA0OyBpIDw9IDIgKiBNYXRoLlBJIC0gTWF0aC5QSSAvIDQ7IGkgKz0gTWF0aC5QSSAvIDQpIHtcclxuICAgICAgICB0aGV0YSA9IGk7XHJcbiAgICAgICAgeCA9IHJhZGl1cyAqIE1hdGguY29zKHRoZXRhKTtcclxuICAgICAgICB5ID0gcmFkaXVzICogTWF0aC5zaW4odGhldGEpO1xyXG4gICAgICAgIGN0eC5saW5lVG8odGhpcy54ICsgeCwgdGhpcy55ICsgeSk7XHJcbiAgICB9XHJcbiAgICBjdHgubGluZVRvKHRoaXMueCArIHJhZGl1cywgdGhpcy55ICsgMyk7XHJcbiAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICBjdHguZmlsbCgpO1xyXG5cclxuXHJcbiAgICBjdHguZmlsbFN0eWxlID0gXCIjZmY5ZDYwXCI7XHJcbiAgICBjdHguZmlsbFRleHQodGhpcy5uYW1lLCB0aGlzLngsIHRoaXMueSArIDcwKTtcclxuXHJcblxyXG4gICAgaWYgKHRoaXMuaGVhbHRoICYmIHRoaXMubWF4SGVhbHRoICYmIHRoaXMuaGVhbHRoID4gMCkgeyAvL2hlYWx0aCBiYXJcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gMTA7XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiYmxhY2tcIjtcclxuICAgICAgICBjdHgucmVjdCh0aGlzLngsIHRoaXMueSwgMTAwLCAyMCk7XHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuXHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImdyZWVuXCI7XHJcbiAgICAgICAgY3R4LnJlY3QodGhpcy54LCB0aGlzLnksIDEwMCAqIHRoaXMuaGVhbHRoIC8gdGhpcy5tYXhIZWFsdGgsIDIwKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIH0gLy9kaXNwbGF5IGhlYWx0aCBiYXJcclxuXHJcblxyXG4gICAgY3R4LmNsb3NlUGF0aCgpO1xyXG59O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbShtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbjtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQbGF5ZXI7IiwiZnVuY3Rpb24gUm9jayhyb2NrSW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLnggPSByb2NrSW5mby54O1xyXG4gICAgdGhpcy55ID0gcm9ja0luZm8ueTtcclxuICAgIHRoaXMudmVydGljZXMgPSByb2NrSW5mby52ZXJ0aWNlcztcclxuICAgIHRoaXMudGhldGEgPSByb2NrSW5mby50aGV0YTtcclxuICAgIHRoaXMudGV4dHVyZSA9IHJvY2tJbmZvLnRleHR1cmU7XHJcbiAgICB0aGlzLm5ldXRyYWwgPSByb2NrSW5mby5uZXV0cmFsO1xyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbn1cclxuXHJcblJvY2sucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChyb2NrSW5mbykge1xyXG4gICAgdGhpcy54ID0gcm9ja0luZm8ueDtcclxuICAgIHRoaXMueSA9IHJvY2tJbmZvLnk7XHJcbiAgICB0aGlzLnF1ZXVlUG9zaXRpb24gPSByb2NrSW5mby5xdWV1ZVBvc2l0aW9uOyAvL2RlbGV0ZVxyXG4gICAgdGhpcy50aGV0YSA9IHJvY2tJbmZvLnRoZXRhO1xyXG4gICAgdGhpcy5vd25lciA9IHJvY2tJbmZvLm93bmVyO1xyXG4gICAgdGhpcy5uZXV0cmFsID0gcm9ja0luZm8ubmV1dHJhbDtcclxuICAgIHRoaXMuaGVhbHRoID0gcm9ja0luZm8uaGVhbHRoO1xyXG4gICAgdGhpcy5tYXhIZWFsdGggPSByb2NrSW5mby5tYXhIZWFsdGg7XHJcbiAgICB0aGlzLmZhc3QgPSByb2NrSW5mby5mYXN0O1xyXG59O1xyXG5cclxuXHJcblJvY2sucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgY3R4ID0gdGhpcy5jbGllbnQubWFpbkN0eDtcclxuICAgIHZhciBTQ0FMRSA9IDEwMDtcclxuXHJcblxyXG4gICAgY3R4LmZpbGxTdHlsZSA9IFwicGlua1wiOyAvL2RlZmF1bHQgY29sb3JcclxuICAgIHN3aXRjaCAodGhpcy50ZXh0dXJlKSB7XHJcbiAgICAgICAgY2FzZSBcImJyb256ZVwiOlxyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJicm93blwiO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwic2lsdmVyXCI6XHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImdyZXlcIjtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImdvbGRcIjpcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwieWVsbG93XCI7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSAhdGhpcy5vd25lciA/IFwiYmx1ZVwiIDogXCJncmVlblwiO1xyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5mYXN0ID8gXCJyZWRcIiA6IGN0eC5zdHJva2VTdHlsZTtcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IHRoaXMubmV1dHJhbCA/IFwicGlua1wiIDogY3R4LnN0cm9rZVN0eWxlO1xyXG5cclxuXHJcbiAgICBpZiAoIXRoaXMudmVydGljZXMpIHtcclxuICAgICAgICAvL2NvbnNvbGUubG9nKHRoaXMueCwgdGhpcy55KTtcclxuICAgIH1cclxuXHJcbiAgICBjdHgudHJhbnNsYXRlKHRoaXMueCwgdGhpcy55KTtcclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5yb3RhdGUodGhpcy50aGV0YSk7XHJcblxyXG4gICAgaWYgKHRoaXMudmVydGljZXMpIHtcclxuICAgICAgICB2YXIgdiA9IHRoaXMudmVydGljZXM7XHJcbiAgICAgICAgY3R4Lm1vdmVUbyh2WzBdWzBdICogU0NBTEUsIHZbMF1bMV0gKiBTQ0FMRSk7XHJcblxyXG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgdi5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBjdHgubGluZVRvKHZbaV1bMF0gKiBTQ0FMRSwgdltpXVsxXSAqIFNDQUxFKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3R4LmxpbmVUbyh2WzBdWzBdICogU0NBTEUsIHZbMF1bMV0gKiBTQ0FMRSk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgMzAsIDMwKTtcclxuICAgIH1cclxuXHJcbiAgICBjdHgucm90YXRlKDIgKiBNYXRoLlBJIC0gdGhpcy50aGV0YSk7XHJcbiAgICBjdHguZmlsbCgpO1xyXG4gICAgY3R4LnN0cm9rZSgpO1xyXG5cclxuICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIGN0eC50cmFuc2xhdGUoLXRoaXMueCwgLXRoaXMueSk7XHJcblxyXG5cclxuICAgIGlmICh0aGlzLmhlYWx0aCAmJiB0aGlzLm1heEhlYWx0aCAmJiB0aGlzLmhlYWx0aCA+IDApIHsgLy9oZWFsdGggYmFyXHJcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDEwO1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcImJsYWNrXCI7XHJcbiAgICAgICAgY3R4LnJlY3QodGhpcy54LCB0aGlzLnksIDEwMCwgMjApO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcblxyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJncmVlblwiO1xyXG4gICAgICAgIGN0eC5yZWN0KHRoaXMueCwgdGhpcy55LCAxMDAgKiB0aGlzLmhlYWx0aCAvIHRoaXMubWF4SGVhbHRoLCAyMCk7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICB9IC8vZGlzcGxheSBoZWFsdGggYmFyXHJcbn07XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJvY2s7IiwiZnVuY3Rpb24gVGlsZSh0aGlzSW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gdGhpc0luZm8uaWQ7XHJcbiAgICB0aGlzLnggPSB0aGlzSW5mby54O1xyXG4gICAgdGhpcy55ID0gdGhpc0luZm8ueTtcclxuICAgIHRoaXMubGVuZ3RoID0gdGhpc0luZm8ubGVuZ3RoO1xyXG4gICAgdGhpcy5jb2xvciA9IHRoaXNJbmZvLmNvbG9yO1xyXG4gICAgdGhpcy50b3BDb2xvciA9IHtcclxuICAgICAgICByOiB0aGlzLmNvbG9yLnIgKyAxMCxcclxuICAgICAgICBnOiB0aGlzLmNvbG9yLmcgKyAxMCxcclxuICAgICAgICBiOiB0aGlzLmNvbG9yLmIgKyAxMFxyXG4gICAgfTtcclxuICAgIHRoaXMuYm9yZGVyQ29sb3IgPSB7XHJcbiAgICAgICAgcjogdGhpcy5jb2xvci5yIC0gMTAsXHJcbiAgICAgICAgZzogdGhpcy5jb2xvci5nIC0gMTAsXHJcbiAgICAgICAgYjogdGhpcy5jb2xvci5iIC0gMTBcclxuICAgIH07XHJcbiAgICB0aGlzLmFsZXJ0ID0gdGhpc0luZm8uYWxlcnQ7XHJcbiAgICB0aGlzLnJhbmRvbSA9IE1hdGguZmxvb3IoZ2V0UmFuZG9tKDAsIDMpKTtcclxuXHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuVGlsZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKHRoaXNJbmZvKSB7XHJcbiAgICB0aGlzLmNvbG9yID0gdGhpc0luZm8uY29sb3I7XHJcbiAgICB0aGlzLnRvcENvbG9yID0ge1xyXG4gICAgICAgIHI6IHRoaXMuY29sb3IuciArIDEwMCxcclxuICAgICAgICBnOiB0aGlzLmNvbG9yLmcgKyAxMDAsXHJcbiAgICAgICAgYjogdGhpcy5jb2xvci5iICsgMTAwXHJcbiAgICB9O1xyXG4gICAgdGhpcy5ib3JkZXJDb2xvciA9IHtcclxuICAgICAgICByOiB0aGlzLmNvbG9yLnIgLSAxMCxcclxuICAgICAgICBnOiB0aGlzLmNvbG9yLmcgLSAxMCxcclxuICAgICAgICBiOiB0aGlzLmNvbG9yLmIgLSAxMFxyXG4gICAgfTtcclxuICAgIHRoaXMuYWxlcnQgPSB0aGlzSW5mby5hbGVydDtcclxufTtcclxuXHJcblRpbGUucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgY3R4ID0gdGhpcy5jbGllbnQubWFpbkN0eDtcclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuXHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYihcIiArIHRoaXMuYm9yZGVyQ29sb3IuciArIFwiLFwiICsgdGhpcy5ib3JkZXJDb2xvci5nICsgXCIsXCIgKyB0aGlzLmJvcmRlckNvbG9yLmIgKyBcIilcIjtcclxuICAgIGN0eC5saW5lV2lkdGggPSAyMDtcclxuXHJcblxyXG4gICAgdmFyIGdyZCA9IGN0eC5jcmVhdGVMaW5lYXJHcmFkaWVudCh0aGlzLnggKyB0aGlzLmxlbmd0aCAqIDMvNCwgdGhpcy55LCB0aGlzLnggKyB0aGlzLmxlbmd0aC80LCB0aGlzLnkgKyB0aGlzLmxlbmd0aCk7XHJcbiAgICBncmQuYWRkQ29sb3JTdG9wKDAsIFwicmdiKFwiICsgdGhpcy50b3BDb2xvci5yICsgXCIsXCIgKyB0aGlzLnRvcENvbG9yLmcgKyBcIixcIiArIHRoaXMudG9wQ29sb3IuYiArIFwiKVwiKTtcclxuICAgIGdyZC5hZGRDb2xvclN0b3AoMSwgXCJyZ2IoXCIgKyB0aGlzLmNvbG9yLnIgKyBcIixcIiArIHRoaXMuY29sb3IuZyArIFwiLFwiICsgdGhpcy5jb2xvci5iICsgXCIpXCIpO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IGdyZDtcclxuXHJcblxyXG4gICAgY3R4LnJlY3QodGhpcy54ICsgMzAsIHRoaXMueSArIDMwLCB0aGlzLmxlbmd0aCAtIDMwLCB0aGlzLmxlbmd0aCAtIDMwKTtcclxuXHJcbiAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICBjdHguZmlsbCgpO1xyXG5cclxuXHJcbn07XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBUaWxlO1xyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbShtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbjtcclxufSIsIm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgQW5pbWF0aW9uOiByZXF1aXJlKCcuL0FuaW1hdGlvbicpLFxyXG4gICAgUGxheWVyOiByZXF1aXJlKCcuL1BsYXllcicpLFxyXG4gICAgTWluaU1hcDogcmVxdWlyZSgnLi9NaW5pTWFwJyksXHJcbiAgICBUaWxlOiByZXF1aXJlKCcuL1RpbGUnKSxcclxuICAgIFJvY2s6IHJlcXVpcmUoJy4vUm9jaycpXHJcbn07IiwidmFyIENsaWVudCA9IHJlcXVpcmUoJy4vQ2xpZW50LmpzJyk7XHJcbnZhciBNYWluVUkgPSByZXF1aXJlKCcuL3VpL01haW5VSScpO1xyXG5cclxudmFyIGNsaWVudCA9IG5ldyBDbGllbnQoKTtcclxuY2xpZW50LnN0YXJ0KCk7XHJcblxyXG5cclxuZG9jdW1lbnQub25rZXlkb3duID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBpZiAoY2xpZW50LkNIQVRfT1BFTikge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGNsaWVudC5rZXlzW2V2ZW50LmtleUNvZGVdID0gdHJ1ZTtcclxuICAgIGNsaWVudC5zb2NrZXQuZW1pdCgna2V5RXZlbnQnLCB7aWQ6IGV2ZW50LmtleUNvZGUsIHN0YXRlOiB0cnVlfSk7XHJcbn07XHJcblxyXG5kb2N1bWVudC5vbmtleXVwID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gODQpIHtcclxuICAgICAgICBjbGllbnQubWFpblVJLmdhbWVVSS5jaGF0VUkudGV4dElucHV0LmNsaWNrKCk7XHJcbiAgICB9XHJcbiAgICBjbGllbnQua2V5c1tldmVudC5rZXlDb2RlXSA9IGZhbHNlO1xyXG4gICAgY2xpZW50LnNvY2tldC5lbWl0KCdrZXlFdmVudCcsIHtpZDogZXZlbnQua2V5Q29kZSwgc3RhdGU6IGZhbHNlfSk7XHJcbn07XHJcblxyXG5cclxuJCh3aW5kb3cpLmJpbmQoJ21vdXNld2hlZWwgRE9NTW91c2VTY3JvbGwnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGlmIChldmVudC5jdHJsS2V5ID09PSB0cnVlKSB7XHJcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIH1cclxuICAgIGlmIChjbGllbnQuQ0hBVF9TQ1JPTEwpIHtcclxuICAgICAgICBjbGllbnQuQ0hBVF9TQ1JPTEwgPSBmYWxzZTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgaWYoZXZlbnQub3JpZ2luYWxFdmVudC53aGVlbERlbHRhIC8xMjAgPiAwICYmIGNsaWVudC5tYWluU2NhbGVGYWN0b3IgPCAyKSB7XHJcbiAgICAgICAgY2xpZW50Lm1haW5TY2FsZUZhY3RvciArPSAwLjI7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChjbGllbnQubWFpblNjYWxlRmFjdG9yID4gMC4zKSB7XHJcbiAgICAgICAgY2xpZW50Lm1haW5TY2FsZUZhY3RvciAtPSAwLjI7XHJcbiAgICB9XHJcbn0pO1xyXG5cclxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY29udGV4dG1lbnUnLCBmdW5jdGlvbiAoZSkgeyAvL3ByZXZlbnQgcmlnaHQtY2xpY2sgY29udGV4dCBtZW51XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbn0sIGZhbHNlKTsiLCJkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUub3ZlcmZsb3cgPSAnaGlkZGVuJzsgIC8vIGZpcmVmb3gsIGNocm9tZVxyXG5kb2N1bWVudC5ib2R5LnNjcm9sbCA9IFwibm9cIjtcclxuXHJcbnZhciBQbGF5ZXJOYW1lclVJID0gcmVxdWlyZSgnLi9QbGF5ZXJOYW1lclVJJyk7XHJcbnZhciBHYW1lVUkgPSByZXF1aXJlKCcuL2dhbWUvR2FtZVVJJyk7XHJcblxyXG5mdW5jdGlvbiBNYWluVUkoY2xpZW50LCBzb2NrZXQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcblxyXG4gICAgdGhpcy5nYW1lVUkgPSBuZXcgR2FtZVVJKHRoaXMuY2xpZW50LCB0aGlzLnNvY2tldCwgdGhpcyk7XHJcblxyXG4gICAgdGhpcy5wbGF5ZXJOYW1lclVJID0gbmV3IFBsYXllck5hbWVyVUkodGhpcy5jbGllbnQsIHRoaXMuc29ja2V0KTtcclxufVxyXG5cclxuTWFpblVJLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKGluZm8pIHtcclxuICAgIHZhciBhY3Rpb24gPSBpbmZvLmFjdGlvbjtcclxuICAgIHZhciBob21lO1xyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJnYW1lTXNnUHJvbXB0XCIpIHtcclxuICAgICAgICB0aGlzLmdhbWVVSS5nYW1lTXNnUHJvbXB0Lm9wZW4oaW5mby5tZXNzYWdlKTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5NYWluVUkucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKGFjdGlvbikge1xyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJnYW1lTXNnUHJvbXB0XCIpIHtcclxuICAgICAgICB0aGlzLmdhbWVVSS5nYW1lTXNnUHJvbXB0LmNsb3NlKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuTWFpblVJLnByb3RvdHlwZS51cGRhdGVMZWFkZXJCb2FyZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBsZWFkZXJib2FyZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibGVhZGVyYm9hcmRcIik7XHJcbiAgICB2YXIgUExBWUVSX0FSUkFZID0gdGhpcy5jbGllbnQuUExBWUVyX0FSUkFZO1xyXG5cclxuXHJcbiAgICB2YXIgcGxheWVyU29ydCA9IGZ1bmN0aW9uIChhLCBiKSB7XHJcbiAgICAgICAgdmFyIGZhY3Rpb25BID0gdGhpcy5jbGllbnQuQ09OVFJPTExFUl9MSVNUW2FdO1xyXG4gICAgICAgIHZhciBmYWN0aW9uQiA9IHRoaXMuY2xpZW50LkNPTlRST0xMRVJfTElTVFtiXTtcclxuICAgICAgICByZXR1cm4gZmFjdGlvbkEuc2NvcmUgLSBmYWN0aW9uQi5zY29yZTtcclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcbiAgICBQTEFZRVJfQVJSQVkuc29ydChwbGF5ZXJTb3J0KTtcclxuICAgIGxlYWRlcmJvYXJkLmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IFBMQVlFUl9BUlJBWS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgIHZhciBwbGF5ZXIgPSB0aGlzLmNsaWVudC5DT05UUk9MTEVSX0xJU1RbUExBWUVSX0FSUkFZW2ldXTtcclxuXHJcbiAgICAgICAgdmFyIGVudHJ5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcclxuICAgICAgICBlbnRyeS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShwbGF5ZXIubmFtZSArIFwiIC0gXCIgKyBwbGF5ZXIuc2NvcmUpKTtcclxuICAgICAgICBsZWFkZXJib2FyZC5hcHBlbmRDaGlsZChlbnRyeSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWFpblVJOyIsImZ1bmN0aW9uIFBsYXllck5hbWVyVUkgKGNsaWVudCwgc29ja2V0KSB7XHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxuICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xyXG5cclxuICAgIHRoaXMubGVhZGVyYm9hcmQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxlYWRlcmJvYXJkX2NvbnRhaW5lclwiKTtcclxuICAgIHRoaXMubmFtZUJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibmFtZVN1Ym1pdFwiKTtcclxuICAgIHRoaXMucGxheWVyTmFtZUlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbGF5ZXJOYW1lSW5wdXRcIik7XHJcbiAgICB0aGlzLnBsYXllck5hbWVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbGF5ZXJfbmFtZXJcIik7XHJcbn1cclxuXHJcblBsYXllck5hbWVyVUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnBsYXllck5hbWVJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcclxuICAgICAgICAgICAgdGhpcy5uYW1lQnRuLmNsaWNrKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB0aGlzLm5hbWVCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLmNsaWVudC5tYWluQ2FudmFzLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICB0aGlzLmxlYWRlcmJvYXJkLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICB0aGlzLnNvY2tldC5lbWl0KFwibmV3UGxheWVyXCIsXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IHRoaXMucGxheWVyTmFtZUlucHV0LnZhbHVlLFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLnBsYXllck5hbWVyLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMucGxheWVyTmFtZXIuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgdGhpcy5wbGF5ZXJOYW1lSW5wdXQuZm9jdXMoKTtcclxuICAgIHRoaXMubGVhZGVyYm9hcmQuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBsYXllck5hbWVyVUk7IiwiZnVuY3Rpb24gQ2hhdFVJKHBhcmVudCkge1xyXG4gICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XHJcbiAgICB0aGlzLnRlbXBsYXRlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjaGF0X2NvbnRhaW5lclwiKTtcclxuICAgIHRoaXMudGV4dElucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NoYXRfaW5wdXQnKTtcclxuICAgIHRoaXMuY2hhdExpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hhdF9saXN0Jyk7XHJcblxyXG5cclxuICAgIHRoaXMudGV4dElucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMudGV4dElucHV0LmZvY3VzKCk7XHJcblxyXG4gICAgICAgIHRoaXMucGFyZW50LmNsaWVudC5DSEFUX09QRU4gPSB0cnVlO1xyXG4gICAgICAgIHRoaXMuY2hhdExpc3Quc3R5bGUuaGVpZ2h0ID0gXCI4MCVcIjtcclxuICAgICAgICB0aGlzLmNoYXRMaXN0LnN0eWxlLm92ZXJmbG93WSA9IFwiYXV0b1wiO1xyXG5cclxuICAgICAgICB0aGlzLnRleHRJbnB1dC5zdHlsZS5iYWNrZ3JvdW5kID0gXCJyZ2JhKDM0LCA0OCwgNzEsIDEpXCI7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG4gICAgdGhpcy50ZXh0SW5wdXQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMTMpIHtcclxuICAgICAgICAgICAgdGhpcy5zZW5kTWVzc2FnZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG5cclxuICAgIHRoaXMudGVtcGxhdGUuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V3aGVlbCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnBhcmVudC5jbGllbnQuQ0hBVF9TQ1JPTEwgPSB0cnVlO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB0aGlzLnRlbXBsYXRlLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnBhcmVudC5jbGllbnQuQ0hBVF9DTElDSyA9IHRydWU7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG59XHJcblxyXG5DaGF0VUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAobWVzc2FnZSkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xyXG4gICAgdGhpcy5jbG9zZSgpO1xyXG59O1xyXG5cclxuXHJcbkNoYXRVSS5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnRleHRJbnB1dC5ibHVyKCk7XHJcbiAgICB0aGlzLnBhcmVudC5jbGllbnQuQ0hBVF9PUEVOID0gZmFsc2U7XHJcbiAgICB0aGlzLmNoYXRMaXN0LnN0eWxlLmhlaWdodCA9IFwiMzAlXCI7XHJcbiAgICB0aGlzLmNoYXRMaXN0LnN0eWxlLmJhY2tncm91bmQgPSBcInJnYmEoMTgyLCAxOTMsIDIxMSwgMC4wMilcIjtcclxuICAgIHRoaXMudGV4dElucHV0LnN0eWxlLmJhY2tncm91bmQgPSBcInJnYmEoMTgyLCAxOTMsIDIxMSwgMC4xKVwiO1xyXG4gICAgdGhpcy5wYXJlbnQuY2xpZW50LkNIQVRfU0NST0xMID0gZmFsc2U7XHJcbiAgICAkKCcjY2hhdF9saXN0JykuYW5pbWF0ZSh7c2Nyb2xsVG9wOiAkKCcjY2hhdF9saXN0JykucHJvcChcInNjcm9sbEhlaWdodFwiKX0sIDEwMCk7XHJcbiAgICB0aGlzLmNoYXRMaXN0LnN0eWxlLm92ZXJmbG93WSA9IFwibm9uZVwiO1xyXG59O1xyXG5cclxuXHJcbkNoYXRVSS5wcm90b3R5cGUuYWRkTWVzc2FnZSA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcclxuICAgIHZhciBlbnRyeSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcbiAgICBlbnRyeS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShwYWNrZXQubmFtZSArIFwiIDogXCIgKyBwYWNrZXQuY2hhdE1lc3NhZ2UpKTtcclxuICAgIHRoaXMuY2hhdExpc3QuYXBwZW5kQ2hpbGQoZW50cnkpO1xyXG5cclxuICAgICQoJyNjaGF0X2xpc3QnKS5hbmltYXRlKHtzY3JvbGxUb3A6ICQoJyNjaGF0X2xpc3QnKS5wcm9wKFwic2Nyb2xsSGVpZ2h0XCIpfSwgMTAwKTtcclxufTtcclxuXHJcblxyXG5DaGF0VUkucHJvdG90eXBlLnNlbmRNZXNzYWdlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHNvY2tldCA9IHRoaXMucGFyZW50LnNvY2tldDtcclxuXHJcblxyXG4gICAgaWYgKHRoaXMudGV4dElucHV0LnZhbHVlICYmIHRoaXMudGV4dElucHV0LnZhbHVlICE9PSBcIlwiKSB7XHJcbiAgICAgICAgc29ja2V0LmVtaXQoJ2NoYXRNZXNzYWdlJywge1xyXG4gICAgICAgICAgICBpZDogdGhpcy5wYXJlbnQuY2xpZW50LlNFTEZfSUQsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6IHRoaXMudGV4dElucHV0LnZhbHVlXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy50ZXh0SW5wdXQudmFsdWUgPSBcIlwiO1xyXG4gICAgfVxyXG4gICAgdGhpcy5jbG9zZSgpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDaGF0VUk7XHJcblxyXG5cclxuIiwiZnVuY3Rpb24gR2FtZU1zZ1Byb21wdChwYXJlbnQpIHtcclxuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xyXG4gICAgdGhpcy50ZW1wbGF0ZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicHJvbXB0X2NvbnRhaW5lclwiKTtcclxuICAgIHRoaXMubWVzc2FnZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdnYW1lX21zZ19wcm9tcHQnKTtcclxufVxyXG5cclxuR2FtZU1zZ1Byb21wdC5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcbiAgICB0aGlzLm1lc3NhZ2UuaW5uZXJIVE1MID0gbWVzc2FnZTtcclxufTtcclxuXHJcbkdhbWVNc2dQcm9tcHQucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEdhbWVNc2dQcm9tcHQ7XHJcblxyXG5cclxuIiwidmFyIEdhbWVNc2dQcm9tcHQgPSByZXF1aXJlKCcuL0dhbWVNc2dQcm9tcHQnKTtcclxudmFyIENoYXRVSSA9IHJlcXVpcmUoJy4vQ2hhdFVJJyk7XHJcblxyXG5mdW5jdGlvbiBHYW1lVUkoY2xpZW50LCBzb2NrZXQsIHBhcmVudCkge1xyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbiAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcclxuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xyXG4gICAgdGhpcy5nYW1lTXNnUHJvbXB0ID0gbmV3IEdhbWVNc2dQcm9tcHQodGhpcyk7XHJcbiAgICB0aGlzLmNoYXRVSSA9IG5ldyBDaGF0VUkodGhpcyk7XHJcbn1cclxuXHJcbkdhbWVVSS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGNvbnNvbGUubG9nKFwiT1BFTklORyBHQU1FIFVJXCIpO1xyXG4gICAgdGhpcy5jaGF0VUkub3BlbigpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSAgR2FtZVVJOyJdfQ==
