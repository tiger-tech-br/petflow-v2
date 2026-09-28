"use strict";

/* ==================================================
   CLOUDINARY
================================================== */

const cloudinary = require("cloudinary").v2;

/* ==================================================
   ENV
================================================== */

const {

    CLOUDINARY_CLOUD_NAME,

    CLOUDINARY_API_KEY,

    CLOUDINARY_API_SECRET

} = require("./env");

/* ==================================================
   CONFIGURAÇÃO
================================================== */

cloudinary.config({

    cloud_name: CLOUDINARY_CLOUD_NAME,

    api_key: CLOUDINARY_API_KEY,

    api_secret: CLOUDINARY_API_SECRET,

    secure: true

});

/* ==================================================
   TESTAR CONEXÃO
================================================== */

async function testCloudinary() {

    try {

        await cloudinary.api.ping();

        console.log("✅ Cloudinary conectado.");

    } catch (error) {

        console.error("❌ Erro ao conectar ao Cloudinary.");

        console.error(error);

        process.exit(1);

    }

}

/* ==================================================
   EXPORTAÇÃO
================================================== */

module.exports = {

    cloudinary,

    testCloudinary

};