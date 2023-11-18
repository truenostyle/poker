import express from 'express';
import { engine } from 'express-handlebars';
import { resolve } from 'path';

import { Server } from "socket.io";
import mysql from 'mysql2/promise';
import fs from 'fs';

const connection = mysql.createPool({
  host: 'localhost',
  user: 'Trueno', // Ваш пользователь MySQL
  password: 'Jigsaw9901', // Ваш пароль MySQL
  multipleStatements: true, // Разрешаем множественные SQL-запросы
  connectionLimit: 10, 
});
// DATABASE
async function initializeDatabase() {
  try {
    // Чтение содержимого SQL-файла
    const initSQL = fs.readFileSync('init.sql', 'utf8');

    // Создание подключения к MySQL
   

    // Выполнение инициализации базы данных
    await connection.query(initSQL);
    
    console.log('База данных и таблицы успешно созданы и заполнены данными.');

    // Закрываем соединение после инициализации
    await connection.end();
  } catch (err) {
    console.error('Ошибка при инициализации базы данных:', err.message);
  }
}

// Вызов функции инициализации
initializeDatabase();


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

async function isNicknameExists(nickname) {
  let connect;
  try {
    connect = await connection.getConnection();
    const [rows] = await connect.execute('SELECT * FROM users WHERE nickname = ?', [nickname]);
    return true; // возвращаем true, если никнейм существует
  } catch (err) {
    console.error('Ошибка при проверке существования ника:', err.message);
    return false;
  } finally {
    if (connect) {
      connect.release(); // освобождаем соединение обратно в пул
    }
  }
}



const io = new Server(s);
io.on("connection", (socket) => {

  // Обработчик события для установки никнейма
  socket.on("setNickname", async (nickname) => {
    console.log(`User ${socket.id} set nickname: ${nickname}`);

    // Проверяем, существует ли никнейм
    const isExists = await isNicknameExists(nickname);

    if (isExists) {
      
      console.log(`${nickname} уже существует`);
    } else {
      // Записываем никнейм в базу данных
      try {
        await connection.execute('INSERT INTO users (nickname, chips) VALUES (?, ?)', [nickname, 1000]);
        socket.emit("nicknameSetConfirmation", { success: true, message: `Никнейм "${nickname}" успешно установлен.` });
        console.log(`${nickname} подключен и записан в базу данных`);
      } catch (err) {
        console.error('Ошибка при записи ника в базу данных:', err.message);
        socket.emit("nicknameSetConfirmation", { success: false, message: `Произошла ошибка при записи ника в базу данных.` });
      }
    }
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

