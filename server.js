const app = require("./app");

const { PORT } = require("./config/env");

app.listen(PORT, "0.0.0.0", () => {

    console.log(`PetFlow rodando na porta ${PORT}.`);

});
