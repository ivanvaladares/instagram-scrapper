exports.init = (app) => {
    app.use("/profile", require("./profile-routes")); 
    app.use("/post", require("./post-routes")); 
};