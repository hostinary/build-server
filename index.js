const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mime = require("mime-types");

const s3Client = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_KEY,
  },
});

const PROJECT_ID = process.env.PROJECT_ID;

async function init() {
  console.log("Executing index.js");
  const outputPath = path.join(__dirname, "out");

  const p = exec(`cd ${outputPath} && npm install && npm run build`);

  p.stdout.on("data", function (data) {
    console.log(data.toString());
  });

  p.stdout.on("error", function (data) {
    console.log("Error", data.toString());
  });

  p.on("close", async function () {
    console.log("Build Complete");
    const buildFolderPath = path.join(__dirname, "out", "build");
    const distFolderPath = path.join(__dirname, "out", "dist");

    let outputFolderPath;

    if (fs.existsSync(buildFolderPath)) {
      outputFolderPath = buildFolderPath;
    } else if (fs.existsSync(distFolderPath)) {
      outputFolderPath = distFolderPath;
    } else {
      console.log("No build or dist folder found!!");
      return;
    }

    const outputFolderContent = fs.readdirSync(outputFolderPath, {
      recursive: true,
    });

    for (const file of outputFolderContent) {
      const filePath = path.join(outputFolderPath, file);
      console.log(`Uploading ${filePath}`);
      if (fs.lstatSync(filePath).isDirectory()) continue;

      const uploadToS3Command = new PutObjectCommand({
        Bucket: "hostinary",
        Key: `outputs/${PROJECT_ID}/${file}`,
        Body: fs.createReadStream(filePath),
        ContentType: mime.lookup(filePath),
      });

      await s3Client.send(uploadToS3Command);
      console.log(`Uploaded ${filePath}`);
    }

    console.log("Uploaded to S3!!");
  });
}

init();
