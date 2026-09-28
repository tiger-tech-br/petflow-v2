"use strict";

/* ==================================================
   MULTER
================================================== */

const multer = require("multer");

/* ==================================================
   CLOUDINARY
================================================== */

const { CloudinaryStorage } = require("multer-storage-cloudinary");

const { cloudinary } = require("../config/cloudinary");

/* ==================================================
   STORAGE
================================================== */

const storage = new CloudinaryStorage({

    cloudinary,

    params: async (request, file) => ({

        folder: "petflow",

        resource_type: "image",

        allowed_formats: [

            "jpg",

            "jpeg",

            "png",

            "webp"

        ]

    })

});

/* ==================================================
   FILTRO
================================================== */

function fileFilter(request, file, callback) {

    const allowedMimeTypes = [

        "image/jpeg",

        "image/jpg",

        "image/png",

        "image/webp"

    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {

        return callback(

            new Error("Formato de imagem não permitido."),

            false

        );

    }

    callback(null, true);

}

/* ==================================================
   UPLOAD
================================================== */

const upload = multer({

    storage,

    fileFilter,

    limits: {

        fileSize: Number(process.env.MAX_FILE_SIZE)

    }

});

/* ==================================================
   EXPORTAÇÃO
================================================== */

module.exports = upload;