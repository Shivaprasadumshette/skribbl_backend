const express = require("express");
var http = require("http");
const app = express();
const port = process.env.PORT || 3000;
var server =http.createServer(app);
const mongoose = require("mongoose");
const Room= require('./models/Room');
const getWord = require('./api/getWord');

//middleware
app.use(express.json());
var io = require("socket.io")(server);
//connect to database
const DB = 'mongodb+srv://umshetteshivaprasad:oe2B5XFAf7ZVjMU9@cluster0.cjuvzqb.mongodb.net/?retryWrites=true&w=majority';
mongoose.connect(DB).then(()=>{
    console.log('Connection Successfull!')
}).catch((e)=>{
    console.log(e);
});

app.get('/',(req,res)=>{
res.send('Api is running');
})

io.on('connection', socket =>{
    console.log('connected!');
    //create Game CallBack
    socket.on('create-game', async({nickname, name, occupancy, maxRounds})=>{
        try{

                const existRoom = await Room.findOne({name});
                if(existRoom)
                {
                    socket.emit('not Correct Game','Room with that name already exists');
                }
                let room = new Room();
                const word = getWord();
                room.name=name,
                room.word=word,
                room.occupancy=occupancy,
                room.maxRounds=maxRounds;
                let player = {
                    socketID: socket.id,
                    nickname,
                    isPartyLeader: true,
                }


                 room.players.push(player);
                 room = await room.save();
                 console.log(room);
                 socket.join(name);
                 io.to(name).emit('updateRoom',room);
        }
        catch(err){
                console.log(err);
        }

    });
//        JOIN ROOM CALLBACK
    socket.on('join-game', async({nickname, name})=>{

    try{
        let room =await Room.findOne({name});
        if(!room){

            socket.emit('notCorrectGame', 'Please enter a valid room name');
            return;
        }
        if(room.isJoin){

            let player = {

                socketID: socket.id,
                nickname,
            }
            console.log('edhar tak toh chal raha hai');
            console.log(room.players.length);
            room.players.push(player);
            console.log(room.players.length);
            socket.join(name);

            if(room.players.length===room.occupancy){
                room.isJoin=false;
            }
            room.turn= room.players[room.turnIndex];
            room = await room.save();
            io.to(name).emit('updateRoom', room);
        }
        else{
         socket.emit('notCorrectGame', 'The game is full now,Please try later!');
        }

    }catch(err){
        console.log(err);
    }
    }
    );

    socket.on('msg', async (data) => {
            console.log(data);
            try{
                if(data.msg === data.word) {
                    let room = await Room.find({name: data.roomName});
                    let userPlayer = room[0].players.filter(
                        (player) => player.nickname === data.username
                    )
                    if(data.timeTaken !== 0) {
                        userPlayer[0].points += Math.round((200/ data.timeTaken) * 10);
                    }
                    room = await room[0].save();
                    io.to(data.roomName).emit('msg', {
                        username: data.username,
                        msg: 'Guessed it!',
                        guessedUserCtr: data.guessedUserCtr + 1,
                    })
                    socket.emit('closeInput', "");
                } else {
                    io.to(data.roomName).emit('msg', {
                        username: data.username,
                        msg: data.msg,
                        guessedUserCtr: data.guessedUserCtr,
                    })
                }
            } catch(err) {
                console.log(err.toString());
            }
        })


        socket.on('change-turn', async(name) => {
            try {
                let room = await Room.findOne({name});
                let idx = room.turnIndex;
                if(idx +1 === room.players.length) {
                    room.currentRound+=1;
                }
                if(room.currentRound <= 10) {
                    const word = getWord();
                    room.word = word;
                    room.turnIndex = (idx+1) % room.players.length;
                    room.turn = room.players[room.turnIndex];
                    room = await room.save();
                    io.to(name).emit('change-turn', room);
                } else {
                    io.to(name).emit("show-leaderboard", room.players);
                }
            } catch(err) {
                console.log(err);
            }
        })
         socket.on('updateScore', async (name) => {
             try {
                  const room = await Room.findOne({name});
                  io.to(name).emit('updateScore', room);
             } catch(err) {
                  console.log(err);
             }
         })
    // White board sockets
        socket.on('paint', ({details, roomName}) => {
            io.to(roomName).emit('points', {details: details});
        })
//        color socket
        socket.on('color-change',({color,roomName}) => {
            io.to(roomName).emit('color-change',color);
        })


//        stroke Socket
        socket.on('stroke-width',({value,roomName}) => {
            io.to(roomName).emit('stroke-width' , value);
        })
//          clear screen
        socket.on('clean-screen',({value,roomName})=>{
            io.to(roomName).emit('clear-screen',value);
        })

            socket.on('disconnect', async() => {
                try {
                    let room = await Room.findOne({"players.socketID": socket.id});
                    for(let i=0; i< room.players.length; i++) {
                        if(room.players[i].socketID === socket.id) {
                            room.players.splice(i, 1);
                            break;
                        }
                    }
                    room = await room.save();
                    if(room.players.length === 1) {
                        socket.broadcast.to(room.name).emit('show-leaderboard', room.players);
                    } else {
                        socket.broadcast.to(room.name).emit('user-disconnected', room);
                    }
                } catch(err) {
                    console.log(err);
                }
            })

})

server.listen(port, "0.0.0.0", ()=>{
    console.log('Server started and running on port '+ port);
})