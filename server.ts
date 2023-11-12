import express from "express";
import { Server } from "socket.io";
const PORT = 4444;

const app = express();

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

