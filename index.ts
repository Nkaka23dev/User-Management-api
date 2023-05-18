import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import usersRoutes from "./routes/usersRoutes";
import multer from "multer";
import path from "path";
import fs from "fs";
dotenv.config();
const app = express();

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
  } catch (error) {
    console.error(error);
  }
};

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync("./uploads", { recursive: true });
    cb(null, "uploads"); // Upload directory path
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // File naming
  },
});

const upload = multer({ storage });

// git subtree push --prefix <subfolder> heroku master
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(morgan("dev"));
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// app.use("/uploads", express.static(__dirname + "/uploads"));

// app.use(express.static("uploads"));

// Define the path to the "uploads" folder
const uploadsFolder = path.join(__dirname, "../uploads");

// Serve files from the "uploads" folder
app.use("/uploads", express.static(uploadsFolder));

app.use("/users", usersRoutes);

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  res.status(400);
  res.json({
    message: error,
    status: 400,
  });
});

app.post("/upload", upload.single("image"), (req: any, res) => {
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
    fs.unlinkSync(file.path);

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
