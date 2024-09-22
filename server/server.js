const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

// Lưu trữ tên của các client đã kết nối
const clients = new Map();

wss.on('connection', (ws) => {
    console.log('A new client connected!');

    // Lắng nghe tin nhắn từ client
    ws.on('message', (data) => {
        const message = JSON.parse(data);
        console.log('Received from client:', message);

        // #1: Nhận tên từ client
        if (message.type === 'setName') {
            const nameExists = Array.from(clients.values()).includes(message.name);

            if (nameExists) {
                // #1.1. Gửi thông báo lỗi nếu tên đã tồn tại
                ws.send(JSON.stringify({ type: 'error', message: 'Username already exists. Please choose a different name.' }));
            } else {
                // #1.2. Gửi thông báo thành công
                ws.send(JSON.stringify({ type: 'success' }));
                clients.set(ws, message.name);
                const welcomeMessage = ` has joined the chat!`;

                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        // #2: Gửi message tới tất cả các client
                        client.send(JSON.stringify({ type: 'serverMessage', name: message.name, message: welcomeMessage }));
                    }
                });
            }
        }

        // #3: Nhận nội dung tin nhắn của client
        if (message.type === 'chat') {
            const senderName = clients.get(ws);
            const chatMessage = `${message.text}`;
            // Lưu nội dung tin nhắn vào CSDL...

            // #4: Gửi tin nhắn tới tất cả các client khác
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'chat', sender: senderName, message: chatMessage }));
                }
            });
        }
    });

    // Xử lý khi client ngắt kết nối
    ws.on('close', () => {
        const name = clients.get(ws);

        if (name) {
            // #5. Gửi thông báo cho các client khác về việc người dùng rời phòng
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'serverMessage', message: `${name} has left the chat.` }));
                }
            });
            console.log(`${name} disconnected`);
            clients.delete(ws);
        }
    });
});

console.log('WebSocket server is running on ws://localhost:8080');
