const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Resume Generator API is working!");
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
const fs = require("fs");
const puppeteer = require("puppeteer");

app.post("/generate-pdf", async (req, res) => {
    const { name, email, skills, experience } = req.body;

    // load HTML file
    let template = fs.readFileSync("template.html", "utf8");

    // replace placeholders
    template = template.replace("{{name}}", name)
                       .replace("{{email}}", email)
                       .replace("{{skills}}", skills)
                       .replace("{{experience}}", experience);

    // launch browser
    const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
});

    const page = await browser.newPage();
    await page.setContent(template);

    // generate pdf
    const pdfBuffer = await page.pdf({ format: "A4" });

    await browser.close();

    // send pdf file
    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=resume.pdf",
    });

    res.send(pdfBuffer);
});
