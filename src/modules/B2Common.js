var B2 = require('./B2');

module.exports = {
    createBox: createBox,
    createRandomPolygon: createRandomPolygon,
    createPolygonSplit: createPolygonSplit,
    createCircleSensor: createCircleSensor,
    findCentroid: findCentroid
};


function createBox(world, user, x, y, width, height) {
    var options = {
        'density': 1.0,
        'friction': 0.1,
        'restitution': 0.0,

        'linearDamping': 0.2,
        'angularDamping': 0.0,

        'gravityScale': 1.0,
        'type': B2.b2Body.b2_dynamicBody,
        'fixedRotation': false,
        'userData': user
    };

    var body_def = new B2.b2BodyDef();
    body_def.position.Set(x, y);
    body_def.linearDamping = options.linearDamping;
    body_def.angularDamping = options.angularDamping;
    body_def.type = options.type;
    body_def.fixedRotation = options.fixedRotation;


    var fix_def = new B2.b2FixtureDef();
    fix_def.density = options.density;
    fix_def.friction = options.friction;
    fix_def.restitution = options.restitution;
    fix_def.shape = new B2.b2PolygonShape();

    fix_def.userData = options.userData;
    //fix_def.filter.maskBits = 0x0000; //nothing can collide with this

    fix_def.shape.SetAsBox(width / 2, height / 2);

    var b = world.CreateBody(body_def);
    b.CreateFixture(fix_def);


    return b;

}


function createRandomPolygon(world, user, vertices, x, y, texture) {
    var density = 0;
    switch (texture) {
        case "bronze":
            density = 1;
            break;
        case "silver":
            density = 4;
            break;
        case "gold":
            density = 20;
            break;
    }
    var options = {
        'density': density,
        'friction': 0.0,
        'restitution': 0.5,

        'linearDamping': 0.2,
        'angularDamping': 1.0,

        'gravityScale': 1.0,
        'type': B2.b2Body.b2_dynamicBody,
        'fixedRotation': false,
        'userData': user
    };

    var body_def = new B2.b2BodyDef();
    body_def.position.Set(x, y);
    body_def.linearDamping = options.linearDamping;
    body_def.angularDamping = options.angularDamping;
    body_def.type = options.type;
    body_def.fixedRotation = options.fixedRotation;

    var fix_def = new B2.b2FixtureDef();
    fix_def.density = options.density;
    fix_def.friction = options.friction;
    fix_def.restitution = options.restitution;


    var b2Vertices = [];
    for (var i = 0; i < vertices.length; i++) {
        var b2Vertex = new B2.b2Vec2();
        b2Vertex.Set(vertices[i][0], vertices[i][1]);
        b2Vertices[i] = b2Vertex;
    }

    var polygon = new B2.b2PolygonShape();
    polygon.SetAsArray(b2Vertices, b2Vertices.length);

    fix_def.shape = polygon;
    fix_def.userData = options.userData;
    //fix_def.filter.maskBits = 0x0000; //nothing can collide with this
    var body = world.CreateBody(body_def);
    body.CreateFixture(fix_def);
    return body;
}

function createPolygonSplit(world, body, v1, v2) {
    var options = {
        'density': body.GetFixtureList().GetDensity(),
        'friction': 0.0,
        'restitution': 0.5,

        'linearDamping': 0.2,
        'angularDamping': 1.0,

        'gravityScale': 1.0,
        'type': B2.b2Body.b2_dynamicBody,
        'fixedRotation': false
    };

    var body_def = new B2.b2BodyDef();
    body_def.position.Set(body.GetPosition().x, body.GetPosition().y);
    body_def.linearDamping = options.linearDamping;
    body_def.angularDamping = options.angularDamping;
    body_def.type = options.type;
    body_def.fixedRotation = options.fixedRotation;

    var fix_def = new B2.b2FixtureDef();
    fix_def.density = options.density;
    fix_def.friction = options.friction;
    fix_def.restitution = options.restitution;


    var b2V1 = [];
    for (var i = 0; i < v1.length; i++) {
        var b2Vertex = new B2.b2Vec2();
        b2Vertex.Set(v1[i][0], v1[i][1]);
        b2V1[i] = b2Vertex;
    }

    var b2V2 = [];
    for (var i = 0; i < v2.length; i++) {
        var b2Vertex = new B2.b2Vec2();
        b2Vertex.Set(v2[i][0], v2[i][1]);
        b2V2[i] = b2Vertex;
    }


    var pol1 = new B2.b2PolygonShape();
    pol1.SetAsArray(b2V1, b2V1.length);

    var pol2 = new B2.b2PolygonShape();
    pol2.SetAsArray(b2V2, b2V2.length);


    world.DestroyBody(body);

    fix_def.shape = pol1;
    var b1 = world.CreateBody(body_def);
    b1.SetAngle(body.GetAngle());
    b1.CreateFixture(fix_def);

    fix_def.shape = pol2;
    var b2 = world.CreateBody(body_def);
    b2.SetAngle(body.GetAngle());
    b2.CreateFixture(fix_def);

    return [b1, b2];

}


function createCircleSensor(body, radius) {
    var fix_def = new B2.b2FixtureDef();


    fix_def.shape = new B2.b2CircleShape();
    fix_def.shape.m_radius = radius;


    fix_def.isSensor = true;
    fix_def.userData = body.GetFixtureList().GetUserData();

    body.CreateFixture(fix_def);
}


function findCentroid(vertices) {
    var centroid = [0, 0];
    var signedArea = 0;
    var a = 0;

    var x0 = 0; // Current vertex X
    var y0 = 0; // Current vertex Y

    var x1 = 0; // Next vertex X
    var y1 = 0; // Next vertex Y


    // For all vertices except last
    for (var i = 0; i < vertices.length - 1; ++i) {
        x0 = vertices[i][0];
        y0 = vertices[i][1];
        x1 = vertices[i + 1][0];
        y1 = vertices[i + 1][1];
        a = x0 * y1 - x1 * y0;
        signedArea += a;
        centroid[0] += (x0 + x1) * a;
        centroid[1] += (y0 + y1) * a;
    }

    // Do last vertex separately to avoid performing an expensive
    // modulus operation in each iteration.
    x0 = vertices[i][0];
    y0 = vertices[i][1];
    x1 = vertices[0][0];
    y1 = vertices[0][1];
    a = x0 * y1 - x1 * y0;
    signedArea += a;
    centroid[0] += (x0 + x1) * a;
    centroid[1] += (y0 + y1) * a;

    signedArea *= 0.5;
    centroid[0] /= (6.0 * signedArea);
    centroid[1] /= (6.0 * signedArea);
    return centroid;
}