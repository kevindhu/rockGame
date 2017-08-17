var B2 = require('./B2');

module.exports = {
    createBox: createBox
};



function createBox(world, user, x, y, width, height) {
    var options = {
        'density': 1.0,
        'friction': 0.1,
        'restitution': 0.0,

        'linearDamping': 0.0,
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
    //fix_def.filter.maskBits = 0x0000;

    fix_def.shape.SetAsBox(width / 2, height / 2);


    var b = world.CreateBody(body_def);
    b.CreateFixture(fix_def);

    return b;
}
