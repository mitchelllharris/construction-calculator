const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const db = {};

db.mongoose = mongoose;

db.user = require('./user.model.js');
db.role = require('./role.models.js');
db.contactForm = require('./contactform.model.js');
db.contact = require('./contact.model.js');
db.interaction = require('./interaction.model.js');
db.profileView = require('./profileView.model.js');
db.post = require('./post.model.js');

db.ROLES = [
    'user',
    'admin',
    'moderator'
];

module.exports = db;