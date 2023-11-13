import express from 'express';
import { engine } from 'express-handlebars';
import { resolve } from 'path';

import { Server } from "socket.io";
const PORT = 4444;

const app = express();


app.set("view engine", "hbs");

app.engine("hbs", engine({
  layoutsDir: resolve("views/layouts"),
  extname: "hbs",
  defaultLayout: "404"
}))

app.get("/", (req, res) => {
    res.render("main", {
      layout: "index",
      mainPage: true,
    });
  })

  app.get("/room1", (req, res) => {
    res.render("main", {
      layout: "index",
      room1Page: true,
    });
  })

  app.get("/map", (req, res) => {
    res.render("main", {
      layout: "index",
      mapPage: true,
    });
  })

  app.get("*", (req, res) => {
    res.render("main");
  })

  app.use(express.static("public")); 

  const s = app.listen(PORT, () => {
  console.log(`server at: http://localhost:${PORT}`);
})

const io = new Server(s);

io.on("connection", (socket) => {
    console.log("new user");

    socket.on("disconnect", () => {
        console.log("user disconnect");
    })
})

