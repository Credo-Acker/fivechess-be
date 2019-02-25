const Koa = require('koa');
const app = new Koa();
const server = require('http').Server(app);
// const server = require('https').Server(app);
const io = require('socket.io')(server);

let players = {
    black: null,
    white: null
};
let audience = [];

// 双方是否确认开赛
let confirmBlack = false;
let confirmWhite = false;

// 控制哪方落子
let goBlack = false;
let goWhite = false;

// 双方是否重新开始游戏
let againBlack = false;
let againWhite = false;

// 记录棋盘上位置的棋子
let chess = [];
for (let i = 0; i < 21; i++) {
    chess[i] = [];
    for (let j = 0; j < 21; j++) {
        chess[i][j] = 0;
    }
}

io.on('connection', socket => {
    // 检查黑方是否存在
    if (players.black == null) {
        players.black = socket.id;
        console.log("黑方进入");
        // 黑方现在存在，白方还不存在的情况
        if (players.white == null) {
            socket.emit('blackWait', {
                msg: '你好，你现在是黑方。请等待白方进入游戏……',
                role: 'black'
            });
            console.log("等待白方……");
        // 黑方现在存在，白方存在的情况
        } else {
            socket.emit('black', {
                msg: '你好，你现在是黑方。请确认开始游戏！',
                role: 'black'
            });
            io.emit('waitConfirm', { msg: '等待双方确认……' });
            console.log("双方都在，等待双方确认……");
        }
    // 检查白方是否存在
    } else if (players.white == null) {
        players.white = socket.id;
        console.log("白方进入");
        // 白方现在存在，黑方还不存在的情况
        if (players.black == null) {
            socket.emit('whiteWait', {
                msg: '你好，你现在是白方。请等待黑方进入游戏……',
                role: 'white'
            });
            console.log("等待黑方……");
        // 白方现在存在，黑方存在的情况
        } else {
            socket.emit('white', {
                msg: '你好，你现在是白方。请确认开始游戏！',
                role: 'white'
            });
            io.emit('waitConfirm', { msg: '双方等待确认……' });
            console.log("双方都在，等待双方确认……");
        }
    // 黑白双方都存在了，观众入场
    } else {
        audience.push(socket.id);
        let message = "";

        if (confirmBlack && confirmWhite) {
            message = "游戏正在进行……"
        } else if (!confirmBlack && confirmWhite) {
            message = "白方已确认进入游戏，黑方未确认";
        } else if (confirmBlack && !confirmWhite) {
            message = "黑方已确认进入游戏，白方未确认";
        }
        socket.emit('audience', {
            msg: `你好，你现在是观众，${message}`,
            role: 'audience',
            chessBoard: chess
        });
        io.emit('audienceEnter', {
            msg: '一观众入场！热烈欢迎！',
            count: audience.length
        })
        console.log(`观众入场……目前观众人数 ${audience.length} 人`);
    }

    // 黑方确认开始游戏
    socket.on('blackConfirm', data => {
        console.log(data);
        confirmBlack = true;
        // 如果双方都确认了开始游戏
        if (confirmWhite) {
            io.emit('startGame', {
                msg: '游戏正式开始'
            });
            goBlack = true;
            console.log("游戏开始，黑方轨迹解锁");
        } else {
            io.emit('oneConfirm', {
                msg: '黑方已确认，等待白方确认……'
            });
        }
    });

    // 白方确认开始游戏
    socket.on('whiteConfirm', data => {
        console.log(data);
        confirmWhite = true;
        // 如果双方都确认了开始游戏
        if (confirmBlack) {
            io.emit('startGame', {
                msg: '游戏正式开始'
            });
            goBlack = true;
            console.log("游戏开始，黑方轨迹解锁");
        } else {
            io.emit('oneConfirm', {
                msg: '白方已确认，等待黑方确认……'
            });
        }
    });

    // 黑方下棋
    socket.on('blackStep', data => {
        if (goBlack) {
            let i = data.step[0];
            let j = data.step[1];
            if (chess[i][j] == 0) {
                chess[i][j] = 1;
                let flag = isWin1(i, j, true);
                if (flag == 'black') {
                    io.emit('win', {
                        i: i,
                        j: j,
                        win: 'black'
                    });
                    goBlack = false;
                    goWhite = false;
                    confirmBlack = false;
                    confirmWhite = false;
                } else {
                    socket.emit('blackGo', {
                        i: i,
                        j: j
                    });
                    io.emit('oneGo', {
                        i: i,
                        j: j,
                        bw: true
                    });
                    goBlack = false;
                    goWhite = true;

                }
            }
        }
    });

    // 白方下棋
    socket.on('whiteStep', data => {
        if (goWhite) {
            let i = data.step[0];
            let j = data.step[1];
            if (chess[i][j] == 0) {
                chess[i][j] = 2;
                let flag = isWin1(i, j, false);
                if (flag == 'white') {
                    io.emit('win', {
                        i: i,
                        j: j,
                        win: 'white'
                    });
                    goBlack = false;
                    goWhite = false;
                    confirmBlack = false;
                    confirmWhite = false;
                } else {
                    socket.emit('whiteGo', {
                        i: i,
                        j: j
                    });
                    io.emit('oneGo', {
                        i: i,
                        j: j,
                        bw: false
                    });
                    goBlack = true;
                    goWhite = false;
                }
            }
        }
    });

    socket.on('again', data => {
        confirmBlack = false;
        confirmWhite = false;
        goBlack = false;
        goWhite = false;
        for (let i = 0; i < 21; i++) {
            chess[i] = [];
            for (let j = 0; j < 21; j++) {
                chess[i][j] = 0;
            }
        }

        if (players.black == socket.id) {
            socket.emit('againBlack', {
                msg: '黑方打算重新开始游戏，请双方确认进入游戏。'
            });
            againBlack = true;
        } else if (players.white == socket.id) {
            socket.emit('againWhite', {
                msg: '白方打算重新开始游戏，请双方确认进入游戏。'
            });
            againWhite = true;
        }

        // 如果双方都确认重新开始游戏
        if (againBlack && againWhite) {
            io.emit('againGame', {
                msg: '黑白双方都决定重新开始游戏，观众请等待'
            });
        }
    });

    // 有人离开
    socket.on('disconnect', reason => {
        // 判断是否是黑方
        if (socket.id == players.black) {
            players.black = null;
            for (let i = 0; i < 21; i++) {
                chess[i] = [];
                for (let j = 0; j < 21; j++) {
                    chess[i][j] = 0;
                }
            }
            confirmBlack = false;
            confirmWhite = false;
            io.emit('black disconnected', {
                msg: '黑方离开，请等待黑方进入游戏'
            });
            console.log("black disconnect");
        // 判断是否是白方
        } else if (socket.id == players.white) {
            players.white = null;
            for (let i = 0; i < 21; i++) {
                chess[i] = [];
                for (let j = 0; j < 21; j++) {
                    chess[i][j] = 0;
                }
            }
            confirmBlack = false;
            confirmWhite = false;
            io.emit('white disconnected', {
                msg: '白方离开，请等待白方进入游戏'
            });
            console.log("white disconnect");
        // 判断是否是观众
        } else {
            audience.splice(audience.findIndex(() => {
                return audience.includes(socket.id);
            }), 1);
            io.emit('audience disconnected', {
                msg: '有观众离开'
            });
            console.log("audience disconnect");
        }
        console.log(reason);
    });
});

server.listen(8001, () => {
    console.log("listen : 8001");
});

//判断输赢的函数（人人对战）
function isWin1(x, y, bw) {
    let count1 = 0,   //左右
        count2 = 0,   //上下
        count3 = 0,   //斜线
        count4 = 0;   //反斜线
    if (bw) {   //黑胜
        //左右赢法
        for (let i = x + 1; i < 21; i++) {
            if (chess[i][y] !==  1) {
                break;
            }
            count1++;
        }
        for (let i = x; i >= 0; i--) {
            if (chess[i][y] !==  1) {
                break;
            }
            count1++;
        }
        //上下赢法
        for (let i = y + 1; i < 21; i++) {
            if (chess[x][i] !==  1) {
                break;
            }
            count2++;
        }
        for (let i = y; i >= 0; i--) {
            if (chess[x][i] !==  1) {
                break;
            }
            count2++;
        }
        //斜线赢法（左下右上）
        for (let i = x + 1, j = y - 1; i < 21 && j >= 0; i++, j--) {
            if (chess[i][j] !== 1) {
                break;
            }
            count3++;
        }
        for (let i = x, j = y; i >= 0 && j < 21; i--, j++) {
            if (chess[i][j] !== 1) {
                break;
            }
            count3++;
        }
        //反斜线赢法（左上右下)
        for (let i = x + 1, j = y + 1; i < 21 && j < 21; i++, j++) {
            if (chess[i][j] !== 1) {
                break;
            }
            count4++;
        }
        for (let i = x, j = y; i >= 0 && j >= 0; i--, j--) {
            if (chess[i][j] !== 1) {
                break;
            }
            count4++;
        }
        if (count1 == 5 || count2 == 5 || count3 == 5 || count4 == 5) {
            console.log("黑方胜");
            return "black";
        } else {
            return "no";
        }
    } else {    //白胜
        //左右赢法
        for (let i = x + 1; i < 21; i++) {
            if (chess[i][y] !==  2) {
                break;
            }
            count1++;
        }
        for (let i = x; i >= 0; i--) {
            if (chess[i][y] !==  2) {
                break;
            }
            count1++;
        }
        //上下赢法
        for (let i = y + 1; i < 21; i++) {
            if (chess[x][i] !==  2) {
                break;
            }
            count2++;
        }
        for (let i = y; i >= 0; i--) {
            if (chess[x][i] !==  2) {
                break;
            }
            count2++;
        }
        //斜线赢法（左下右上）
        for (let i = x + 1, j = y - 1; i < 21 && j >= 0; i++, j--) {
            if (chess[i][j] !== 2) {
                break;
            }
            count3++;
        }
        for (let i = x, j = y; i >= 0 && j < 21; i--, j++) {
            if (chess[i][j] !== 2) {
                break;
            }
            count3++;
        }
        //反斜线赢法（左上右下)
        for (let i = x + 1, j = y + 1; i < 21 && j < 21; i++, j++) {
            if (chess[i][j] !== 2) {
                break;
            }
            count4++;
        }
        for (let i = x, j = y; i >= 0 && j >= 0; i--, j--) {
            if (chess[i][j] !== 2) {
                break;
            }
            count4++;
        }
        if (count1 == 5 || count2 == 5 || count3 == 5 || count4 == 5) {
            console.log("白方胜");
            return "white";
        } else {
            return "no";
        }
    }
}
