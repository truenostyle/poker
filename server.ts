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
      mainPage: false
    });
  })

  app.get("*", (req, res) => {
    res.render("main");
  })

  app.use(express.static("public")); 
  app.use(express.static("photo"));


  const s = app.listen(PORT, () => {
  console.log(`server at: http://localhost:${PORT}`);
})

const io = new Server(s);
io.on("connection", (socket) => {

  // Обработчик события для установки никнейма
  socket.on("setNickname", (nickname) => {
      console.log(`User ${socket.id} set nickname: ${nickname}`);

      socket.emit("nicknameSetConfirmation", { success: true, message: `Никнейм "${nickname}" успешно установлен.` });

      console.log(nickname + " connected");
  });
  
  // Обработчик события для отправки сообщения
  socket.on("sendMessage", (data) => {
      const { message, nickname } = data;
      io.emit("receiveMessage", { message, nickname });
  });

  socket.on("disconnect", () => {
      console.log(`User ${socket.id} disconnected`);
  });
});

