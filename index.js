const express = require('express')
const app = express()
const port = 3000

const Redis = require("ioredis");
const fs = require("fs");

const bodyParser = require('body-parser');
app.use(bodyParser.json());

const redisPort = Number(process.env.REDIS_PORT);
const hosts = process.env.REDIS_HOSTS.split(',');

const cluster = new Redis.Cluster([
    ...(hosts.map(
        (host) => ({
            host, port: redisPort
        })
    )),
], {
    redisOptions: {
        password: "1234567890", tls: {
            ca: [fs.readFileSync(`${__dirname}/.redis/YandexInternalRootCA.crt`, 'utf-8')],
            checkServerIdentity: () => {
                return null;
            }
        }
    }
});

app.post('/meta', (req, res) => {
    const key = Math.random().toString(36);

    cluster.set(key, JSON.stringify(req.body), 'EX', 5);

    res.send(`{ "key": "${key}"  }`);
})

app.get('/render/:id', async (req, res) => {
    const answer = await cluster.get(req.params.id);

    cluster.del(req.params.id);

    res.send(JSON.stringify(answer));
})

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <script>
                    let key;
                
                    async function setData(e) {
                        e.preventDefault();
                        
                        const data = await fetch('/meta', {
                            method: 'POST',
                            body: JSON.stringify({ "some-field": (new FormData(e.target)).get('some-field') }),
                            headers: {
                                'content-type': 'application/json',
                            }
                        });
                        
                        const result = await data.json();
                        
                        key = result.key;
                    }
                    
                    async function getData() {
                        const data = await fetch(\`/render/\${key}\`);
                        
                        const result = await data.text();
                        
                        alert(result);
                    }
                    
                    window.addEventListener('DOMContentLoaded', () => {
                        document.getElementById('form').addEventListener('submit', setData)
                        document.getElementById('button').addEventListener('click', getData)
                    })
                </script>  
            </head>
            <body>
                <form id="form">
                    <input name="some-field">
                    <button type="submit">
                        Send data
                    </button>
                </form>
                
                <button id="button">
                    Get data
                </button>
            </body>
        </html>
    `);
})

console.log('Connect to cluster');

cluster.on('connect', () => {
    console.log('Redis cluster connect');
})

cluster.on('reconnecting', () => {
    console.log('Redis cluster reconnecting');
})

cluster.on('error', (e) => {
    console.log(e);
})

cluster.on('ready', () => {
    console.log('Redis cluster ready');

    app.listen(port, () => {
        console.log(`Example app listening on port ${port}`)
    })

    cluster.disconnect();
});