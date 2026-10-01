const app = require("./app");

const { PORT } = require("./config/env");
const { assertEmailConfigured } = require("./services/emailService");
if (!process.env.GOOGLE_MAPS_API_KEY?.trim() && !process.env.GOOGLE_API_KEY?.trim()) {
    console.warn("[frete] Configure GOOGLE_MAPS_API_KEY ou GOOGLE_API_KEY com Routes API habilitada para liberar novas compras com entrega.");
}

try {
    assertEmailConfigured();
} catch {
    console.warn("[email] Cadastro e recuperação indisponíveis: confira RESEND_API_KEY e EMAIL_FROM nas variáveis do serviço da aplicação e faça novo deploy.");
}

app.listen(PORT, "0.0.0.0", () => {

    console.log(`PetFlow rodando na porta ${PORT}.`);

});
