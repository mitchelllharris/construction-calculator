exports.publicAccess = (req, res) => {
    res.status(200).send("Public Content.");
};

exports.userBoard = (req, res) => {
    res.status(200).send("User Content.");
};

exports.adminBoard = (req, res) => {
    res.status(200).send("Admin Content.");
};

exports.moderatorBoard = (req, res) => {
    res.status(200).send("Moderator Content.");
};

// Token verification endpoint
exports.verifyToken = (req, res) => {
    // If we reach here, the token is valid (verified by authJwt.verifyToken middleware)
    res.status(200).json({
        valid: true,
        message: "Token is valid"
    });
};