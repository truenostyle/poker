import "/socket.io/socket.io.js";

const socket = io();

socket.on("connect", () => {
    console.log("connect");

    // socket.emit("channel", ...data); инфа конкретному челу
    // io.emit("channel", ...data); инфа всем на серве
    // socket.broadcast.emit("channel", ...data); инфа всем кроме одного чела

})

socket.on("disconnect", (reason) => {})