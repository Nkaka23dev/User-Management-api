"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const morgan_1 = __importDefault(require("morgan"));
const cors_1 = __importDefault(require("cors"));
const usersRoutes_1 = __importDefault(require("./routes/usersRoutes"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const cloudinary = require("cloudinary").v2;
// Configuration
cloudinary.config({
    cloud_name: "dhugavkh6",
    api_key: "266388415465118",
    api_secret: "FZA8ZayfwwU7wbYkqko3m8bUvho",
});
// Log the configuration
console.log(cloudinary.config());
/////////////////////////
// Uploads an image file
/////////////////////////
const uploadImage = async (image) => {
    const options = {
        use_filename: true,
        unique_filename: false,
        overwrite: true,
    };
    try {
        // Upload the image
        const result = await cloudinary.uploader.upload(image, options);
        console.log(result);
        return result.public_id;
    }
    catch (error) {
        console.error(error);
    }
};
// Configure Multer storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads"); // Upload directory path
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname); // File naming
    },
});
const upload = (0, multer_1.default)({ storage });
// git subtree push --prefix <subfolder> heroku master
const PORT = process.env.PORT || 4000;
app.use(express_1.default.json());
app.use((0, morgan_1.default)("dev"));
app.use((0, cors_1.default)());
app.use(express_1.default.urlencoded({ extended: true }));
// app.use("/uploads", express.static(__dirname + "/uploads"));
// app.use(express.static("uploads"));
// Define the path to the "uploads" folder
const uploadsFolder = path_1.default.join(__dirname, "../uploads");
// Serve files from the "uploads" folder
app.use("/uploads", express_1.default.static(uploadsFolder));
app.use("/users", usersRoutes_1.default);
app.use((error, req, res, next) => {
    res.status(400);
    res.json({
        message: error,
        status: 400,
    });
});
app.post("/upload", upload.single("image"), (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
    }
    // Access the uploaded file details
    const file = req.file;
    // Upload the file to Cloudinary
    cloudinary.uploader.upload(file.path, (error, result) => {
        if (error) {
            console.error("Error uploading to Cloudinary:", error);
            return res.status(500).send("Error uploading file.");
        }
        // Handle the Cloudinary response
        console.log(result);
        // Delete the uploaded file from the local server
        fs_1.default.unlinkSync(file.path);
        res.json({ url: result.url });
    });
});
app.get("/", async (req, res) => {
    res.json({ message: "👋 welcome on user management api" });
});
app.use("/", async (req, res) => {
    res.status(404).json({ message: "route not found" });
});
app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
});
