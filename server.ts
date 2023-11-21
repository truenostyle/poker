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

const players: { nick: string; chips: number; hand: { suit: string; rank: string }[]; socketId: string; actionDone: boolean }[] = [];

const suits = ['♥', '♦', '♣', '♠'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'В', 'Д', 'К', 'Т'];
let move: number;
let totalBank: number;
let tableCards: any;

// soket io
const io = new Server(s);
io.on("connection", (socket) => {
  socket.on('getChips', async (nickname) => {
    try {
      // Ваш код для запроса к базе данных и получения количества фишек по никнейму
      const chips = await getChipsFromDatabase(nickname);
      console.log("фишки" + chips);
      // Отправляем количество фишек обратно клиенту
      socket.emit('chipsUpdate', chips);
    } catch (error) {
      console.error('Ошибка при получении фишек из базы данных:', error.message);
    }
  });
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

  socket.on('joinGame', async (nickname) => {
    if (players.length < 2) {
        const chips = await getChipsFromDatabase(nickname);
        const socketId = socket.id; 
        players.push({ nick: nickname, chips: chips, hand: [], socketId: socketId, actionDone: false });
        socket.emit('waitingForPlayer');
        if (players.length === 2) {
            console.log("Game starting...");
            startGame();
        }
    } else {
        socket.emit('gameFull');
    }
});

socket.on("stopGame", () => {
  players.splice(0, players.length);
});

socket.on("loadGame", () => {
  if (players.length >= 1) {
      io.emit('loadData', players);
  } else {
      socket.emit('PlayersIsNull');
  }
});

socket.on('playerAction', ({ action, amount }) => {
  console.log("ACTION MOVE " + move);
  const currentPlayer = players.find(player => player.socketId === socket.id);
  const socketId = socket.id; 
  if (action === 'fold') {
      // Обработка действия "Fold"
      
      endRound("fold", socketId);
  }
  if (action === 'call'){
     console.log("call");

    currentPlayer!.chips -= amount;
    totalBank += amount;
    console.log(totalBank);
    console.log(currentPlayer!.chips);
   io.emit('updatePlayers', players);
    currentPlayer!.actionDone = true;
    
    if(move === 3){
      if (checkAllPlayersActions()) {
        endRound("call", socketId );
        move += 1;
        AllPlayersActionFalse()
    }
    }
    if(move === 2) {
      if (checkAllPlayersActions()) {
        io.emit('showRiver');
        move += 1;
        console.log("move 2 after emit: " + move );
        AllPlayersActionFalse()
    }
    }
    if(move === 1) {
      if (checkAllPlayersActions()) {
        io.emit('showTurn');
        move += 1;
        AllPlayersActionFalse()
    }
    }
   
    if(move === 0) {
      if (checkAllPlayersActions()) {
        io.emit('showFlop');
        move += 1;
        AllPlayersActionFalse()
    }
    }
  

  }
  if (action === 'check'){
    console.log("check. Move " + move);
    currentPlayer!.actionDone = true;
    if (checkAllPlayersActions()) {
      if(move === 3){
        if (checkAllPlayersActions()) {
          endRound("check", socketId );
          move += 1;
          AllPlayersActionFalse()
      }
      }
      if(move === 2) {
        if (checkAllPlayersActions()) {

          io.emit('showRiver');
          move += 1;
          AllPlayersActionFalse()
      }
      }
      if(move === 1) {
        if (checkAllPlayersActions()) {
          io.emit('showTurn');
          move += 1;
          AllPlayersActionFalse()
      }
      }
    }
  }
  socket.emit("playerActionDone");
  socket.broadcast.emit("playerActionNotDone");
});

socket.on('getPlayerDataRequest', () => {

  io.emit('playerDataResponse', players, totalBank);
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

function getRandomPlayer() {
  const randomIndex = Math.floor(Math.random() * players.length);
  console.log("randomIndex: " + randomIndex);
  return players[randomIndex];
}

// Отправка сообщения конкретному случайному игроку


function startGame() {
  move = 0;
  totalBank = 0;
  const randomPlayer = getRandomPlayer();
  io.to(randomPlayer.socketId).emit('yourTurn', true);
  io.emit('startGame', players);
  const deck = shuffleDeck(createDeck());
  // Раздаем карты игрокам
  dealCards(players, deck);
  // Раздаем карты на стол
  tableCards = dealTableCards(deck, 5);

  // Отправляем данные о картах игроков и на столе
  for (const player of players) {
      const playerCards = { hand: player.hand, tableCards };
      io.to(player.socketId).emit('dealCards', playerCards);
  }
  // Добавьте логику раздачи карт и другие детали игры
}


function createDeck(): { suit: string; rank: string }[] {
  const deck: { suit: string; rank: string }[] = [];
  for (const suit of suits) {
      for (const rank of ranks) {
          deck.push({ suit, rank });
      }
  }
  return deck;
}

// Функция для перемешивания колоды
function shuffleDeck(deck) {
  return deck.sort(() => Math.random() - 0.5);
}

// Раздача карт игрокам
function dealCards(players, deck) {
  for (const player of players) {
      player.hand = [];
      for (let i = 0; i < 2; i++) {
          player.hand.push(deck.pop());
      }
  }
}

// Раздача карт на стол
// Обновленная версия функции dealTableCards
function dealTableCards(deck: { suit: string; rank: string }[], numCards: number) {
  const tableCards: { suit: string; rank: string }[] = [];
  for (let i = 0; i < numCards; i++) {
      const card = deck.pop();
      if (card) {
          tableCards.push(card);
      }
  }
  return tableCards;
}

function endRound(action, socketIdWhoFolded) {
  let winner;
  let loser;
  if (action === 'fold') {
    // Определите победителя как другого игрока
    winner = players.find(player => player.socketId !== socketIdWhoFolded);
    winner.chips += totalBank;
  }
  if(action === 'call' || action === 'check')
  {
    winner = determineWinner();
  }
  if(winner === "Ничья"){
    console.log('Ничья');
    io.emit('endRound', "Ничья");
  }
  else {
    console.log('Winner:' + winner.nick);
    
    io.emit('endRound', "winner - " + winner.nick);
    updateChipsInDatabase();
  }



  startGame();
}

async function updateChipsInDatabase() {
  for(let i = 0; i <= players.length; i++){
    await connection.execute("UPDATE users SET chips = ? WHERE nickname = ?", [players[i].chips, players[i].nick]);
    console.log(players[i].nick + " обновлён успешно");
  }
   
}

function checkAllPlayersActions() {
  const allActionsDone = players.every(player => player.actionDone);

  console.log("check all players actions: " + allActionsDone);
  return allActionsDone;
}

function AllPlayersActionFalse() {
  console.log("обнуление ActionDone");
  for (const player of players) {
    player.actionDone = false;
  }
}

//Комбинации  
function evaluateHand(hand) {

  console.log("Рука перед оценкой:", hand);

// Сортировка руки по рангу
hand.sort((a, b) => ranks.indexOf(a.rank) - ranks.indexOf(b.rank));

// Подготовка данных для анализа
const handSuits = hand.map(card => card.suit);
const handRanks = hand.map(card => card.rank);
const rankCounts = {};
handRanks.forEach(rank => rankCounts[rank] = (rankCounts[rank] || 0) + 1);

// Проверка на флеш
const isFlush = handSuits.every((suit, _, arr) => suit === arr[0]);

// Проверка на стрит
let  isStraight = handRanks.every((rank, index, arr) => index === 0 || ranks.indexOf(rank) === ranks.indexOf(arr[index - 1]) + 1);
if (handRanks.length >= 5) {
  // Сортируем ранги в порядке возрастания
  const sortedRanks = handRanks.sort((a, b) => ranks.indexOf(a) - ranks.indexOf(b));

  // Проверяем последовательность рангов
  for (let i = 0; i < sortedRanks.length - 4; i++) {
      const startRankIndex = ranks.indexOf(sortedRanks[i]);
      isStraight = sortedRanks.slice(i, i + 5).every((rank, index) => ranks.indexOf(rank) === startRankIndex + index);

      if (isStraight) break;
  }

  // Особый случай для стрита с тузом в качестве "1"
  if (!isStraight && sortedRanks.includes('Т')) {
      isStraight = ['2', '3', '4', '5', 'Т'].every(rank => sortedRanks.includes(rank));
  }
}

// Проверка на другие комбинации
const hasPair = Object.values(rankCounts).includes(2);
const hasTwoPairs = Object.values(rankCounts).filter(count => count === 2).length === 2;
const hasThreeOfAKind = Object.values(rankCounts).includes(3);
const hasFourOfAKind = Object.values(rankCounts).includes(4);
const hasFullHouse = hasThreeOfAKind && hasPair;

// Оценка руки
let score = 0;
if (isFlush && isStraight) {
  score = 8; // Стрит-флеш
} else if (hasFourOfAKind) {
  score = 7; // Каре
} else if (hasFullHouse) {
  score = 6; // Фулл хаус
} else if (isFlush) {
  score = 5; // Флеш
} else if (isStraight) {
  score = 4; // Стрит
} else if (hasThreeOfAKind) {
  score = 3; // Тройка
} else if (hasTwoPairs) {
  score = 2; // Две пары
} else if (hasPair) {
  score = 1; // Пара
}

return score;
}

function determineWinner() {

// Соединяем карты игрока и карты на столе, передаем в функцию оценки
const playerHandValue = evaluateHand([...players[0].hand, ...tableCards]);
const botHandValue = evaluateHand([...players[1].hand, ...tableCards]);

// Логика определения победителя
if (playerHandValue > botHandValue) {
  console.log("Игрок выиграл!");
  players[0].chips += totalBank;
  return players[0];
} else if (botHandValue > playerHandValue) {
  console.log("Бот выиграл!");
  players[1].chips += totalBank;
  return players[1];
} else {
  console.log("Ничья!");
  const potSplit = totalBank / 2;
  players[0].chips += potSplit;
  players[1].chips += potSplit;
  return "Ничья";
}

}


async function getChipsFromDatabase(nickname) {
  // Ваш код для выполнения запроса к базе данных
  // Например, использование mysql2
  const [rows] = await connection.execute("SELECT chips FROM users WHERE nickname = '" + nickname +"'");
  
  // Предполагается, что у вас есть столбец 'chips' в таблице 'users'
  // Вернем значение фишек
  return rows.length > 0 ? rows[0].chips : 0;
}

async function isNicknameExists(nickname) {
  try {
    const [rows] = await connection.execute('SELECT * FROM users WHERE nickname = ?', [nickname]);
    return rows.length > 0;
  } catch (err) {
    console.error('Ошибка при проверке существования ника:', err.message);
    return false;
  }
}