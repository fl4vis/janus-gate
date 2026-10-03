## Visa Tracker API

```bash
curl -X POST localhost:4040/visa \
  -H "Content-Type: application/json" \
  -d '{ "name":"Ana", "lastname":"Lopez", "application_id": "01M3E", "ip":"10.0.64.3"}'
```
<br>

## Development

```bash
# dev
go run . -dev
npm run dev

# prod
npm run build
go run .

# compiled
npm run build
go build -o visa .
./visa

```

<br>

## Fill the DB

```bash
node web/faker.js
```

