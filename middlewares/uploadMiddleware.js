"use strict";

/* ==================================================
   MULTER
================================================== */

const multer = require("multer");

const { cloudinary } = require("../config/cloudinary");

/* ==================================================
   STORAGE
================================================== */

const storage = {
    _handleFile(request, file, callback) {
        const upload = cloudinary.uploader.upload_stream({
            folder: "petflow-v2",
            resource_type: "image",
            allowed_formats: ["jpg", "jpeg", "png", "webp"]
        }, (error, result) => {
            if (error) return callback(error);
            callback(null, {
                path: result.secure_url,
                filename: result.public_id,
                publicId: result.public_id,
                size: result.bytes,
                format: result.format
            });
        });
        file.stream.pipe(upload);
    },
    _removeFile(request, file, callback) {
        if (!file.publicId) return callback(null);
        cloudinary.uploader.destroy(file.publicId)
            .then(() => callback(null))
            .catch(callback);
    }
};

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

        fileSize: Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024

    }

});

/* ==================================================
   EXPORTAÇÃO
================================================== */

module.exports = upload;
